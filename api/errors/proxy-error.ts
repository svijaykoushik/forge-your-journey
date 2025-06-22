import { ErrorResponse, ExceptionDetails } from './error-response.js';

interface ErrorWithMessage {
  message: string;
  status?: number;
}

interface ProxyResponseError {
  error?: string;
  details?: any;
}

export const handleProxyError = (
  error: unknown,
  context: string
): ErrorResponse => {
  console.error(`Error in proxy/${context}:`, error);
  let statusCode = 500;
  let clientMessage = `An internal server error occurred in the proxy while handling ${context}.`;

  if (typeof error === 'object' && error !== null) {
    const err = error as Partial<ErrorWithMessage & ProxyResponseError>;

    if (typeof err.message === 'string') {
      if (
        err.message.includes('API key not valid') ||
        (err.status === 400 && err.message.toLowerCase().includes('api key'))
      ) {
        statusCode = 500;
        clientMessage =
          'API Key configuration error on the server. Please contact support.';
        console.error("Proxy server's API Key is invalid or missing.");
      } else if (
        err.message.includes('quota') ||
        err.message.includes('RESOURCE_EXHAUSTED') ||
        err.status === 429
      ) {
        statusCode = 429;
        clientMessage = `API quota likely exceeded for ${context}. ${err.message}`;
      } else {
        clientMessage = err.message;
        if (err.status && typeof err.status === 'number') {
          statusCode = err.status;
        }
      }
    } else if (typeof err.error === 'string') {
      clientMessage = err.error;
    }
  }

  return new ErrorResponse(
    statusCode,
    new ExceptionDetails(
      clientMessage,
      error ? error.toString() : 'Unknown error object'
    )
  );
};
