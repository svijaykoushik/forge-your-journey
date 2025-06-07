import fs from 'node:fs/promises';
import express, { RequestHandler } from 'express';
import { ViteDevServer } from 'vite';
import compression from 'compression';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5173;
const base = process.env.BASE || '/';

// Cached production assets
const templateHtml = isProduction
  ? await fs.readFile('./dist/client/index.html', 'utf-8')
  : '';

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

// Serve HTML
app.use('*all', async (req, res) => {
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
