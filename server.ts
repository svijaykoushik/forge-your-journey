import fs from 'node:fs/promises';
import express, { RequestHandler } from 'express';
import { ViteDevServer } from 'vite';
import compression from 'compression';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Import the new adventure API router
import createAdventureApiRouter from './server/routes/adventureApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5173;
const base = process.env.BASE || '/';
const API_KEY: string | undefined = process.env.API_KEY;

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
} else {
  console.warn(
    'Warning: API_KEY is not set. AI-dependent API routes will be disabled.'
  );
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
  app.use(compression() as unknown as RequestHandler);
  const sirv = (await import('sirv')).default;
  app.use(base, sirv('./dist/client', { extensions: [] }));
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", '/api/adventure'], // Updated to allow calls to the new API path
        fontSrc: ["'self'", 'https://fonts.gstatic.com']
      }
    }
  })
);

app.use(express.json({ limit: '10mb' }));

// --- API Routers ---
const adventureApiRouter = createAdventureApiRouter(ai);
app.use('/api/adventure', adventureApiRouter);

// General rate limiter for non-API routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
});
// Apply generalLimiter to non-API routes (SSR and static assets)
// This should come after API routes to not interfere with their specific limiters (if any were on app level)
// However, adventureApiRouter has its own limiters per route.

// Serve HTML (catch-all for client-side routing)
app.use('*', generalLimiter, async (req, res) => { // Apply generalLimiter here
  try {
    const url = req.originalUrl.replace(base, '');
    let template: string;
    let render: (url: string) => Promise<{ html: string; head?: string }>;

    if (!isProduction && vite) {
      template = await fs.readFile('./index.html', 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      render = (await vite.ssrLoadModule('/entry-server.tsx')).render;
    } else {
      template = templateHtml;
      // Correct path for production build structure based on tsconfig.server.json and vite build output
      render = (await import(resolve(__dirname, './dist/server/entry-server.js'))).render;
    }

    const rendered = await render(url);

    const html = template
      .replace(`<!--app-head-->`, rendered.head ?? '')
      .replace(`<!--app-html-->`, rendered.html ?? '');

    res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
  } catch (e: any) {
    if (vite) vite.ssrFixStacktrace(e);
    console.error('SSR Error:', e);
    res.status(500).end(isProduction ? 'Internal Server Error' : e.stack || e.message);
  }
});

// Start http server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
