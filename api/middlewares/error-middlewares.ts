import { NextFunction, Request, Response } from 'express';
import { ErrorResponse } from '../errors/error-response.js';
import { SuccessResponse } from '../success-response.js';

export function routeErrorHandler(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  if (!request.route) {
    response.status(404).send({
      error: `Cannot ${request.method} ${request.path}`
    });
  }
  next();
}

export function apiErrorHandler(
  error: ErrorResponse,
  request: Request,
  response: Response,
  next: NextFunction
): void {
  console.error(error);
  const data: Record<string, any> = {};
  for (const [key, val] of Object.entries(error.details)) {
    data[key] = val;
  }
  response
    .status(error.httpCode)
    .send(new SuccessResponse(error.httpCode, data, error.message));
}
