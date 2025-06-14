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
  AdventureStage
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
  handleProxyError,
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
    router.use((req, res, next) => { // next is not used here, but it's fine for a use() middleware
      res.status(503).json({ error: "AI Service is not available (API Key issue)." });
      // No explicit return needed as this is a middleware that ends the response
    });
    return router;
  }

  router.post('/outline', genAiLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as { genre?: GameGenre; persona?: Persona };
      const { genre, persona } = body; // Destructure after casting

      if (!genre || !persona) {
        res.status(400).json({ error: 'Missing required parameters: genre, persona' });
        return;
      }
      // genre and persona are now narrowed to GameGenre and Persona
      const prompt = generateAdventureOutlinePrompt(genre, persona);
      const result = await ai.models.generateContent({
        model: GENAI_MODEL_NAME, contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: AdventureOutlineSchema }
      });
      const outlineData = parseJsonFromText<GeminiAdventureOutlineResponse>(result.text);
      if (!outlineData || !outlineData.title || !outlineData.overallGoal || !outlineData.stages ||
          !Array.isArray(outlineData.stages) || outlineData.stages.length !== 3) {
        throw new JsonParseError("Received incomplete adventure outline.", JSON.stringify(outlineData));
      }
      outlineData.stages.forEach((stage: AdventureStage, index: number) => {
        if (!stage || typeof stage.title !== 'string' || typeof stage.description !== 'string' || typeof stage.objective !== 'string') {
          throw new JsonParseError(`Stage ${index + 1} is malformed.`, JSON.stringify(stage));
        }
      });
      res.json(outlineData);
    } catch (error) {
      handleProxyError(res, error, 'adventure/outline');
    }
  });

  router.post('/world-details', genAiLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as { adventureOutline?: AdventureOutline; persona?: Persona; genre?: GameGenre; };
      const { adventureOutline, persona, genre } = body;

      if (!adventureOutline || !persona || !genre) {
        res.status(400).json({ error: 'Missing required parameters: adventureOutline, persona, genre' });
        return;
      }
      const prompt = generateWorldDetailsPrompt(adventureOutline, persona, genre);
      const result = await ai.models.generateContent({
        model: GENAI_MODEL_NAME, contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: WorldDetailsSchema }
      });
      const worldData = parseJsonFromText<GeminiWorldDetailsResponse>(result.text);
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

  router.post('/story-segment', genAiLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as { fullPrompt?: string; isInitialScene?: boolean };
      const { fullPrompt, isInitialScene } = body;

      if (fullPrompt === undefined) {
        res.status(400).json({ error: 'Missing required parameter: fullPrompt' });
        return;
      }
      const currentFullPrompt: string = fullPrompt; // Explicitly typed for clarity after check

      const augmentedPrompt = generateStorySegmentPrompt(currentFullPrompt, isInitialScene);
      const result = await ai.models.generateContent({
        model: GENAI_MODEL_NAME, contents: augmentedPrompt,
        config: { responseMimeType: 'application/json', responseSchema: StorySegmentSchema }
      });
      const storyData = parseJsonFromText<GeminiStoryResponse>(result.text);
      if (!storyData || typeof storyData.sceneDescription !== 'string' || !Array.isArray(storyData.choices) ||
          typeof storyData.imagePrompt !== 'string' || typeof storyData.isFinalScene !== 'boolean' ||
          typeof storyData.isFailureScene !== 'boolean' || typeof storyData.isUserInputCommandOnly !== 'boolean') {
        throw new JsonParseError('Received incomplete story data.', JSON.stringify(storyData));
      }
      if (storyData.isUserInputCommandOnly && storyData.choices.length !== 0) {
        throw new JsonParseError('isUserInputCommandOnly is true but choices not empty.', JSON.stringify(storyData));
      }
      storyData.choices.forEach((choice, index) => {
          if (!choice || typeof choice.text !== 'string' || typeof choice.outcomePrompt !== 'string' ||
              typeof choice.signalsStageCompletion !== 'boolean' || typeof choice.leadsToFailure !== 'boolean') {
            throw new JsonParseError(`Choice ${index + 1} is malformed.`, JSON.stringify(choice));
          }
      });
      let finalItemFound: InventoryItem | undefined = undefined;
      if (storyData.itemFound && typeof storyData.itemFound.name === 'string' && typeof storyData.itemFound.description === 'string') {
        finalItemFound = {
            id: slugify(storyData.itemFound.name), name: storyData.itemFound.name, description: storyData.itemFound.description,
        };
      }
      const responseSegment: StorySegment = {
        sceneDescription: storyData.sceneDescription, choices: storyData.choices || [], imagePrompt: storyData.imagePrompt,
        isFinalScene: storyData.isFinalScene, isFailureScene: storyData.isFailureScene,
        isUserInputCommandOnly: storyData.isUserInputCommandOnly, itemFound: finalItemFound,
      };
      res.json(responseSegment);
    } catch (error) {
      handleProxyError(res, error, 'adventure/story-segment');
    }
  });

  router.post('/evaluate-action', genAiLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
      const { userInputText, currentSegment, adventureOutline, worldDetails, selectedGenre, selectedPersona, inventory, currentStageIndex } =
        req.body as {
          userInputText?: string; currentSegment?: StorySegment; adventureOutline?: AdventureOutline;
          worldDetails?: WorldDetails; selectedGenre?: GameGenre; selectedPersona?: Persona;
          inventory?: InventoryItem[]; currentStageIndex?: number;
        };
      if (userInputText === undefined || !currentSegment || !adventureOutline || !worldDetails ||
          !selectedGenre || !selectedPersona || inventory === undefined || currentStageIndex === undefined) {
        res.status(400).json({ error: 'Missing one or more required parameters for evaluate-action' });
        return;
      }
      // All parameters are now narrowed after the check
      const prompt = generateActionFeasibilityPrompt(userInputText, currentSegment, adventureOutline, worldDetails, selectedGenre, selectedPersona, inventory, currentStageIndex);
      const result = await ai.models.generateContent({
        model: GENAI_MODEL_NAME, contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: ActionFeasibilitySchema }
      });
      const feasibilityData = parseJsonFromText<GeminiActionFeasibilityResponse>(result.text);
      if (typeof feasibilityData.isPossible !== 'boolean' || typeof feasibilityData.reason !== 'string') {
        throw new JsonParseError('Received incomplete action feasibility data.', JSON.stringify(feasibilityData));
      }
      res.json(feasibilityData);
    } catch (error) {
      handleProxyError(res, error, 'adventure/evaluate-action');
    }
  });

  router.post('/custom-action-outcome', genAiLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
      const {userInputText, currentSegment, adventureOutline, worldDetails, selectedGenre, selectedPersona, inventory, currentStageIndex, feasibilityContext } =
        req.body as {
          userInputText?: string; currentSegment?: StorySegment; adventureOutline?: AdventureOutline;
          worldDetails?: WorldDetails; selectedGenre?: GameGenre; selectedPersona?: Persona;
          inventory?: InventoryItem[]; currentStageIndex?: number;
          feasibilityContext?: { wasImpossible: boolean; reasonForImpossibility?: string; suggestionIfPossible?: string; };
        };
      if (userInputText === undefined || !currentSegment || !adventureOutline || !worldDetails ||
          !selectedGenre || !selectedPersona || inventory === undefined ||
          currentStageIndex === undefined || !feasibilityContext) {
        res.status(400).json({ error: 'Missing one or more required parameters for custom-action-outcome' });
        return;
      }
      // All parameters are now narrowed
      const prompt = generateCustomActionOutcomePrompt(userInputText, currentSegment, adventureOutline, worldDetails, selectedGenre, selectedPersona, inventory, currentStageIndex, feasibilityContext);
      const result = await ai.models.generateContent({
        model: GENAI_MODEL_NAME, contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: StorySegmentSchema }
      });
      const storyData = parseJsonFromText<GeminiStoryResponse>(result.text);
      if (!storyData || typeof storyData.sceneDescription !== 'string' || !Array.isArray(storyData.choices) ||
          typeof storyData.imagePrompt !== 'string' || typeof storyData.isFinalScene !== 'boolean' ||
          typeof storyData.isFailureScene !== 'boolean' || typeof storyData.isUserInputCommandOnly !== 'boolean') {
        throw new JsonParseError('Received incomplete story data for custom action.', JSON.stringify(storyData));
      }
      let finalItemFound: InventoryItem | undefined = undefined;
      if (storyData.itemFound && typeof storyData.itemFound.name === 'string' && typeof storyData.itemFound.description === 'string') {
        finalItemFound = {
            id: slugify(storyData.itemFound.name), name: storyData.itemFound.name, description: storyData.itemFound.description,
        };
      }
      const responseSegment: StorySegment = {
        sceneDescription: storyData.sceneDescription, choices: storyData.choices || [], imagePrompt: storyData.imagePrompt,
        isFinalScene: storyData.isFinalScene, isFailureScene: storyData.isFailureScene,
        isUserInputCommandOnly: storyData.isUserInputCommandOnly, itemFound: finalItemFound,
      };
      res.json(responseSegment);
    } catch (error) {
      handleProxyError(res, error, 'adventure/custom-action-outcome');
    }
  });

  router.post('/fix-json', genAiLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
      const { faultyJsonText, originalPromptContext } = req.body as { faultyJsonText?: string; originalPromptContext?: string; };
      if (faultyJsonText === undefined || originalPromptContext === undefined) {
        res.status(400).json({ error: 'Missing required parameters: faultyJsonText, originalPromptContext' });
        return;
      }
      // Types are now narrowed
      const fixPrompt = generateAttemptToFixJsonPrompt(faultyJsonText, originalPromptContext);
      const result = await ai.models.generateContent({
        model: GENAI_MODEL_NAME, contents: fixPrompt,
        config: { responseMimeType: 'application/json' }
      });
      const storyData = parseJsonFromText<GeminiStoryResponse>(result.text, true);
       if (!storyData || typeof storyData.sceneDescription !== 'string' || !Array.isArray(storyData.choices) ||
          typeof storyData.imagePrompt !== 'string' || typeof storyData.isFinalScene !== 'boolean' ||
          typeof storyData.isFailureScene !== 'boolean' || typeof storyData.isUserInputCommandOnly !== 'boolean') {
        throw new JsonParseError('Received incomplete story data after fix attempt.', JSON.stringify(storyData));
      }
      let finalItemFound: InventoryItem | undefined = undefined;
      if (storyData.itemFound && typeof storyData.itemFound.name === 'string' && typeof storyData.itemFound.description === 'string') {
        finalItemFound = {
            id: slugify(storyData.itemFound.name), name: storyData.itemFound.name, description: storyData.itemFound.description,
        };
      }
       const responseSegment: StorySegment = {
        sceneDescription: storyData.sceneDescription, choices: storyData.choices || [], imagePrompt: storyData.imagePrompt,
        isFinalScene: storyData.isFinalScene, isFailureScene: storyData.isFailureScene,
        isUserInputCommandOnly: storyData.isUserInputCommandOnly, itemFound: finalItemFound,
      };
      res.json(responseSegment);
    } catch (error) {
      handleProxyError(res, error, 'adventure/fix-json');
    }
  });

  router.post('/scene-examination', genAiLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
      const { currentSceneDescription, adventureGenre, adventureOutline, worldDetails, currentStageTitle, currentStageObjective, persona, inventory } =
        req.body as {
          currentSceneDescription?: string; adventureGenre?: GameGenre; adventureOutline?: AdventureOutline;
          worldDetails?: WorldDetails; currentStageTitle?: string; currentStageObjective?: string;
          persona?: Persona; inventory?: InventoryItem[];
        };
      if (currentSceneDescription === undefined || !adventureGenre || !adventureOutline || !worldDetails ||
          currentStageTitle === undefined || currentStageObjective === undefined || !persona || inventory === undefined) {
        res.status(400).json({ error: 'Missing one or more required parameters for scene-examination' });
        return;
      }
      // Types are now narrowed
      const prompt = generateSceneExaminationPrompt(currentSceneDescription, adventureGenre, adventureOutline, worldDetails, currentStageTitle, currentStageObjective, persona, inventory);
      const result = await ai.models.generateContent({
        model: GENAI_MODEL_NAME, contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: ExaminationSchema }
      });
      const examinationData = parseJsonFromText<GeminiExaminationResponse>(result.text);
      if (!examinationData || typeof examinationData.examinationText !== 'string' || examinationData.examinationText.trim() === '') {
        throw new JsonParseError("Received incomplete examination data.", JSON.stringify(examinationData));
      }
      res.json(examinationData);
    } catch (error) {
      handleProxyError(res, error, 'adventure/scene-examination');
    }
  });

  router.post('/generate-image', genAiLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        const { prompt: promptBody } = req.body as { prompt?: string };
        if (promptBody === undefined) {
            res.status(400).json({ error: "Missing required parameter: prompt" });
            return;
        }
        const currentPromptBody: string = promptBody; // Narrowed type
        let imageUrl = '';
        if (USE_IMAGEN) {
            imageUrl = await generateImageWithImagegen(ai, currentPromptBody);
        } else {
            imageUrl = await generateImageWithGemini(ai, currentPromptBody);
        }
        if (!imageUrl) {
          console.warn(`Image generation for prompt "${currentPromptBody}" resulted in an empty URL/string.`);
        }
        res.json({ image: imageUrl });
    } catch (error) {
        handleProxyError(res, error, 'adventure/generate-image');
    }
  });

  return router;
}
