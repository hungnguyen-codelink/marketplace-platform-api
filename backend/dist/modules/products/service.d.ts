export interface CreateProductPayload {
    title: string;
    description?: string;
    price: number;
    image_url?: string;
    category?: string;
    stock: number;
}
export interface UpdateProductPayload {
    title?: string;
    description?: string;
    price?: number;
    image_url?: string;
    category?: string;
    stock?: number;
}
export interface ProductResponse {
    id: string;
    shop_id: string;
    title: string;
    description: string | null;
    price: number;
    image_url: string | null;
    category: string | null;
    stock: number;
    aggregate_rating: number;
    review_count: number;
    created_at: string;
    updated_at: string;
}
export interface GetProductsParams {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
}
export declare class ProductsService {
    createProduct(sellerId: string, payload: CreateProductPayload): Promise<ProductResponse>;
    getProducts(params: GetProductsParams): Promise<ProductResponse[]>;
    getProductById(productId: string): Promise<ProductResponse>;
    updateProduct(sellerId: string, productId: string, payload: UpdateProductPayload): Promise<ProductResponse>;
    deleteProduct(sellerId: string, productId: string): Promise<void>;
}
export declare const productsService: ProductsService;
