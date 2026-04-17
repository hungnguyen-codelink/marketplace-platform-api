export interface ShippingAddress {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}
export interface OrderItem {
    product_id: string;
    quantity: number;
    unit_price: string;
}
export interface OrderResponse {
    id: string;
    buyer_id: string;
    status: string;
    shipping_address: ShippingAddress;
    total_amount: string;
    transaction_id?: string;
    items: OrderItem[];
    created_at: string;
    updated_at: string;
}
export interface CheckoutPayload {
    shipping_address: ShippingAddress;
}
export interface GetOrdersParams {
    page?: number;
    limit?: number;
    status?: string;
}
export interface PaginatedOrderResponse {
    data: OrderResponse[];
    total: number;
    page: number;
    limit: number;
}
export declare class OrdersService {
    checkout(buyerId: string, payload: CheckoutPayload): Promise<OrderResponse>;
    getOrder(buyerId: string, orderId: string): Promise<OrderResponse>;
    getOrders(buyerId: string, params: GetOrdersParams): Promise<PaginatedOrderResponse>;
    getSellerOrders(sellerId: string, params: GetOrdersParams): Promise<PaginatedOrderResponse>;
    getSellerOrder(sellerId: string, orderId: string): Promise<OrderResponse>;
    updateSellerOrderStatus(sellerId: string, orderId: string, newStatus: string): Promise<OrderResponse>;
    private processMockPayment;
}
export declare const ordersService: OrdersService;
