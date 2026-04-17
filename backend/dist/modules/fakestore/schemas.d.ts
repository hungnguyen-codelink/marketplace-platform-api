import { z } from 'zod';
export declare const importProductsSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodNumber, "many">;
    overwrite: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    ids: number[];
    overwrite: boolean;
}, {
    ids: number[];
    overwrite?: boolean | undefined;
}>;
export type ImportProductsPayload = z.infer<typeof importProductsSchema>;
