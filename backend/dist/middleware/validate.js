"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
function validate(schema) {
    return (req, res, next) => {
        try {
            const validated = schema.parse(req.body);
            req.body = validated;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const fieldErrors = {};
                error.errors.forEach((err) => {
                    const field = err.path[0];
                    if (!fieldErrors[field]) {
                        fieldErrors[field] = [];
                    }
                    fieldErrors[field].push(err.message);
                });
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: fieldErrors,
                });
            }
            next(error);
        }
    };
}
