
import express from 'express';
import { GoogleGenAI, GenerateContentResponse, GenerateImagesResponse } from '@google/genai'; // Corrected type
import cors from 'cors';

const app = express();
const port: string | number = process.env.PORT || 3001;

const API_KEY: string | undefined = process.env.API_KEY;

if (!API_KEY) {
  console.error("FATAL ERROR: API_KEY environment variable is not set for the proxy server.");
}

let ai: GoogleGenAI | undefined;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

app.use(cors());
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

interface ErrorWithMessage {
    message: string;
    status?: number; 
}

interface ProxyResponseError {
    error?: string;
    details?: any;
}

const handleProxyError = (res: express.Response, error: unknown, context: string): void => {
  console.error(`Error in proxy/${context}:`, error);
  let statusCode = 500;
  let clientMessage = `An internal server error occurred in the proxy while handling ${context}.`;

  if (typeof error === 'object' && error !== null) {
    const err = error as Partial<ErrorWithMessage & ProxyResponseError>; 

    if (typeof err.message === 'string') {
      if (err.message.includes("API key not valid") || (err.status === 400 && err.message.toLowerCase().includes("api key"))) {
        statusCode = 500;
        clientMessage = "API Key configuration error on the server. Please contact support.";
        console.error("Proxy server's API Key is invalid or missing.");
      } else if (err.message.includes("quota") || err.message.includes("RESOURCE_EXHAUSTED") || err.status === 429) {
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

  res.status(statusCode).json({ error: clientMessage, details: error ? error.toString() : 'Unknown error object' });
};

app.post('/api/generate-content', async (req: express.Request<never, any, GenerateContentPayload>, res: express.Response) => {
  if (!ai) {
    return res.status(503).json({ error: "Proxy's AI Service is not available (API Key issue)." });
  }
  try {
    const { model, contents, config } = req.body;
    if (!model || !contents) {
      return res.status(400).json({ error: "Proxy: Missing 'model' or 'contents' in request body for generate-content" });
    }
    
    const requestPayload = { model, contents, config };
    const result: GenerateContentResponse = await ai.models.generateContent(requestPayload);
    
    res.json({ text: result.text });
  } catch (error) {
    handleProxyError(res, error, 'generate-content');
  }
});

app.post('/api/generate-images', async (req: express.Request<never, any, GenerateImagesPayload>, res: express.Response) => {
  if (!ai) {
    return res.status(503).json({ error: "Proxy's AI Service is not available (API Key issue)." });
  }
  try {
    const { model, prompt, config } = req.body;
    if (!model || !prompt) {
      return res.status(400).json({ error: "Proxy: Missing 'model' or 'prompt' in request body for generate-images" });
    }
    const requestPayload = { model, prompt, config };
    const result: GenerateImagesResponse = await ai.models.generateImages(requestPayload); // Corrected type
    res.json(result);
  } catch (error) {
    handleProxyError(res, error, 'generate-images');
  }
});

app.listen(port, () => {
  console.log(`Forge your Journey Proxy server listening on port ${port}`);
  if (API_KEY && ai) {
    console.log("Proxy: API Key loaded and AI client initialized.");
  } else {
    console.error("Proxy: API_KEY is NOT LOADED or AI client failed to initialize. API calls will fail.");
  }
});
