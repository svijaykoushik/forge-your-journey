import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router
} from 'express';
import { JsonParseError } from '../../../../types.js';
import { GENAI_MODEL_NAME } from '../../../ai/constants.js';
import { StorySegmentSchema } from '../../../ai/schema.js';
import { generateContent } from '../../../ai/utils.js';
import { ErrorResponse } from '../../../errors/error-response.js';
import { UnhandledError } from '../../../errors/unhandled-error.js';
import { validate } from '../../../middlewares/validate.js';
import { SuccessResponse } from '../../../success-response.js';
import { fetchStorySegmentSchema } from '../../../validation/schemas.js';

export const router = Router();

router.post(
  '/',
  validate({
    body: fetchStorySegmentSchema
  }),
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fullPrompt, isInitialScene } = req.body;
      const outline = await fetchStorySegment(fullPrompt, isInitialScene);

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

async function fetchStorySegment(
  fullPrompt: string,
  isInitialScene: boolean
): Promise<string> {
  const augmentedPrompt = `${fullPrompt}

General Content Instructions for Story Segment:
- For the 'sceneDescription' field:
    - ${
      isInitialScene
        ? 'For this initial scene, or if the player is entering a new major location/area, ensure the sceneDescription is immersive and establishes the setting and atmosphere effectively (approx. 3-5 sentences).'
        : "For subsequent scenes, the sceneDescription should be vivid yet concise (approx. 2-4 sentences). If the player's choice outcome (detailed in the prompt above) implies travel, a simple or mundane action, or is primarily transitional, aim for focused brevity (approx. 1-3 sentences), highlighting only essential changes, observations, or the direct result of the action."
    }
    - If the player's choice outcome (detailed in the prompt above) implies combat, a chase, or any other fast-paced action sequence, prioritize dynamic action verbs and immediate sensory details in the sceneDescription. Keep it punchy, engaging, and focused on the action, rather than lengthy atmospheric descriptions.
    - Narrative Style: Employ varied sentence structures; mix short, punchy sentences with longer, more descriptive ones to create a dynamic and engaging narrative flow. Avoid repetitive sentence beginnings.
    - Paragraphing: The "sceneDescription" content should be 2 or 3 short paragraphs. Each paragraph should naturally flow into the next. Ensure paragraphs are separated by a double newline character (\\n\\n) in the final JSON string for this field.
- For the 'choices' array (if 'isUserInputCommandOnly' is false): Provide 3 distinct choices. Each choice object requires:
    - 'text': Player-facing choice text.
    - 'outcomePrompt': AI instruction for the next scene if this choice is picked. This prompt should imply the nature of the consequence (positive, negative, neutral) which the AI will then narrate in the next scene's description.
    - 'signalsStageCompletion' (boolean): True if this choice DIRECTLY completes the current stage objective.
    - 'leadsToFailure' (boolean): True if this choice leads to definitive game failure.
- For 'isUserInputCommandOnly' (boolean): There is a small chance (around 10-15%, slightly less for the very first scene unless context demands it) that the situation calls for the player's direct input. In such cases, set this to true, and the 'choices' array MUST be empty. The 'sceneDescription' should naturally lead to the player needing to decide what to do.
- For 'isFailureScene' (boolean): Set to true ONLY if this scene itself IS the game failure narration (e.g., after a choice with 'leadsToFailure: true' was picked). If true, 'choices' should be empty, and 'imagePrompt' can be a somber final image.
- For 'isFinalScene' (boolean): Set to true ONLY if this scene represents the SUCCESSFUL conclusion of the ENTIRE adventure.
- For 'itemFound' (object, optional): If an item is found, provide its 'name' and 'description'. Omit this field if no item is found.
- For 'imagePrompt' (string): Provide a descriptive prompt for image generation relevant to the scene.`;
  const response = await generateContent(GENAI_MODEL_NAME, augmentedPrompt, {
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
