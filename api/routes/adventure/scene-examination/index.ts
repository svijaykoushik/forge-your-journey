import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router
} from 'express';
import {
  AdventureOutline,
  GenreSpecificPersonaDetails,
  InventoryItem,
  JsonParseError,
  Persona,
  WorldDetails,
  genrePersonaDetails
} from '../../../../types.js';
import { GENAI_MODEL_NAME } from '../../../ai/constants.js';
import { ExaminationSchema } from '../../../ai/schema.js';
import { generateContent } from '../../../ai/utils.js';
import { ErrorResponse } from '../../../errors/error-response.js';
import { UnhandledError } from '../../../errors/unhandled-error.js';
import { validate } from '../../../middlewares/validate.js';
import { SuccessResponse } from '../../../success-response.js';
import { sceneExamiationPayloadSchema } from '../../../validation/schemas.js';

export const router = Router();

router.post(
  '/',
  validate({
    body: sceneExamiationPayloadSchema
  }),
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        currentSceneDescription,
        adventureGenre,
        adventureOutline,
        worldDetails,
        currentStageTitle,
        currentStageObjective,
        persona,
        inventory
      } = req.body;

      const outline = await fetchSceneExamination(
        currentSceneDescription,
        adventureGenre,
        adventureOutline,
        worldDetails,
        currentStageTitle,
        currentStageObjective,
        persona,
        inventory
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
  }) as RequestHandler
);

async function fetchSceneExamination(
  currentSceneDescription: string,
  adventureGenre: keyof GenreSpecificPersonaDetails,
  adventureOutline: AdventureOutline,
  worldDetails: WorldDetails,
  currentStageTitle: string,
  currentStageObjective: string,
  persona: Persona,
  inventory: InventoryItem[]
) {
  const genreSpecificPersonaTitle =
    genrePersonaDetails[adventureGenre]?.[persona]?.title || persona;
  const personaContext = `The player examining is a ${genreSpecificPersonaTitle} (base archetype: ${persona}).`;
  const inventoryContext =
    inventory.length > 0
      ? `They possess: ${inventory.map((item) => item.name).join(', ')}.`
      : 'They possess no items.';
  const worldContext = `
  World Context:
  World Name: "${worldDetails.worldName}" (${worldDetails.genreClarification})
  Key Environment: ${worldDetails.keyEnvironmentalFeatures.join(', ') || 'N/A'}
  Societies: ${worldDetails.dominantSocietiesOrFactions.join(', ') || 'N/A'}
  Creatures: ${worldDetails.uniqueCreaturesOrMonsters.join(', ') || 'N/A'}
  Magic: ${worldDetails.magicSystemOverview}
  History Hook: ${worldDetails.briefHistoryHook}
  Culture: ${worldDetails.culturalNormsOrTaboos.join(', ') || 'N/A'}
  This world information should influence the details revealed.`;
  const prompt = `You are a master storyteller. The player wants to examine their current surroundings more closely.
  Adventure Title: "${adventureOutline.title}"
  Overall Goal: "${adventureOutline.overallGoal}"
  Current Stage: "${currentStageTitle}" (Objective: "${currentStageObjective}")
  ${personaContext}
  ${inventoryContext}
  ${worldContext}
  
  Current Scene Description (what the player already sees):
  "${currentSceneDescription}"
  
  Based on this, provide content for the 'examinationText' field. This text should:
  - Elaborate on details already mentioned or hint at things not immediately obvious.
  - Describe the immediate surroundings of the player's current location, providing sensory details that help the player to visually or spatially understand the layout of the area they are in.
  - Reveal subtle clues, interesting lore, or atmospheric details.
  - All details provided (elaborations, surroundings, clues, lore) MUST be consistent with and draw from the established World Context (environment, societies, creatures, magic, history, culture) provided above.
  - Consider the player's persona (${genreSpecificPersonaTitle} -- base archetype: ${persona}) and items they possess for any specific insights they might gain, filtered through their understanding of this world.
  - DO NOT advance the plot or introduce new choices. This is for observation only.
  - Maintain the ${String(adventureGenre)} tone, enriched by the world's specific genre clarification.
  - Be 2-4 sentences long and concise. Employ varied sentence structures.`;

  const response = await generateContent(GENAI_MODEL_NAME, prompt, {
    responseMimeType: 'application/json',
    responseSchema: ExaminationSchema
  });
  if (!response.text)
    throw new JsonParseError(
      "Proxy response for outline missing 'text' field.",
      JSON.stringify(response)
    );

  return response.text;
}
