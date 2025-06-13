import express, { Request, Response, RequestHandler } from 'express';
import {
  GoogleGenAI,
  GenerateContentResponse // GenerateImagesResponse and Modality are not directly used here anymore
} from '@google/genai';
import {
  genAiLimiter,
  handleProxyError,
  generateImageWithImagegen, // Imported from utils
  generateImageWithGemini,   // Imported from utils
  USE_IMAGEN,                // Imported from utils
  // GENAI_MODEL_NAME,       // Not directly used by this router's specific endpoints if adventureApi handles it
} from '../utils.js';

interface ImageResponse { // Kept for the /generate-images endpoint response structure
  image: string;
}

// Function to create and configure the router, accepting the AI instance
export default function createAiProxyRouter(ai: GoogleGenAI | undefined) {
  const router = express.Router();

  // This generic /generate-content endpoint remains as a direct proxy if needed.
  router.post('/generate-content', genAiLimiter, (async (
    req: Request,
    res: Response
  ) => {
    if (!ai) {
      return res.status(503).json({
        error: "Proxy's AI Service is not available (API Key issue)."
      });
    }
    try {
      // The 'model' here would be passed by the client, e.g. GENAI_MODEL_NAME from client-side constants
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
      handleProxyError(res, error, 'proxy/generate-content'); // Context updated
    }
  }) as RequestHandler);

  // This generic /generate-images endpoint remains and now uses utils.
  router.post('/generate-images', genAiLimiter, (async (
    req: Request,
    res: Response
  ) => {
    if (!ai) {
      return res.status(503).json({
        error: "Proxy's AI Service is not available (API Key issue)."
      });
    }
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({
          error:
            "Proxy: Missing 'prompt' in request body for generate-images"
        });
      }

      let resultUrl: string;
      if (USE_IMAGEN) {
        resultUrl = await generateImageWithImagegen(ai, prompt);
      } else {
        resultUrl = await generateImageWithGemini(ai, prompt);
      }

      const response: ImageResponse = { image: resultUrl };
      res.json(response);
    } catch (error) {
      handleProxyError(res, error, 'proxy/generate-images'); // Context updated
    }
  }) as RequestHandler);

  return router;
}
