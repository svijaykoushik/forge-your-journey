import fs from 'node:fs/promises';
import express, { Request, RequestHandler, Response } from 'express';
import { ViteDevServer } from 'vite';
import compression from 'compression';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai'; // Simplified, other types moved to routers
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
// Import routers
// import promptsApiRouter from './server/routes/promptsApi.js'; // Removed
import createAiProxyRouter from './server/routes/aiProxyApi.js';
import createAdventureApiRouter from './server/routes/adventureApi.js';
// Types are no longer directly needed here for endpoint handlers
// import {
//   GameGenre,
//   Persona,
//   AdventureOutline,
//   WorldDetails,
//   StorySegment,
//   InventoryItem
// } from './types.js'; // .js extension for Node ESM

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5173;
const base = process.env.BASE || '/';
const API_KEY: string | undefined = process.env.API_KEY;
// Model name constants and USE_IMAGEN moved to aiProxyApi.ts

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

// Error handlers and genAiLimiter have been moved to server/utils.ts
// and are used internally by the routers.
// The generalLimiter is still needed for the catch-all SSR route.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  statusCode: 429, // 429 Too Many Requests
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

// Initialize Routers
const aiProxyRouter = createAiProxyRouter(ai); // Pass the ai instance
const adventureApiRouter = createAdventureApiRouter(ai); // Added: Pass the ai instance

// Mount Routers
// app.use('/api/prompts', promptsApiRouter); // Removed
app.use('/api/adventure', adventureApiRouter);
app.use('/api', aiProxyRouter); // Mount the AI proxy API router (generic proxies)

// Serve HTML (catch-all for client-side routing)
app.use('*', generalLimiter, async (req, res) => { // Changed from *all to *
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
