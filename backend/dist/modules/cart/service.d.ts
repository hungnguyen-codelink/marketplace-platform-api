export interface CartItem {
    product_id: string;
    quantity: number;
    title: string;
    price: number;
}
export interface CartResponse {
    items: CartItem[];
    total: number;
}
export declare class CartService {
    getCart(userId: string): Promise<CartResponse>;
    addItem(userId: string, productId: string, quantity: number): Promise<CartResponse>;
    updateItem(userId: string, productId: string, quantity: number): Promise<CartResponse>;
    removeItem(userId: string, productId: string): Promise<CartResponse>;
    clearCart(userId: string): Promise<CartResponse>;
}
export declare const cartService: CartService;
