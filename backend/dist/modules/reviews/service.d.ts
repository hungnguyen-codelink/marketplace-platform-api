export interface ReviewResponse {
    id: string;
    order_item_id: string;
    buyer_id: string;
    product_id: string;
    rating: number;
    text: string | null;
    created_at: string;
}
export declare class ReviewsService {
    submitReview(buyerId: string, orderItemId: string, rating: number, text?: string): Promise<ReviewResponse>;
}
export declare const reviewsService: ReviewsService;
