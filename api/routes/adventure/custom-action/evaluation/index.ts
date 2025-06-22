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
  InventoryItem,
  JsonParseError,
  Persona,
  StorySegment,
  WorldDetails
} from '../../../../../types.js';
import { GENAI_MODEL_NAME } from '../../../../ai/constants.js';
import { ActionFeasibilitySchema } from '../../../../ai/schema.js';
import { generateContent } from '../../../../ai/utils.js';
import { ErrorResponse } from '../../../../errors/error-response.js';
import { UnhandledError } from '../../../../errors/unhandled-error.js';
import { validate } from '../../../../middlewares/validate.js';
import { SuccessResponse } from '../../../../success-response.js';
import { customActionEvaluationPayload } from '../../../../validation/schemas.js';
import { handleProxyError } from '../../../../errors/proxy-error.js';

export const router = Router();

router.post(
  '/',
  validate({
    body: customActionEvaluationPayload
  }),
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        userInputText,
        currentSegment,
        adventureOutline,
        worldDetails,
        selectedGenre,
        selectedPersona,
        inventory,
        currentStageIndex
      } = req.body;

      const outline = await evaluateCustomActionFeasibility(
        userInputText,
        currentSegment,
        adventureOutline,
        worldDetails,
        selectedGenre,
        selectedPersona,
        inventory,
        currentStageIndex
      );

      res.status(200).json(
        new SuccessResponse(200, {
          text: outline
        })
      );
    } catch (error) {
      next(handleProxyError(error, 'custom-action-evaluation'));
    }
  }) as RequestHandler
);

async function evaluateCustomActionFeasibility(
  userInputText: string,
  currentSegment: StorySegment,
  adventureOutline: AdventureOutline,
  worldDetails: WorldDetails,
  selectedGenre: keyof GenreSpecificPersonaDetails,
  selectedPersona: Persona,
  inventory: InventoryItem[],
  currentStageIndex: number
): Promise<string> {
  const genreSpecificPersonaTitle =
    genrePersonaDetails[selectedGenre]?.[selectedPersona]?.title ||
    selectedPersona;
  const personaContext = `The player is a ${genreSpecificPersonaTitle} (base persona: ${selectedPersona}).`;
  const inventoryContext =
    inventory.length > 0
      ? `The player possesses: ${inventory.map((item) => `'${item.name}' (described as: ${item.description})`).join(', ')}.`
      : 'The player possesses no items yet.';
  const currentStage = adventureOutline.stages[currentStageIndex];
  const worldContext = `
  World Context for Evaluation:
  World Name: "${worldDetails.worldName}" (Genre Clarification: ${worldDetails.genreClarification})
  Key Environment: ${worldDetails.keyEnvironmentalFeatures.join('; ') || 'N/A'}
  Societies/Factions: ${worldDetails.dominantSocietiesOrFactions.join('; ') || 'N/A'}
  Creatures/Monsters: ${worldDetails.uniqueCreaturesOrMonsters.join('; ') || 'N/A'}
  Magic System: ${worldDetails.magicSystemOverview}
  History Hook: ${worldDetails.briefHistoryHook}
  Cultural Norms/Taboos: ${worldDetails.culturalNormsOrTaboos.join('; ') || 'N/A'}`;

  const prompt = `You are an AI game master evaluating a player's custom action in a text-based RPG.
  Adventure Genre: ${selectedGenre}.
  ${personaContext}
  Player's Current Inventory: ${inventoryContext}
  ${worldContext}
  Overall Adventure Title: "${adventureOutline.title}"
  Ultimate Goal: "${adventureOutline.overallGoal}"
  Current Stage ${currentStageIndex + 1}: "${currentStage.title}" (Objective: "${currentStage.objective}").
  Current Scene Description: "${currentSegment.sceneDescription}"
  Player's proposed custom action: "${userInputText}"
  
  Your task is to evaluate this action and respond with JSON.
  Consider:
  - Plausibility: Is the action physically possible in this scene?
  - Sensibility: Does it make sense given the character, genre, and world?
  - Rules: Does it violate any established game rules, world logic (magic system, cultural taboos), or the tone of the ${selectedGenre} genre?
  - Safety: Is it absurdly self-destructive without clear motivation?
  - Inventory: Could any inventory items make this action more or less feasible?
  - Appropriateness: Sanitize user input. Do not reflect harmful, offensive, or extreme role-play-breaking input directly. If input is inappropriate, deem it 'not possible' and explain gently.
  
  Based on your evaluation, fill the following JSON fields:
  - 'isPossible' (boolean): True if the action is plausible and can be attempted. False if impossible, nonsensical, or breaks rules/tone.
  - 'reason' (string): Concise explanation. If not possible, clearly state why. If possible, briefly explain its plausibility or what it might affect.
  - 'suggestedOutcomeSummaryIfPossible' (string, optional): If 'isPossible' is true, a very brief (1-2 sentence) summary of a likely immediate consequence or next step. Omit if not possible or outcome is too complex to summarize.`;
  const response = await generateContent(GENAI_MODEL_NAME, prompt, {
    responseMimeType: 'application/json',
    responseSchema: ActionFeasibilitySchema
  });
  if (!response.text)
    throw new JsonParseError(
      "Proxy response for outline missing 'text' field.",
      JSON.stringify(response)
    );

  return response.text;
}
