import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodObject, ZodError, ZodIssueCode } from 'zod/v4';

export interface ValidatedRequest<TBody> extends Request {
  body: TBody;
}

// Define the shape of the schema object that our middleware expects
interface Schemas {
  body?: ZodObject;
}

export function validate(schemas: Schemas): RequestHandler {
  return (async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        console.log(
          '[DEBUG] Validating body %s of %s',
          JSON.stringify(req.body),
          req.path
        );
        req.body = await schemas.body.parseAsync(req.body);
        console.log('[DEBUG] Validation complete for  %s', req.path);

        next();
      }
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: e.issues.map((err) => {
            const errorDetails: { [key: string]: any } = {
              path: err.path.join('.'),
              message: err.message,
              code: err.code
            };

            // Conditionally add 'expected' for 'invalid_type' issues
            if (err.code === 'invalid_type') {
              errorDetails.expected = err.expected; // These properties exist on ZodInvalidTypeIssue
            }
            return errorDetails;
          })
        });
      }

      next(e);
    }
  }) as RequestHandler;
}
