import { GoogleGenAI } from '@google/genai';
import { API_KEY } from '../constants.js';

export const GENAI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

export let ai: GoogleGenAI | undefined;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}
