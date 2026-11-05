import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";

/**
 * Reusable middleware that validates an incoming request against a Zod schema
 */
export const validate =
    (schema: ZodType) =>
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                // Parse request parts: body, query, and params
                const parsed: any = await schema.parseAsync({
                    body: req.body,
                    query: req.query,
                    params: req.params,
                });

                // Replace req.body with sanitized & parsed data
                if (parsed.body !== undefined) {
                    req.body = parsed.body;
                }
                if (parsed.params !== undefined) {
                    req.params = parsed.params;
                }
                // In Express, req.query is getter-only, so mutate safely only if present
                if (parsed.query !== undefined) {
                    Object.assign(req.query, parsed.query);
                }

                return next();
            } catch (error) {
                if (error instanceof ZodError) {
                    // Format Zod issues into a friendly, structured client error
                    const formattedErrors = error.issues.map((err) => ({
                        field: err.path.slice(1).join("."), // removes the "body" prefix
                        message: err.message,
                    }));

                    return res.status(400).json({
                        success: false,
                        error: {
                            message: "Validation Failed",
                            details: formattedErrors,
                        },
                    });
                }

                return next(error);
            }
        };