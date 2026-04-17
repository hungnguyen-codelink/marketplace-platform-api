import { ImportProductsPayload } from './schemas';
interface ImportResult {
    importedIds: number[];
    count: number;
}
declare class FakestoreService {
    /**
     * Fetch all products from FakeStore API with field mapping
     */
    getProducts(): Promise<any[]>;
    /**
     * Get categories with Redis → DB → FakeStore API fallback chain
     */
    getCategories(): Promise<string[]>;
    /**
     * Import FakeStore products into seller's shop with upsert logic
     */
    importProducts(sellerId: string, payload: ImportProductsPayload): Promise<ImportResult>;
    /**
     * Map FakeStore product to internal product format with defaults
     */
    private mapFakestoreProduct;
}
export declare const fakestoreService: FakestoreService;
export {};
