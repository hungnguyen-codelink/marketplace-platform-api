import { ReviewsService } from '../../../../src/modules/reviews/service';
import { db } from '../../../../src/db/client';
import { ForbiddenError, ConflictError, NotFoundError } from '../../../../src/errors';

jest.mock('../../../../src/db/client');

describe('ReviewsService - Unit Tests', () => {
  let service: ReviewsService;
  let mockClient: any;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ReviewsService();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (db.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('submitReview()', () => {
    const buyerId = 'buyer-123';
    const orderItemId = 'order-item-456';
    const productId = 'product-789';
    const orderId = 'order-100';

    it('should throw NotFoundError if order_item not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // SELECT order_item

      await expect(
        service.submitReview(buyerId, orderItemId, 5, 'Great product!')
      ).rejects.toThrow(NotFoundError);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw ForbiddenError if buyer does not own the order', async () => {
      const otherBuyer = 'other-buyer-999';
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: orderItemId,
              product_id: productId,
              order_id: orderId,
              buyer_id: otherBuyer,
              status: 'completed',
            },
          ],
        }); // SELECT order_item

      await expect(
        service.submitReview(buyerId, orderItemId, 5, 'Great product!')
      ).rejects.toThrow(ForbiddenError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw ForbiddenError if order status is not completed (AC-04)', async () => {
      const statuses = ['pending', 'confirmed', 'shipped', 'delivered'];

      for (const status of statuses) {
        jest.clearAllMocks();
        mockClient.query
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce({
            rows: [
              {
                id: orderItemId,
                product_id: productId,
                order_id: orderId,
                buyer_id: buyerId,
                status,
              },
            ],
          }); // SELECT order_item

        await expect(
          service.submitReview(buyerId, orderItemId, 5, 'Great product!')
        ).rejects.toThrow(
          'Order must be completed to leave a review'
        );
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      }
    });

    it('should throw ConflictError on unique constraint violation (REV-05)', async () => {
      const constraintError = new Error('duplicate key value violates unique constraint');
      (constraintError as any).code = '23505';

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: orderItemId,
              product_id: productId,
              order_id: orderId,
              buyer_id: buyerId,
              status: 'completed',
            },
          ],
        }) // SELECT order_item
        .mockRejectedValueOnce(constraintError); // INSERT review fails

      await expect(
        service.submitReview(buyerId, orderItemId, 5, 'Great product!')
      ).rejects.toThrow(ConflictError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should successfully submit review and update product aggregate_rating (AC-10)', async () => {
      const createdAt = '2025-04-17T12:00:00Z';
      const newReview = {
        id: 'review-123',
        order_item_id: orderItemId,
        buyer_id: buyerId,
        product_id: productId,
        rating: 5,
        text: 'Great product!',
        created_at: createdAt,
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: orderItemId,
              product_id: productId,
              order_id: orderId,
              buyer_id: buyerId,
              status: 'completed',
            },
          ],
        }) // SELECT order_item
        .mockResolvedValueOnce({ rows: [newReview] }) // INSERT review RETURNING
        .mockResolvedValueOnce({ rows: [{ aggregate_rating: '5.00', review_count: 1 }] }) // UPDATE products
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await service.submitReview(buyerId, orderItemId, 5, 'Great product!');

      expect(result).toEqual(newReview);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should allow optional text field', async () => {
      const newReview = {
        id: 'review-123',
        order_item_id: orderItemId,
        buyer_id: buyerId,
        product_id: productId,
        rating: 4,
        text: null,
        created_at: '2025-04-17T12:00:00Z',
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: orderItemId,
              product_id: productId,
              order_id: orderId,
              buyer_id: buyerId,
              status: 'completed',
            },
          ],
        }) // SELECT order_item
        .mockResolvedValueOnce({ rows: [newReview] }) // INSERT review RETURNING
        .mockResolvedValueOnce({ rows: [{ aggregate_rating: '4.00', review_count: 1 }] }) // UPDATE products
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await service.submitReview(buyerId, orderItemId, 4);

      expect(result.text).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should calculate correct aggregate_rating for multiple reviews (AC-10)', async () => {
      // Mock: 2 reviews already exist (ratings 4, 5), now adding 3
      // Expected: (4 + 5 + 3) / 3 = 4.00
      const newReview = {
        id: 'review-123',
        order_item_id: orderItemId,
        buyer_id: buyerId,
        product_id: productId,
        rating: 3,
        text: 'Average',
        created_at: '2025-04-17T12:00:00Z',
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: orderItemId,
              product_id: productId,
              order_id: orderId,
              buyer_id: buyerId,
              status: 'completed',
            },
          ],
        }) // SELECT order_item
        .mockResolvedValueOnce({ rows: [newReview] }) // INSERT review RETURNING
        .mockResolvedValueOnce({
          rows: [{ aggregate_rating: '4.00', review_count: 3 }],
        }) // UPDATE products with correct AVG
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await service.submitReview(buyerId, orderItemId, 3, 'Average');

      expect(result.rating).toBe(3);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error during UPDATE products', async () => {
      const dbError = new Error('Database error');

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: orderItemId,
              product_id: productId,
              order_id: orderId,
              buyer_id: buyerId,
              status: 'completed',
            },
          ],
        }) // SELECT order_item
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'review-123',
              order_item_id: orderItemId,
              buyer_id: buyerId,
              product_id: productId,
              rating: 5,
              text: 'Great',
              created_at: '2025-04-17T12:00:00Z',
            },
          ],
        }) // INSERT review RETURNING
        .mockRejectedValueOnce(dbError); // UPDATE products fails

      await expect(
        service.submitReview(buyerId, orderItemId, 5, 'Great')
      ).rejects.toThrow(dbError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
