import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import {
  GameGenre,
  Persona,
  AdventureOutline,
  WorldDetails,
  StorySegment,
  InventoryItem,
  GeminiActionFeasibilityResponse,
  GeminiAdventureOutlineResponse,
  GeminiWorldDetailsResponse,
  GeminiStoryResponse,
  GeminiExaminationResponse,
  JsonParseError,
  AdventureStage // Added for validation
} from '../../types.js';
import {
  generateAdventureOutlinePrompt,
  generateWorldDetailsPrompt,
  generateStorySegmentPrompt,
  generateActionFeasibilityPrompt,
  generateCustomActionOutcomePrompt,
  generateAttemptToFixJsonPrompt,
  generateSceneExaminationPrompt
} from '../../server/prompts.js';
import {
  genAiLimiter,
  handleProxyError, // Using this as the main error handler for AI calls
  parseJsonFromText,
  slugify,
  generateImageWithImagegen,
  generateImageWithGemini,
  GENAI_MODEL_NAME,
  USE_IMAGEN
} from '../utils.js';
import {
  AdventureOutlineSchema,
  WorldDetailsSchema,
  StorySegmentSchema,
  ActionFeasibilitySchema,
  ExaminationSchema
} from '../schemas.js';

export default function createAdventureApiRouter(ai: GoogleGenAI | undefined) {
  const router = express.Router();

  if (!ai) {
    // If AI is not available, all routes in this router will be disabled.
    router.use((req, res, next) => {
      res.status(503).json({ error: "AI Service is not available (API Key issue)." });
    });
    return router;
  }

  // POST /api/adventure/outline
  router.post('/outline', genAiLimiter, async (req: Request, res: Response) => {
    try {
      const { genre, persona } = req.body as { genre?: GameGenre; persona?: Persona };
      if (!genre || !persona) {
        return res.status(400).json({ error: 'Missing required parameters: genre, persona' });
      }

      const prompt = generateAdventureOutlinePrompt(genre, persona);
      const result = await ai.models.generateContent({
        model: GENAI_MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: AdventureOutlineSchema }
      });

      const outlineData = parseJsonFromText<GeminiAdventureOutlineResponse>(result.text);

      // Validation (copied from client services/geminiService.ts)
      if (
        !outlineData || !outlineData.title || !outlineData.overallGoal || !outlineData.stages ||
        !Array.isArray(outlineData.stages) || outlineData.stages.length !== 3
      ) {
        throw new JsonParseError("Received incomplete adventure outline. Essential fields missing or 'stages' is not a valid 3-element array.", JSON.stringify(outlineData));
      }
      outlineData.stages.forEach((stage: AdventureStage, index: number) => {
        if (!stage || typeof stage.title !== 'string' || typeof stage.description !== 'string' || typeof stage.objective !== 'string') {
          throw new JsonParseError(`Stage ${index + 1} in the adventure outline is malformed.`, JSON.stringify(stage));
        }
      });
      res.json(outlineData);
    } catch (error) {
      handleProxyError(res, error, 'adventure/outline');
    }
  });

  // POST /api/adventure/world-details
  router.post('/world-details', genAiLimiter, async (req: Request, res: Response) => {
    try {
      const { adventureOutline, persona, genre } = req.body as { adventureOutline?: AdventureOutline; persona?: Persona; genre?: GameGenre; };
      if (!adventureOutline || !persona || !genre) {
        return res.status(400).json({ error: 'Missing required parameters: adventureOutline, persona, genre' });
      }
      const prompt = generateWorldDetailsPrompt(adventureOutline, persona, genre);
      const result = await ai.models.generateContent({
        model: GENAI_MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: WorldDetailsSchema }
      });
      const worldData = parseJsonFromText<GeminiWorldDetailsResponse>(result.text);

      // Validation
      if (!worldData || typeof worldData.worldName !== 'string' || worldData.worldName.trim() === '' ||
          !Array.isArray(worldData.keyEnvironmentalFeatures) || !Array.isArray(worldData.dominantSocietiesOrFactions) ||
          !Array.isArray(worldData.uniqueCreaturesOrMonsters) || typeof worldData.magicSystemOverview !== 'string' ||
          typeof worldData.briefHistoryHook !== 'string' || !Array.isArray(worldData.culturalNormsOrTaboos)) {
        throw new JsonParseError('Received incomplete or malformed world details.', JSON.stringify(worldData));
      }
      res.json(worldData);
    } catch (error) {
      handleProxyError(res, error, 'adventure/world-details');
    }
  });

  // POST /api/adventure/story-segment
  router.post('/story-segment', genAiLimiter, async (req: Request, res: Response) => {
    try {
      const { fullPrompt, isInitialScene } = req.body as { fullPrompt?: string; isInitialScene?: boolean };
      if (fullPrompt === undefined) {
        return res.status(400).json({ error: 'Missing required parameter: fullPrompt' });
      }
      const augmentedPrompt = generateStorySegmentPrompt(fullPrompt, isInitialScene);
      const result = await ai.models.generateContent({
        model: GENAI_MODEL_NAME,
        contents: augmentedPrompt,
        config: { responseMimeType: 'application/json', responseSchema: StorySegmentSchema }
      });
      const storyData = parseJsonFromText<GeminiStoryResponse>(result.text);

      // Validation
      if (!storyData || typeof storyData.sceneDescription !== 'string' || !Array.isArray(storyData.choices) ||
          typeof storyData.imagePrompt !== 'string' || typeof storyData.isFinalScene !== 'boolean' ||
          typeof storyData.isFailureScene !== 'boolean' || typeof storyData.isUserInputCommandOnly !== 'boolean') {
        throw new JsonParseError('Received incomplete or malformed story data.', JSON.stringify(storyData));
      }
      if (storyData.isUserInputCommandOnly === true && storyData.choices.length !== 0) {
        throw new JsonParseError('AI returned isUserInputCommandOnly=true but provided choices.', JSON.stringify(storyData));
      }
      if (storyData.choices) {
        storyData.choices.forEach((choice, index) => {
          if (!choice || typeof choice.text !== 'string' || typeof choice.outcomePrompt !== 'string' ||
              typeof choice.signalsStageCompletion !== 'boolean' || typeof choice.leadsToFailure !== 'boolean') {
            throw new JsonParseError(`Choice ${index + 1} is malformed.`, JSON.stringify(choice));
          }
        });
      }

      let finalItemFound: InventoryItem | undefined = undefined;
      if (storyData.itemFound && storyData.itemFound.name && storyData.itemFound.description) {
        finalItemFound = {
            id: slugify(storyData.itemFound.name),
            name: storyData.itemFound.name,
            description: storyData.itemFound.description,
        };
      }

      const responseSegment: StorySegment = {
        sceneDescription: storyData.sceneDescription,
        choices: storyData.choices || [],
        imagePrompt: storyData.imagePrompt,
        isFinalScene: storyData.isFinalScene,
        isFailureScene: storyData.isFailureScene,
        isUserInputCommandOnly: storyData.isUserInputCommandOnly,
        itemFound: finalItemFound,
      };
      res.json(responseSegment);
    } catch (error) {
      handleProxyError(res, error, 'adventure/story-segment');
    }
  });

  // POST /api/adventure/evaluate-action
  router.post('/evaluate-action', genAiLimiter, async (req: Request, res: Response) => {
    try {
      const params = req.body as {
        userInputText?: string; currentSegment?: StorySegment; adventureOutline?: AdventureOutline;
        worldDetails?: WorldDetails; selectedGenre?: GameGenre; selectedPersona?: Persona;
        inventory?: InventoryItem[]; currentStageIndex?: number;
      };
      if (!params.userInputText || !params.currentSegment || !params.adventureOutline || !params.worldDetails ||
          !params.selectedGenre || !params.selectedPersona || params.inventory === undefined || params.currentStageIndex === undefined) {
        return res.status(400).json({ error: 'Missing one or more required parameters for evaluate-action' });
      }
      const prompt = generateActionFeasibilityPrompt(params.userInputText, params.currentSegment, params.adventureOutline, params.worldDetails, params.selectedGenre, params.selectedPersona, params.inventory, params.currentStageIndex);
      const result = await ai.models.generateContent({
        model: GENAI_MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: ActionFeasibilitySchema }
      });
      const feasibilityData = parseJsonFromText<GeminiActionFeasibilityResponse>(result.text);

      if (typeof feasibilityData.isPossible !== 'boolean' || typeof feasibilityData.reason !== 'string') {
        throw new JsonParseError('Received incomplete or malformed action feasibility data.', JSON.stringify(feasibilityData));
      }
      res.json(feasibilityData);
    } catch (error) {
      handleProxyError(res, error, 'adventure/evaluate-action');
    }
  });

  // POST /api/adventure/custom-action-outcome
  router.post('/custom-action-outcome', genAiLimiter, async (req: Request, res: Response) => {
    try {
      const params = req.body as {
        userInputText?: string; currentSegment?: StorySegment; adventureOutline?: AdventureOutline;
        worldDetails?: WorldDetails; selectedGenre?: GameGenre; selectedPersona?: Persona;
        inventory?: InventoryItem[]; currentStageIndex?: number;
        feasibilityContext?: { wasImpossible: boolean; reasonForImpossibility?: string; suggestionIfPossible?: string; };
      };
      if (!params.userInputText || !params.currentSegment || !params.adventureOutline || !params.worldDetails ||
          !params.selectedGenre || !params.selectedPersona || params.inventory === undefined ||
          params.currentStageIndex === undefined || !params.feasibilityContext) {
        return res.status(400).json({ error: 'Missing one or more required parameters for custom-action-outcome' });
      }
      const prompt = generateCustomActionOutcomePrompt(params.userInputText, params.currentSegment, params.adventureOutline, params.worldDetails, params.selectedGenre, params.selectedPersona, params.inventory, params.currentStageIndex, params.feasibilityContext);
      const result = await ai.models.generateContent({
        model: GENAI_MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: StorySegmentSchema }
      });
      const storyData = parseJsonFromText<GeminiStoryResponse>(result.text);
      // Validation (copied from /story-segment)
      if (!storyData || typeof storyData.sceneDescription !== 'string' || !Array.isArray(storyData.choices) ||
          typeof storyData.imagePrompt !== 'string' || typeof storyData.isFinalScene !== 'boolean' ||
          typeof storyData.isFailureScene !== 'boolean' || typeof storyData.isUserInputCommandOnly !== 'boolean') {
        throw new JsonParseError('Received incomplete or malformed story data for custom action.', JSON.stringify(storyData));
      }
      // ... (rest of validation as in /story-segment)
       let finalItemFound: InventoryItem | undefined = undefined;
      if (storyData.itemFound && storyData.itemFound.name && storyData.itemFound.description) {
        finalItemFound = {
            id: slugify(storyData.itemFound.name),
            name: storyData.itemFound.name,
            description: storyData.itemFound.description,
        };
      }
      const responseSegment: StorySegment = {
        sceneDescription: storyData.sceneDescription,
        choices: storyData.choices || [],
        imagePrompt: storyData.imagePrompt,
        isFinalScene: storyData.isFinalScene,
        isFailureScene: storyData.isFailureScene,
        isUserInputCommandOnly: storyData.isUserInputCommandOnly,
        itemFound: finalItemFound,
      };
      res.json(responseSegment);
    } catch (error) {
      handleProxyError(res, error, 'adventure/custom-action-outcome');
    }
  });

  // POST /api/adventure/fix-json
  router.post('/fix-json', genAiLimiter, async (req: Request, res: Response) => {
    try {
      const { faultyJsonText, originalPromptContext } = req.body as { faultyJsonText?: string; originalPromptContext?: string; };
      if (faultyJsonText === undefined || originalPromptContext === undefined) {
        return res.status(400).json({ error: 'Missing required parameters: faultyJsonText, originalPromptContext' });
      }
      const fixPrompt = generateAttemptToFixJsonPrompt(faultyJsonText, originalPromptContext);
      const result = await ai.models.generateContent({
        model: GENAI_MODEL_NAME, // Using the main model for fixing JSON
        contents: fixPrompt,
        config: { responseMimeType: 'application/json' } // No schema for fix, as AI is producing based on instruction
      });
      const storyData = parseJsonFromText<GeminiStoryResponse>(result.text, true); // isFixAttempt = true
      // Validation (copied from /story-segment)
       if (!storyData || typeof storyData.sceneDescription !== 'string' || !Array.isArray(storyData.choices) ||
          typeof storyData.imagePrompt !== 'string' || typeof storyData.isFinalScene !== 'boolean' ||
          typeof storyData.isFailureScene !== 'boolean' || typeof storyData.isUserInputCommandOnly !== 'boolean') {
        throw new JsonParseError('Received incomplete or malformed story data after fix attempt.', JSON.stringify(storyData));
      }
      // ... (rest of validation as in /story-segment)
      let finalItemFound: InventoryItem | undefined = undefined;
      if (storyData.itemFound && storyData.itemFound.name && storyData.itemFound.description) {
        finalItemFound = {
            id: slugify(storyData.itemFound.name),
            name: storyData.itemFound.name,
            description: storyData.itemFound.description,
        };
      }
       const responseSegment: StorySegment = {
        sceneDescription: storyData.sceneDescription,
        choices: storyData.choices || [],
        imagePrompt: storyData.imagePrompt,
        isFinalScene: storyData.isFinalScene,
        isFailureScene: storyData.isFailureScene,
        isUserInputCommandOnly: storyData.isUserInputCommandOnly,
        itemFound: finalItemFound,
      };
      res.json(responseSegment);
    } catch (error) {
      handleProxyError(res, error, 'adventure/fix-json');
    }
  });

  // POST /api/adventure/scene-examination
  router.post('/scene-examination', genAiLimiter, async (req: Request, res: Response) => {
    try {
      const params = req.body as {
        currentSceneDescription?: string; adventureGenre?: GameGenre; adventureOutline?: AdventureOutline;
        worldDetails?: WorldDetails; currentStageTitle?: string; currentStageObjective?: string;
        persona?: Persona; inventory?: InventoryItem[];
      };
      if (!params.currentSceneDescription || !params.adventureGenre || !params.adventureOutline || !params.worldDetails ||
          !params.currentStageTitle || !params.currentStageObjective || !params.persona || params.inventory === undefined) {
        return res.status(400).json({ error: 'Missing one or more required parameters for scene-examination' });
      }
      const prompt = generateSceneExaminationPrompt(params.currentSceneDescription, params.adventureGenre, params.adventureOutline, params.worldDetails, params.currentStageTitle, params.currentStageObjective, params.persona, params.inventory);
      const result = await ai.models.generateContent({
        model: GENAI_MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: ExaminationSchema }
      });
      const examinationData = parseJsonFromText<GeminiExaminationResponse>(result.text);

      if (!examinationData || typeof examinationData.examinationText !== 'string' || examinationData.examinationText.trim() === '') {
        throw new JsonParseError("Received incomplete or malformed examination data. 'examinationText' field is missing or empty.", JSON.stringify(examinationData));
      }
      res.json(examinationData);
    } catch (error) {
      handleProxyError(res, error, 'adventure/scene-examination');
    }
  });

  // POST /api/adventure/generate-image
  router.post('/generate-image', genAiLimiter, async (req: Request, res: Response) => {
    try {
        const { prompt } = req.body as { prompt?: string };
        if (!prompt) {
            return res.status(400).json({ error: "Missing required parameter: prompt" });
        }

        let imageUrl = '';
        if (USE_IMAGEN) {
            imageUrl = await generateImageWithImagegen(ai, prompt);
        } else {
            imageUrl = await generateImageWithGemini(ai, prompt);
        }

        if (!imageUrl) {
          // Log specificall if image string is empty but no error was thrown by generators
          console.warn(`Image generation for prompt "${prompt}" resulted in an empty URL/string.`);
          // Depending on desired behavior, either return an error or an empty image string
          // For now, let's align with previous aiProxyApi and return empty string in ImageResponse shape
        }
        res.json({ image: imageUrl }); // Client expects { image: "data:image/jpeg;base64,..." } or { image: "" }
    } catch (error) {
        handleProxyError(res, error, 'adventure/generate-image');
    }
  });

  return router;
}
