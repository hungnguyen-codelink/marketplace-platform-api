declare class FakestoreClient {
    private baseUrl;
    private timeoutMs;
    private retryAttempts;
    private retryBackoffMs;
    constructor();
    fetch(path: string): Promise<any>;
    private sleep;
}
export declare const fakestoreClient: FakestoreClient;
export {};
