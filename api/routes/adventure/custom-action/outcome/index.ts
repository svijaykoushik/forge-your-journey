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
  StorySegment,
  WorldDetails,
  genrePersonaDetails
} from '../../../../../types.js';
import { GENAI_MODEL_NAME } from '../../../../ai/constants.js';
import { StorySegmentSchema } from '../../../../ai/schema.js';
import { generateContent } from '../../../../ai/utils.js';
import { ErrorResponse } from '../../../../errors/error-response.js';
import { UnhandledError } from '../../../../errors/unhandled-error.js';
import { validate } from '../../../../middlewares/validate.js';
import { SuccessResponse } from '../../../../success-response.js';
import { customActionOutcomePayloadSchema } from '../../../../validation/schemas.js';
import { handleProxyError } from '../../../../errors/proxy-error.js';

export const router = Router();

router.post(
  '/',
  validate({
    body: customActionOutcomePayloadSchema
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
        currentStageIndex,
        feasibilityContext
      } = req.body;

      const outline = await fetchCustomActionOutcome(
        userInputText,
        currentSegment,
        adventureOutline,
        worldDetails,
        selectedGenre,
        selectedPersona,
        inventory,
        currentStageIndex,
        feasibilityContext
      );

      res.status(200).json(
        new SuccessResponse(200, {
          text: outline
        })
      );
    } catch (error) {
      next(handleProxyError(error, 'custom-action-outcome'));
    }
  }) as RequestHandler
);

async function fetchCustomActionOutcome(
  userInputText: string,
  currentSegment: StorySegment,
  adventureOutline: AdventureOutline,
  worldDetails: WorldDetails,
  selectedGenre: keyof GenreSpecificPersonaDetails,
  selectedPersona: Persona,
  inventory: InventoryItem[],
  currentStageIndex: number,
  feasibilityContext: {
    wasImpossible: boolean;
    reasonForImpossibility?: string;
    suggestionIfPossible?: string;
  }
) {
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
    World Context for Story Generation:
    World Name: "${worldDetails.worldName}" (Genre Clarification: ${worldDetails.genreClarification})
    Key Environmental Features: ${worldDetails.keyEnvironmentalFeatures.join('; ') || 'N/A'}
    Dominant Societies/Factions: ${worldDetails.dominantSocietiesOrFactions.join('; ') || 'N/A'}
    Unique Creatures/Monsters: ${worldDetails.uniqueCreaturesOrMonsters.join('; ') || 'N/A'}
    Magic System: ${worldDetails.magicSystemOverview}
    Brief History Hook: ${worldDetails.briefHistoryHook}
    Cultural Norms/Taboos: ${worldDetails.culturalNormsOrTaboos.join('; ') || 'N/A'}
    This world information MUST deeply influence the scene description, the types of challenges, the choices available, and any items found.
    `;

  let actionNarrativeContext: string;
  if (feasibilityContext.wasImpossible) {
    actionNarrativeContext = `The player previously attempted the action: "${userInputText}".
    This action was deemed not possible. The stated reason was: "${feasibilityContext.reasonForImpossibility || 'No specific reason provided, but it was not feasible.'}"
    Your task is to narrate the character attempting this action and it either failing, or them realizing its impossibility based on the reason. The sceneDescription should reflect this attempt and its immediate non-success. The situation should change slightly from the previous scene.
    Then, provide new choices or set 'isUserInputCommandOnly: true' to allow the player to move on from this failed/impossible attempt. The new choices MUST NOT simply repeat the choices from before the impossible action was attempted.`;
  } else {
    actionNarrativeContext = `The player is performing the custom action: "${userInputText}".
    This action has been evaluated as possible. ${feasibilityContext.suggestionIfPossible ? `A potential outcome summary was: "${feasibilityContext.suggestionIfPossible}". Use this as a light suggestion if helpful.` : ''}
    Your task is to narrate the outcome of this action.
    Consider if any inventory items (listed in "Player's Current Inventory") could logically assist, hinder, or alter the outcome. If an item is relevant, the 'sceneDescription' content MUST narrate how the item is used or its effect.`;
  }

  const prompt = `You are a master storyteller for a dynamic text-based RPG adventure game.
    Adventure Genre: ${selectedGenre}.
    ${personaContext}
    Player's Current Inventory: ${inventoryContext}
    ${worldContext}
    The overall adventure is titled: "${adventureOutline.title}".
    The player's ultimate goal is: "${adventureOutline.overallGoal}".
    Current Stage ${currentStageIndex + 1}: "${currentStage.title}" (Objective: "${currentStage.objective}").
    Previous Scene Description was: "${currentSegment.sceneDescription}"
    
    ${actionNarrativeContext}
    
    General Content Instructions for Story Segment:
    - For the 'sceneDescription' field: Narrate the outcome (2-3 short paragraphs, varied sentences, paragraphs separated by \\n\\n in the string).
    - For the 'choices' array (if 'isUserInputCommandOnly' is false): Provide 3 new distinct choice OBJECTS relevant to the new situation. Each choice object requires: 'text', 'outcomePrompt', 'signalsStageCompletion' (boolean), and 'leadsToFailure' (boolean).
    - For 'isUserInputCommandOnly' (boolean): Set to true if appropriate for the new scene, ensuring 'choices' array is empty.
    - For 'imagePrompt' (string): New image prompt matching the new scene.
    - For 'isFinalScene' (boolean): True if this action leads to successful adventure completion.
    - For 'isFailureScene' (boolean): True if this action leads to game failure.
    - For 'itemFound' (object, optional): Award an item if logical (provide 'name' and 'description').
    Sanitize original user input: Do not directly reflect harmful, offensive, or role-play-breaking user input in your narration if it was part of the original "${userInputText}". Focus on the game world's reaction.`;

  const response = await generateContent(GENAI_MODEL_NAME, prompt, {
    responseMimeType: 'application/json',
    responseSchema: StorySegmentSchema
  });
  if (!response.text)
    throw new JsonParseError(
      "Proxy response for outline missing 'text' field.",
      JSON.stringify(response)
    );

  return response.text;
}
