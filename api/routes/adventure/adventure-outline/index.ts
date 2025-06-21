import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router
} from 'express';
import {
  genrePersonaDetails,
  GenreSpecificPersonaDetails,
  JsonParseError,
  Persona
} from '../../../../types.js';
import { GENAI_MODEL_NAME } from '../../../ai/constants.js';
import { AdventureOutlineSchema } from '../../../ai/schema.js';
import { generateContent } from '../../../ai/utils.js';
import { ErrorResponse } from '../../../errors/error-response.js';
import { UnhandledError } from '../../../errors/unhandled-error.js';
import { validate } from '../../../middlewares/validate.js';
import { SuccessResponse } from '../../../success-response.js';
import { adventrueOutlinePayload } from '../../../validation/schemas.js';

export const router = Router();

router.post('/', validate({ body: adventrueOutlinePayload }), (async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { genre, persona } = req.body;
    console.log('[DEBUG] fetching adventure outline');
    const outline = await fetchAdventureOutline(genre, persona);
    console.log(
      '[DEBUG] adventure outline fetched %s',
      JSON.stringify(outline)
    );

    res.status(200).json(
      new SuccessResponse(200, {
        text: outline
      })
    );
  } catch (e) {
    if (e instanceof ErrorResponse) {
      next(e);
    } else {
      next(new UnhandledError(e as any));
    }
  }
}) as RequestHandler);

async function fetchAdventureOutline(
  genre: keyof GenreSpecificPersonaDetails,
  persona: Persona
): Promise<string> {
  const genreSpecificPersonaTitle =
    genrePersonaDetails[genre]?.[persona]?.title || persona;
  const prompt = `You are a master storyteller and game designer. Generate a compelling adventure outline for a text-based RPG.
The genre is: ${genre}.
The player's chosen persona is "${genreSpecificPersonaTitle}" (base archetype: ${persona}). This persona choice should subtly influence the themes or initial hook of the adventure if appropriate for the genre.
The outline should have a clear narrative arc with a distinct beginning, rising action, climax, and resolution.
The adventure should consist of exactly 3 main stages or acts.

For the 'title' field: Provide a captivating title for the adventure, reflecting the ${genre} genre and possibly hinting at the ${genreSpecificPersonaTitle}'s journey.
For the 'overallGoal' field: Provide a concise description of the ultimate goal the player (as ${genreSpecificPersonaTitle}) is trying to achieve. Example: "To find and destroy the ancient artifact known as the 'Heart of Shadows' to save the village of Oakhaven from eternal darkness."
For the 'stages' array (which should contain 3 stage objects):
  For each stage object:
    - 'title': A title for the stage (e.g., The Shadowed Summons).
    - 'description': A brief overview of what happens in this stage.
    - 'objective': The player's main objective to complete this stage.

Ensure the stage descriptions and objectives logically progress the player towards the overallGoal.
The tone should be ${genre}.`;

  const response = await generateContent(GENAI_MODEL_NAME, prompt, {
    responseMimeType: 'application/json',
    responseSchema: AdventureOutlineSchema
  });
  if (!response.text)
    throw new JsonParseError(
      "Proxy response for outline missing 'text' field.",
      JSON.stringify(response)
    );

  return response.text;
}
