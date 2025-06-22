export const isProduction = process.env.NODE_ENV === 'production';
export const port = process.env.PORT || 5173;
export const base = process.env.BASE || '/';
export const API_KEY: string | undefined = process.env.API_KEY;
export const IMAGEN_MODEL_NAME = 'imagen-3.0-generate-002';
export const GEMINI_IMAGE_MODEL_NAME =
  'gemini-2.0-flash-preview-image-generation';
export const USE_IMAGEN_ENV_VAR = process.env.USE_IMAGEN?.toLowerCase();
export const USE_IMAGEN =
  USE_IMAGEN_ENV_VAR === 'true' ||
  USE_IMAGEN_ENV_VAR === 'enabled' ||
  USE_IMAGEN_ENV_VAR === 'yes' ||
  USE_IMAGEN_ENV_VAR === '1';
