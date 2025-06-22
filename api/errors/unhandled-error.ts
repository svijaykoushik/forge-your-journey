import { ErrorResponse, ExceptionDetails } from './error-response.js';

export class UnhandledError extends ErrorResponse {
  public constructor(error: Error) {
    console.error({
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    super(
      500,
      new ExceptionDetails(
        'unhandled_error',
        'An Undhandled Error occured',
        undefined,
        { message: error.message || 'Something broke' }
      )
    );
  }
}
