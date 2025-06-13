import express from 'express';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI, GenerateImagesResponse, Modality } from '@google/genai'; // Added for image gen functions
import { JsonParseError } from '../../types.js'; // Adjusted path for JsonParseError

// AI Model Names and Configuration
export const GENAI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17'; // From geminiService.ts
export const IMAGEN_MODEL_NAME = 'imagen-3.0-generate-002'; // From aiProxyApi.ts
export const GEMINI_IMAGE_MODEL_NAME = 'gemini-2.0-flash-preview-image-generation'; // From aiProxyApi.ts
const USE_IMAGEN_ENV_VAR = process.env.USE_IMAGEN?.toLowerCase();
export const USE_IMAGEN = // From aiProxyApi.ts
  USE_IMAGEN_ENV_VAR === 'true' ||
  USE_IMAGEN_ENV_VAR === 'enabled' ||
  USE_IMAGEN_ENV_VAR === 'yes' ||
  USE_IMAGEN_ENV_VAR === '1';


// Error handler for proxy API routes (and now adventure API routes)
export const handleProxyError = ( // Renaming or making a more generic one could be an option later
  res: express.Response,
  error: unknown,
  context: string
): void => {
  console.error(`Error in API/${context}:`, error); // Generalized context
  let statusCode = 500;
  let clientMessage = `An internal server error occurred while handling ${context}.`;

  if (typeof error === 'object' && error !== null) {
    const err = error as Partial<{ message: string; status?: number; error?: string }>;

    if (typeof err.message === 'string') {
      if (
        err.message.includes('API key not valid') ||
        (err.status === 400 && err.message.toLowerCase().includes('api key'))
      ) {
        statusCode = 500;
        clientMessage =
          'API Key configuration error on the server. Please contact support.';
        console.error("Proxy server's API Key is invalid or missing.");
      } else if (err.message.includes('JsonParseError')) { // Specific check for JsonParseError
        statusCode = 500; // Or 400 if it's a client-induced bad format from AI
        clientMessage = `Failed to parse JSON response from AI for ${context}. ${err.message}`;
      }
      else if (
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
  } else if (typeof error === 'string') {
    clientMessage = error;
  }


  res.status(statusCode).json({
    error: clientMessage,
    details: error && typeof error === 'object' && error.toString ? error.toString() : 'Unknown error details'
  });
};

// Error handler for prompt API routes (remains specific for prompt fetching issues)
export const handlePromptEndpointError = (
  res: express.Response,
  error: unknown,
  endpointName: string
): void => {
  console.error(`Error in /api/prompts/${endpointName}:`, error);
  let statusCode = 500;
  let clientMessage = `An internal server error occurred while generating the prompt for ${endpointName}.`;

  if (error instanceof Error) {
    clientMessage = error.message;
  } else if (typeof error === 'string') {
    clientMessage = error;
  }
  res.status(statusCode).json({ error: clientMessage });
};

// Rate limiter for AI-related endpoints
export const genAiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute for this specific endpoint
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
      const potentialArrayJson = jsonStr.substring(
        firstBracket,
        lastBracket + 1
      );
      if (
        potentialJson.length === 0 ||
        potentialArrayJson.length > potentialJson.length ||
        (firstBracket < firstBrace &&
          lastBracket > lastBrace &&
          firstBrace !== -1) ||
        firstBrace === -1
      ) {
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
    console.error('Original text received (trimmed):', text);
    console.error('String attempted for JSON.parse:', jsonStr);
    console.error('Parser error:', e.message);

    let detailedError = `Failed to parse JSON from response. The AI or proxy may not have strictly adhered to the JSON format.`;
    if (isFixAttempt) {
      detailedError = `AI failed to correct the JSON format. ${detailedError}`;
    }
    if (jsonStr.length < 250) {
      detailedError += ` Attempted content: "${jsonStr}"`;
    } else {
      detailedError += ` Attempted content snippet (start and end): "${jsonStr.substring(0, 120)}...${jsonStr.substring(jsonStr.length - 120)}"`;
    }
    if (e.message) {
      detailedError += ` | Parser error: ${e.message}`;
    }
    // Use the custom JsonParseError type
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

  if (
    !result.generatedImages ||
    !(result.generatedImages.length > 0) ||
    !result?.generatedImages?.[0]?.image?.imageBytes
  ) {
    console.warn(
      'No image generated or image data is missing (via proxy ImageN) for prompt:',
      prompt,
      'Result:',
      result
    );
    return '';
  }
  const base64ImageBytes = result.generatedImages[0].image.imageBytes;
  return `data:image/jpeg;base64,${base64ImageBytes}`;
}

export async function generateImageWithGemini(ai: GoogleGenAI, prompt: string) {
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
  if (imageBase64ImageBytes && !imageBase64ImageBytes.startsWith('data:')) {
      return `data:image/jpeg;base64,${imageBase64ImageBytes}`;
  }
  return imageBase64ImageBytes;
}
