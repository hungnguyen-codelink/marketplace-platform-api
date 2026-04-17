import { ReviewsController } from '../../../../src/modules/reviews/controller';
import { reviewsService } from '../../../../src/modules/reviews/service';
import { ForbiddenError, ConflictError, NotFoundError, ValidationError } from '../../../../src/errors';

jest.mock('../../../../src/modules/reviews/service');

describe('ReviewsController - Unit Tests', () => {
  let controller: ReviewsController;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new ReviewsController();

    mockRequest = {
      user: { id: 'buyer-123' },
      body: { order_item_id: 'order-item-456', rating: 5, text: 'Great product!' },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('submitReview()', () => {
    it('should return 201 with review on success', async () => {
      const review = {
        id: 'review-123',
        order_item_id: 'order-item-456',
        buyer_id: 'buyer-123',
        product_id: 'product-789',
        rating: 5,
        text: 'Great product!',
        created_at: '2025-04-17T12:00:00Z',
      };

      (reviewsService.submitReview as jest.Mock).mockResolvedValueOnce(review);

      await controller.submitReview(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(review);
      expect(reviewsService.submitReview).toHaveBeenCalledWith(
        'buyer-123',
        'order-item-456',
        5,
        'Great product!'
      );
    });

    it('should extract order_item_id from request body', async () => {
      const review = {
        id: 'review-123',
        order_item_id: 'order-item-456',
        buyer_id: 'buyer-123',
        product_id: 'product-789',
        rating: 5,
        text: 'Great product!',
        created_at: '2025-04-17T12:00:00Z',
      };

      (reviewsService.submitReview as jest.Mock).mockResolvedValueOnce(review);
      mockRequest.body.order_item_id = 'specific-order-item-id';

      await controller.submitReview(mockRequest, mockResponse);

      expect(reviewsService.submitReview).toHaveBeenCalledWith(
        'buyer-123',
        'specific-order-item-id',
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should return 403 when order is not completed (AC-04)', async () => {
      const error = new ForbiddenError('Order must be completed to leave a review');
      (reviewsService.submitReview as jest.Mock).mockRejectedValueOnce(error);

      await expect(controller.submitReview(mockRequest, mockResponse)).rejects.toThrow(
        ForbiddenError
      );
    });

    it('should return 409 on duplicate review (REV-05)', async () => {
      const error = new ConflictError('Review already exists for this order item');
      (reviewsService.submitReview as jest.Mock).mockRejectedValueOnce(error);

      await expect(controller.submitReview(mockRequest, mockResponse)).rejects.toThrow(
        ConflictError
      );
    });

    it('should return 404 when order_item not found', async () => {
      const error = new NotFoundError('Order item not found');
      (reviewsService.submitReview as jest.Mock).mockRejectedValueOnce(error);

      await expect(controller.submitReview(mockRequest, mockResponse)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should pass request.user.id as buyerId', async () => {
      const review = {
        id: 'review-123',
        order_item_id: 'order-item-456',
        buyer_id: 'buyer-123',
        product_id: 'product-789',
        rating: 3,
        text: 'Okay',
        created_at: '2025-04-17T12:00:00Z',
      };

      (reviewsService.submitReview as jest.Mock).mockResolvedValueOnce(review);
      mockRequest.user.id = 'specific-buyer-id';

      await controller.submitReview(mockRequest, mockResponse);

      expect(reviewsService.submitReview).toHaveBeenCalledWith(
        'specific-buyer-id',
        expect.any(String),
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should allow optional text parameter', async () => {
      mockRequest.body = { order_item_id: 'order-item-456', rating: 4 };

      const review = {
        id: 'review-123',
        order_item_id: 'order-item-456',
        buyer_id: 'buyer-123',
        product_id: 'product-789',
        rating: 4,
        text: null,
        created_at: '2025-04-17T12:00:00Z',
      };

      (reviewsService.submitReview as jest.Mock).mockResolvedValueOnce(review);

      await controller.submitReview(mockRequest, mockResponse);

      expect(reviewsService.submitReview).toHaveBeenCalledWith(
        'buyer-123',
        'order-item-456',
        4,
        undefined
      );
    });
  });
});
