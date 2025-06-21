import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router
} from 'express';
import {
  AdventureOutline,
  genrePersonaDetails,
  GenreSpecificPersonaDetails,
  JsonParseError,
  Persona
} from '../../../../types.js';
import { generateContent } from '../../../ai/utils.js';
import { GENAI_MODEL_NAME } from '../../../ai/constants.js';
import { WorldDetailsSchema } from '../../../ai/schema.js';
import {
  ErrorResponse,
  ExceptionDetails
} from '../../../errors/error-response.js';
import { UnhandledError } from '../../../errors/unhandled-error.js';
import { SuccessResponse } from '../../../success-response.js';

export const router = Router();

router.post('/', (async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adventureOutline, persona, genre } = req.body;
    if (!genre) {
      throw new ErrorResponse(
        400,
        new ExceptionDetails(
          'required_parameter_missing',
          'genre should be a string.'
        )
      );
    }
    if (!persona) {
      throw new ErrorResponse(
        400,
        new ExceptionDetails(
          'required_parameter_missing',
          'persona should be a string.'
        )
      );
    }
    if (!adventureOutline) {
      throw new ErrorResponse(
        400,
        new ExceptionDetails(
          'required_parameter_missing',
          'adventureOutline should be a object.'
        )
      );
    }
    const outline = await fetchWorldDetails(adventureOutline, genre, persona);

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

async function fetchWorldDetails(
  adventureOutline: AdventureOutline,
  persona: Persona,
  genre: keyof GenreSpecificPersonaDetails
): Promise<string> {
  const genreSpecificPersonaTitle =
    genrePersonaDetails[genre]?.[persona]?.title || persona;
  const prompt = `You are a world-building AI. Based on the provided adventure outline, player persona, and genre, generate detailed world information.
Adventure Title: "${adventureOutline.title}"
Overall Goal: "${adventureOutline.overallGoal}"
Adventure Stages:
${adventureOutline.stages.map((s, i) => `  Stage ${i + 1}: "${s.title}" - ${s.description} (Objective: ${s.objective})`).join('\n')}
Player Persona: "${genreSpecificPersonaTitle}" (base archetype: ${persona})
Adventure Genre: ${genre}

Generate rich and interconnected world details. These details should directly influence the atmosphere, potential encounters, challenges, and items within the adventure.
The player's persona (${genreSpecificPersonaTitle}, archetype ${persona}) might have unique insights or connections to certain aspects of this world.

Provide content for the following fields:
- 'worldName': A unique and evocative name for this game world or region, fitting for a ${genreSpecificPersonaTitle}.
- 'genreClarification': A more specific clarification of the genre, possibly blending sub-genres (e.g., "High fantasy with elements of cosmic horror" or "Dark fantasy survival in a post-magical apocalypse").
- 'keyEnvironmentalFeatures' (array of strings): List 2-3 distinct and striking environmental features or geographical oddities. Each feature should be a string. Example values: "A constantly shifting crystal desert", "Floating islands wreathed in perpetual storms", "A forest where trees whisper prophecies, sometimes containing \\"forbidden truths\\"."
- 'dominantSocietiesOrFactions' (array of strings): Describe 1-2 major societies, factions, or sentient species. Each description is a string. e.g., "The reclusive Sky-Elves of Mount Cinder, known for their powerful elemental magic and distrust of outsiders."
- 'uniqueCreaturesOrMonsters' (array of strings): Name and briefly describe 1-2 unique creatures or monsters. Each description is a string. e.g., "Chronomites: small, insectoid creatures that can locally distort time.", "Grief-fiends: ethereal beings that feed on sorrow."
- 'magicSystemOverview': Briefly describe the nature of magic in this world. This should be a string. e.g., "Magic is a wild, untamed force drawn from the raw elements, accessible only to those with innate talent or through dangerous pacts."
- 'briefHistoryHook': A short, intriguing piece of history or lore relevant to the adventure. This should be a string. e.g., "The land is still scarred by the 'War of Whispers' a century ago, where forbidden knowledge almost unmade reality."
- 'culturalNormsOrTaboos' (array of strings): List 1-2 significant cultural norms, traditions, or taboos. Each is a string. e.g., "Offering a shard of obsidian is a sign of respect.", "Speaking the name of the last Tyrant King is forbidden and believed to bring misfortune."

Ensure all fields are filled with creative and relevant information.`;
  const response = await generateContent(GENAI_MODEL_NAME, prompt, {
    responseMimeType: 'application/json',
    responseSchema: WorldDetailsSchema
  });
  if (!response.text)
    throw new JsonParseError(
      "Proxy response for outline missing 'text' field.",
      JSON.stringify(response)
    );

  return response.text;
}
