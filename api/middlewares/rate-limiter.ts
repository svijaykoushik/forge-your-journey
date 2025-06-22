import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  statusCode: 429, // 429 Too Many Requests
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

export const genAiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute for this specific endpoint
  message: 'Too many requests for this resource. Please wait a moment.',
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false
});
