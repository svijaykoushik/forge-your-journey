import fs from 'node:fs/promises';
import express, { Request, RequestHandler, Response } from 'express';
import { ViteDevServer } from 'vite';
import compression from 'compression';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GenerateContentResponse,
  GenerateImagesResponse,
  GoogleGenAI,
  Modality
} from '@google/genai';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5173;
const base = process.env.BASE || '/';
const API_KEY: string | undefined = process.env.API_KEY;
const IMAGEN_MODEL_NAME = 'imagen-3.0-generate-002';
const GEMINI_IMAGE_MODEL_NAME = 'gemini-2.0-flash-preview-image-generation';
const USE_IMAGEN_ENV_VAR = process.env.USE_IMAGEN?.toLowerCase();
const USE_IMAGEN =
  USE_IMAGEN_ENV_VAR === 'true' ||
  USE_IMAGEN_ENV_VAR === 'enabled' ||
  USE_IMAGEN_ENV_VAR === 'yes' ||
  USE_IMAGEN_ENV_VAR === '1';

// Cached production assets
const templateHtml = isProduction
  ? await fs.readFile('./dist/client/index.html', 'utf-8')
  : '';

if (!API_KEY) {
  console.error(
    'FATAL ERROR: API_KEY environment variable is not set for the proxy server.'
  );
}

let ai: GoogleGenAI | undefined;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

// Create http server
const app = express();

// Add Vite or respective production middlewares
let vite: ViteDevServer | undefined;
if (!isProduction) {
  const { createServer } = await import('vite');
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base
  });
  app.use(vite.middlewares);
} else {
  // const compression = (await import('compression')).default as RequestHandler
  app.use(compression() as unknown as RequestHandler);
  const sirv = (await import('sirv')).default;
  app.use(base, sirv('./dist/client', { extensions: [] }));
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], // Default for everything else
        scriptSrc: ["'self'", 'https://cdn.tailwindcss.com', "'unsafe-inline'"], // Allow scripts from self and Tailwind CDN
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.tailwindcss.com',
          'https://fonts.googleapis.com'
        ], // Allow styles from self, inline, and Tailwind CDN
        imgSrc: ["'self'", 'data:'], // Allow images from self and data URIs
        connectSrc: ["'self'"], // For API calls etc.
        fontSrc: ["'self'", 'https://fonts.gstatic.com'] // For Google Fonts etc.
        // mediaSrc: ["'self'"],
        // objectSrc: ["'none'"], // Disallow <object>, <embed> tags
        // frameSrc: ["'none'"], // Disallow iframes unless explicitly needed
      }
    }
    // Other Helmet options you might want to set:
    // crossOriginEmbedderPolicy: false, // If you need to embed cross-origin content
    // crossOriginResourcePolicy: { policy: "cross-origin" }, // If serving cross-origin resources
  })
);
app.use(express.json({ limit: '10mb' }));

interface GenerateContentPayload {
  model: string;
  contents: any;
  config?: any;
}

interface GenerateImagesPayload {
  model: string;
  prompt: string;
  config?: { numberOfImages?: number; outputMimeType?: string };
}

interface ImageResponse {
  image: string;
}

interface ErrorWithMessage {
  message: string;
  status?: number;
}

interface ProxyResponseError {
  error?: string;
  details?: any;
}

const handleProxyError = (
  res: express.Response,
  error: unknown,
  context: string
): void => {
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

  res.status(statusCode).json({
    error: clientMessage,
    details: error ? error.toString() : 'Unknown error object'
  });
};

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  statusCode: 429, // 429 Too Many Requests
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

const genAiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute for this specific endpoint
  message: 'Too many requests for this resource. Please wait a moment.',
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false
});

app.post('/api/generate-content', genAiLimiter, (async (
  req: Request,
  res: Response
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
    handleProxyError(res, error, 'generate-content');
  }
}) as RequestHandler);

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
  console.log('Prompt for image: ', prompt);
  const content =
    'Please generate an image. Your response must include an image based on the following description:\n ' +
    prompt;
  console.log('Prompt content: ', content);
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

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData && part.inlineData.data) {
      const base64ImageBytes = part.inlineData.data;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else if (part.text) {
      console.warn('No  image, got text: ', part.text);
      return '';
    }
  }

  return '';
}

app.post('/api/generate-images', genAiLimiter, (async (
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

// Serve HTML
app.use('*all', generalLimiter, async (req, res) => {
  try {
    const url = req.originalUrl.replace(base, '');

    let template: string;
    /** @type {import('./src/entry-server.ts').render} */
    let render: (url: string) => Promise<{
      html: string;
      head?: string;
    }>;
    if (!isProduction) {
      // Always read fresh template in development
      template = await fs.readFile('./index.html', 'utf-8');
      template = await vite!.transformIndexHtml(url, template);
      render = (await vite!.ssrLoadModule('/entry-server.tsx')).render;
    } else {
      template = templateHtml;
      render = (await import(resolve(__dirname, './server/entry-server.js')))
        .render;
    }

    const rendered = await render(url);

    const html = template
      .replace(`<!--app-head-->`, rendered.head ?? '')
      .replace(`<!--app-html-->`, rendered.html ?? '');

    res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
  } catch (e) {
    vite?.ssrFixStacktrace(e as any);
    console.log((e as any)?.stack);
    res.status(500).end((e as any)?.stack);
  }
});

// Start http server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
