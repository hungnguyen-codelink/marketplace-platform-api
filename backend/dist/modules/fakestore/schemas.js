"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importProductsSchema = void 0;
const zod_1 = require("zod");
exports.importProductsSchema = zod_1.z.object({
    ids: zod_1.z
        .array(zod_1.z.number().int(), {
        errorMap: () => ({ message: 'ids must be an array of integers' }),
    })
        .min(1, { message: 'ids must not be empty' }),
    overwrite: zod_1.z.boolean().optional().default(false),
});
