import { GenerateContentConfig, GenerateContentResponse } from '@google/genai';
import { ai } from './constants.js';

export const generateContent = async (
  model: string,
  contents: string,
  config: GenerateContentConfig
) => {
  if (!ai) {
    throw Error('AI Service is not available (API Key issue).');
  }
  const result: GenerateContentResponse = await ai.models.generateContent({
    contents,
    model,
    config
  });
  return result;
};
