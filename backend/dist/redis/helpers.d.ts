export declare const redisGet: (key: string) => Promise<string | null>;
export declare const redisSet: (key: string, value: string, ttlSeconds?: number) => Promise<void>;
export declare const redisDel: (key: string) => Promise<void>;
