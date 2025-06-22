import { GenerateContentResponse } from '@google/genai';
import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router
} from 'express';
import { ai } from '../../ai/constants.js';
import { handleProxyError } from '../../errors/proxy-error.js';
import { genAiLimiter } from '../../middlewares/rate-limiter.js';

export const router = Router();
router.post('/', genAiLimiter, (async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!ai) {
    return res.status(503).json({
      error: "Proxy's AI Service is not available (API Key issue)."
    });
  }
  try {
    const { model, contents, config } = req.body;
    if (!model || !contents) {
      return res.status(400).json({
        error:
          "Proxy: Missing 'model' or 'contents' in request body for generate-content"
      });
    }

    const requestPayload = { model, contents, config };
    const result: GenerateContentResponse =
      await ai.models.generateContent(requestPayload);

    res.json({ text: result.text });
  } catch (error) {
    next(handleProxyError(error, 'generate-content'));
  }
}) as RequestHandler);
