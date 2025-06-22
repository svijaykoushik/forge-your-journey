import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router
} from 'express';
import { JsonParseError } from '../../../../types.js';
import { GENAI_MODEL_NAME } from '../../../ai/constants.js';
import { generateContent } from '../../../ai/utils.js';
import { ErrorResponse } from '../../../errors/error-response.js';
import { UnhandledError } from '../../../errors/unhandled-error.js';
import { validate } from '../../../middlewares/validate.js';
import { SuccessResponse } from '../../../success-response.js';
import { attemptToFixJsonPayloadSchema } from '../../../validation/schemas.js';
import { handleProxyError } from '../../../errors/proxy-error.js';

export const router = Router();

router.post(
  '/',
  validate({
    body: attemptToFixJsonPayloadSchema
  }),
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userInputText, originalPromptContext } = req.body;

      const outline = await attemptToFixJson(
        userInputText,
        originalPromptContext
      );

      res.status(200).json(
        new SuccessResponse(200, {
          text: outline
        })
      );
    } catch (error) {
      next(handleProxyError(error, 'fix-json'));
    }
  }) as RequestHandler
);

async function attemptToFixJson(
  faultyJsonText: string,
  originalPromptContext: string
) {
  const fixPrompt = `The following JSON response was received but is malformed:
\`\`\`json
${faultyJsonText}
\`\`\`

This response was for a request related to generating a story segment. The original request's core instructions were to produce a JSON object with keys: "sceneDescription" (string, formatted into 2-3 short paragraphs with varied sentence structure, paragraphs separated by \\n\\n), "choices" (array of objects, each object with "text" (string), "outcomePrompt" (string), "signalsStageCompletion" (boolean), and "leadsToFailure" (boolean)), "imagePrompt" (string), "isFinalScene" (boolean), "isFailureScene" (boolean), "isUserInputCommandOnly" (boolean), and optionally "itemFound" (an object with "name" (string) and "description" (string)).
If "isUserInputCommandOnly" is true, "choices" array must be empty.
The context of the original prompt included aspects like:
"${originalPromptContext.substring(0, 500)}..."

Please analyze the faulty JSON, correct its structure, and provide ONLY the valid JSON object for the story segment. Ensure all required fields are present and correctly typed according to the structure described, especially the "sceneDescription" formatting and the structure of objects within the "choices" array. Do not include any explanatory text, only the corrected JSON object.`;

  const response = await generateContent(GENAI_MODEL_NAME, fixPrompt, {
    responseMimeType: 'application/json'
    // No responseSchema here as the AI is fixing text to match a described schema, not generating from scratch.
  });
  if (!response.text)
    throw new JsonParseError(
      "Proxy response for outline missing 'text' field.",
      JSON.stringify(response)
    );

  return response.text;
}
