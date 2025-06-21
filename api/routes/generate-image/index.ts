import {
  GenerateContentResponse,
  GenerateImagesResponse,
  GoogleGenAI,
  Modality
} from '@google/genai';
import { Request, RequestHandler, Response, Router } from 'express';
import { ai } from '../../ai/constants.js';
import { handleProxyError } from '../../errors/proxy-error.js';
import { genAiLimiter } from '../../middlewares/rate-limiter.js';
import {
  GEMINI_IMAGE_MODEL_NAME,
  IMAGEN_MODEL_NAME,
  USE_IMAGEN
} from '../../constants.js';

export const router = Router();

interface ImageResponse {
  image: string;
}

async function generateImageWithImagegen(ai: GoogleGenAI, prompt: string) {
  const result: GenerateImagesResponse = await ai.models.generateImages({
    model: IMAGEN_MODEL_NAME,
    prompt: prompt,
    config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }
  });

  if (
    !result.generatedImages ||
    !(result.generatedImages.length > 0) ||
    !result?.generatedImages?.[0]?.image?.imageBytes
  ) {
    console.warn(
      'No image generated or image data is missing (via proxy) for prompt:',
      prompt,
      'Result:',
      result
    );

    return '';
  }
  const base64ImageBytes = result.generatedImages[0].image.imageBytes;
  return `data:image/jpeg;base64,${base64ImageBytes}`;
}

async function generateImageWithGemini(ai: GoogleGenAI, prompt: string) {
  const content =
    'Please generate an image. Your response must include an image based on the following description:\n ' +
    prompt;
  const response = await ai.models.generateContent({
    model: GEMINI_IMAGE_MODEL_NAME,
    contents: content,
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE]
    }
  });

  if (
    !response.candidates ||
    !response.candidates.length ||
    !response?.candidates?.[0]?.content?.parts
  ) {
    return '';
  }

  let textResponse = '';
  let imageBase64ImageBytes = '';
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData && part.inlineData.data) {
      imageBase64ImageBytes = part.inlineData.data;
    } else if (part.text) {
      textResponse = part.text;
    }
  }

  if (!imageBase64ImageBytes && textResponse) {
    console.log(
      'No image! Text response from %s: %s',
      GEMINI_IMAGE_MODEL_NAME,
      textResponse
    );
  }

  if (!imageBase64ImageBytes) {
    return '';
  }
  return imageBase64ImageBytes;
}

router.post('/', genAiLimiter, (async (req: Request, res: Response) => {
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
          "Proxy: Missing 'model' or 'prompt' in request body for generate-images"
      });
    }

    let result: ImageResponse = {
      image: ''
    };
    if (USE_IMAGEN) {
      result.image = await generateImageWithImagegen(ai, prompt);
    } else {
      result.image = await generateImageWithGemini(ai, prompt);
    }
    res.json(result);
  } catch (error) {
    handleProxyError(res, error, 'generate-images');
  }
}) as RequestHandler);
