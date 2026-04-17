import { z } from 'zod';

export const importProductsSchema = z.object({
  ids: z
    .array(z.number().int(), {
      errorMap: () => ({ message: 'ids must be an array of integers' }),
    })
    .min(1, { message: 'ids must not be empty' }),
  overwrite: z.boolean().optional().default(false),
});

export type ImportProductsPayload = z.infer<typeof importProductsSchema>;
