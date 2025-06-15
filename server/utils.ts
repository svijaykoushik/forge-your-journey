import express from 'express'; // For Response type in handleProxyError
import rateLimit from 'express-rate-limit';
import { GoogleGenAI, GenerateImagesResponse, Modality } from '@google/genai';
import { JsonParseError } from '../types.js'; // Corrected path

// AI Model Names and Configuration
export const GENAI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';
export const IMAGEN_MODEL_NAME = 'imagen-3.0-generate-002';
export const GEMINI_IMAGE_MODEL_NAME = 'gemini-2.0-flash-preview-image-generation';
const USE_IMAGEN_ENV_VAR = process.env.USE_IMAGEN?.toLowerCase();
export const USE_IMAGEN =
  USE_IMAGEN_ENV_VAR === 'true' ||
  USE_IMAGEN_ENV_VAR === 'enabled' ||
  USE_IMAGEN_ENV_VAR === 'yes' ||
  USE_IMAGEN_ENV_VAR === '1';

export const PROXY_REQUEST_TIMEOUT = 30000; // From services/geminiService.ts originally


// Error handler for API routes
export const handleProxyError = (
  res: express.Response,
  error: unknown,
  context: string
): void => {
  console.error(`Error in API/${context}:`, error);
  let statusCode = 500;
  let clientMessage = `An internal server error occurred while handling ${context}.`;

  if (error instanceof JsonParseError) { // Specific check for JsonParseError
    clientMessage = error.message; // Use message from JsonParseError
    // statusCode could remain 500 or be set to 400 if it's a client input issue leading to parsing failure downstream
  } else if (typeof error === 'object' && error !== null) {
    const err = error as Partial<{ message: string; status?: number; error?: string; name?: string }>;

    // Check for specific error names or messages if applicable
    if (err.name === 'ImageGenerationQuotaError') { // Assuming ImageGenerationQuotaError might be thrown
        statusCode = 429; // Too Many Requests
        clientMessage = err.message || 'Image generation quota likely exceeded.';
    } else if (typeof err.message === 'string') {
      if (
        err.message.includes('API key not valid') ||
        (err.status === 400 && err.message.toLowerCase().includes('api key'))
      ) {
        statusCode = 500; // Or a more specific auth-related error code if preferred
        clientMessage = 'API Key configuration error on the server. Please contact support.';
        console.error("Server's AI API Key is invalid or missing.");
      } else if (
        err.message.includes('quota') ||
        err.message.includes('RESOURCE_EXHAUSTED') ||
        err.status === 429
      ) {
        statusCode = 429;
        clientMessage = `API quota likely exceeded for ${context}. ${err.message}`;
      } else {
        clientMessage = err.message;
        if (err.status && typeof err.status === 'number' && err.status >= 400 && err.status < 600) {
          statusCode = err.status;
        }
      }
    } else if (typeof err.error === 'string') { // Fallback for other error shapes
      clientMessage = err.error;
    }
  } else if (typeof error === 'string') { // If a string was thrown
    clientMessage = error;
  }

  res.status(statusCode).json({
    error: clientMessage,
    details: error && typeof error === 'object' && error.toString ? error.toString() : 'Unknown error details'
  });
};

// Rate limiter for AI-related endpoints
export const genAiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: 'Too many requests for this resource. Please wait a moment.',
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false
});

// --- Text Processing Utilities ---
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

export const parseJsonFromText = <T>(
  text: string,
  isFixAttempt: boolean = false
): T => {
  let jsonStr = text.trim();
  const fenceRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);

  if (match && match[1]) {
    jsonStr = match[1].trim();
  } else {
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    const firstBracket = jsonStr.indexOf('[');
    const lastBracket = jsonStr.lastIndexOf(']');
    let potentialJson = '';

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      potentialJson = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      const potentialArrayJson = jsonStr.substring(firstBracket, lastBracket + 1);
      if ( potentialJson.length === 0 || potentialArrayJson.length > potentialJson.length ||
           (firstBracket < firstBrace && lastBracket > lastBrace && firstBrace !== -1) || firstBrace === -1 ) {
        potentialJson = potentialArrayJson;
      }
    }
    if (potentialJson) {
      jsonStr = potentialJson;
    }
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch (e: any) {
    console.error('JSON PARSING ERROR DETAILS (from server/utils.ts):');
    console.error('Original text received (trimmed):', text.substring(0, 500)); // Log snippet
    console.error('String attempted for JSON.parse:', jsonStr.substring(0,500)); // Log snippet
    console.error('Parser error:', e.message);

    let detailedError = `Failed to parse JSON from response. The AI or proxy may not have strictly adhered to the JSON format.`;
    if (isFixAttempt) {
      detailedError = `AI failed to correct the JSON format. ${detailedError}`;
    }
     if (e.message) {
      detailedError += ` | Parser error: ${e.message}`;
    }
    throw new JsonParseError(detailedError, text);
  }
};

// --- Image Generation Utilities ---
export async function generateImageWithImagegen(ai: GoogleGenAI, prompt: string) {
  const result: GenerateImagesResponse = await ai.models.generateImages({
    model: IMAGEN_MODEL_NAME,
    prompt: prompt,
    config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }
  });

  if (!result.generatedImages || !(result.generatedImages.length > 0) || !result?.generatedImages?.[0]?.image?.imageBytes) {
    console.warn('No image generated or image data is missing (via ImageN) for prompt:', prompt.substring(0,100));
    return '';
  }
  const base64ImageBytes = result.generatedImages[0].image.imageBytes;
  return `data:image/jpeg;base64,${base64ImageBytes}`;
}

export async function generateImageWithGemini(ai: GoogleGenAI, prompt: string) {
  const content = 'Please generate an image. Your response must include an image based on the following description:\n ' + prompt;
  const response = await ai.models.generateContent({
    model: GEMINI_IMAGE_MODEL_NAME,
    contents: content,
    config: { responseModalities: [Modality.TEXT, Modality.IMAGE] }
  });

  if (!response.candidates || !response.candidates.length || !response?.candidates?.[0]?.content?.parts) {
     console.warn('No image candidates or parts found (via Gemini) for prompt:', prompt.substring(0,100));
    return '';
  }
  let imageBase64ImageBytes = '';
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData && part.inlineData.data) {
      imageBase64ImageBytes = part.inlineData.data;
      break;
    }
  }
  if (!imageBase64ImageBytes) {
    console.warn('No inline image data found (via Gemini) for prompt:', prompt.substring(0,100));
    return '';
  }
  if (imageBase64ImageBytes && !imageBase64ImageBytes.startsWith('data:')) {
      return `data:image/jpeg;base64,${imageBase64ImageBytes}`;
  }
  return imageBase64ImageBytes;
}
