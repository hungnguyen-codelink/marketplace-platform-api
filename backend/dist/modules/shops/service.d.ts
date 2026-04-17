export interface CreateShopPayload {
    name: string;
    description?: string;
    banner_url?: string;
    contact_email?: string;
}
export interface UpdateShopPayload {
    name?: string;
    description?: string;
    banner_url?: string;
    contact_email?: string;
}
export interface ShopResponse {
    id: string;
    name: string;
    description: string | null;
    banner_url: string | null;
    contact_email: string | null;
    created_at: string;
}
export interface ShopResponseWithSeller extends ShopResponse {
    seller_id: string;
}
export declare class ShopsService {
    createShop(sellerId: string, payload: CreateShopPayload): Promise<ShopResponseWithSeller>;
    getShopBySellerId(sellerId: string): Promise<ShopResponseWithSeller>;
    getShopById(shopId: string): Promise<ShopResponse>;
    updateShop(sellerId: string, shopId: string, payload: UpdateShopPayload): Promise<ShopResponseWithSeller>;
}
export declare const shopsService: ShopsService;
