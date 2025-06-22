import { GoogleGenAI } from '@google/genai';
import compression from 'compression';
import express, { RequestHandler } from 'express';
import helmet from 'helmet';
import fs from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ViteDevServer } from 'vite';
import {
  apiErrorHandler,
  routeErrorHandler
} from './api/middlewares/error-middlewares.js';
import {
  genAiLimiter,
  generalLimiter
} from './api/middlewares/rate-limiter.js';
import { router as apiRouter } from './api/routes/index.js';

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
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow scripts from self and Tailwind CDN
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], // Allow styles from self, inline, and Tailwind CDN
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

// attach api routes
app.use('/api', genAiLimiter, apiRouter);

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

// Initialize route error handler
app.use(routeErrorHandler);

// Initialize api error handler
app.use(apiErrorHandler);

function printRoutes(stack: any[], indent = '') {
  stack.forEach((layer: any) => {
    if (layer.route) {
      // This layer is a route
      const route = layer.route;
      const methods = Object.keys(route.methods)
        .filter((method) => route.methods[method])
        .map((method) => method.toUpperCase())
        .join(', ');
      console.log(`${indent}Path: ${route.path}, Methods: ${methods}`);
    } else if (layer.name === 'router' && layer.handle.stack) {
      // This layer is an Express router
      const routerPath = layer.regexp?.source;
      // .replace(/\\\//g, '/')
      // .replace(
      //   /^\/\^|(?:\)\/\(\?:\/\(\?\!\)\)\/\?\)\)\/\?\$|\/\?\)\)\/\?$/g,
      //   ''
      // )
      // .replace(/\(\?:\/\(\?\!\)\)|\/\?\$|^\/\^/g, '');

      console.log(`${indent}Router mounted at: ${routerPath || '/'}`); // Display the path where the router is mounted
      printRoutes(layer.handle.stack, indent + '  '); // Recursively call for the router's stack
    } else if (layer.handle.stack && layer.path) {
      // This handles cases where a router might be mounted without a specific name 'router',
      // but still has a stack and a path (e.g., middleware chains that might contain routes)
      console.log(`${indent}Middleware/Router mounted at: ${layer.path}`);
      printRoutes(layer.handle.stack, indent + '  ');
    }
  });
}

// Start http server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);

  // Call the function to print routes
  // printRoutes(app.router.stack);
});
