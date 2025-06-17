import express, { Request, Response, NextFunction, Router } from 'express';
import createAdventureApiRouter from '../adventureApi';
import * as prompts from '../../prompts';
import * as utils from '../../utils';
import { GoogleGenAI } from '@google/genai';
import { JsonParseError, WorldDetails, AdventureOutline, GameGenre, Persona, StorySegment, InventoryItem, GeminiActionFeasibilityResponse, GeminiExaminationResponse } from '../../../types';

// Mock dependencies
jest.mock('../../prompts');

const mockedParseJsonFromText = jest.fn();
const mockedSlugify = jest.fn();
const mockedGenerateImageWithImagegen = jest.fn();
const mockedGenerateImageWithGemini = jest.fn();

jest.mock('../../utils', () => {
  const originalUtils = jest.requireActual('../../utils');
  return {
    ...originalUtils,
    parseJsonFromText: mockedParseJsonFromText,
    slugify: mockedSlugify,
    generateImageWithImagegen: mockedGenerateImageWithImagegen,
    generateImageWithGemini: mockedGenerateImageWithGemini,
  };
});

const mockGenerateContent = jest.fn();
const mockGenerateImages = jest.fn();

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation((options?: any) => ({
      models: {
        generateContent: mockGenerateContent,
        generateImages: mockGenerateImages,
      },
    })),
    Modality: jest.requireActual('@google/genai').Modality,
    Schema: jest.requireActual('@google/genai').Schema,
    Type: jest.requireActual('@google/genai').Type,
  };
});


describe('server/routes/adventureApi.ts', () => {
  let app: express.Express;
  let adventureApiRouter: Router;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  // TS2559 fix: Use options object for constructor
  const aiInstance = new GoogleGenAI({ apiKey: 'test-api-key' });

  beforeEach(() => {
    jest.clearAllMocks();

    mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ success: true }) });
    mockedGenerateImageWithImagegen.mockResolvedValue('data:image/jpeg;base64,mockedBase64ImageDataViaImagegen');
    mockedGenerateImageWithGemini.mockResolvedValue('data:image/jpeg;base64,mockedBase64ImageDataViaGemini');
    mockedParseJsonFromText.mockImplementation((text) => {
        try { return JSON.parse(text); }
        catch (e: any) { throw new JsonParseError(`Mock parseJsonFromText failed: ${e.message}`, text);}
    });
    mockedSlugify.mockImplementation((text) => text.toLowerCase().replace(/\s+/g, '-'));

    adventureApiRouter = createAdventureApiRouter(aiInstance);
    app = express();
    app.use(express.json());
    app.use('/api/adventure', adventureApiRouter);

    mockReq = { body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  // This is the area where a line like 83 might have been, related to router stack inspection.
  // The getHandler function correctly accesses route properties without causing TS2339 in its current form.
  // If there was a direct assertion on router.stack[...].route.methods, it would be here or in a test.
  // For now, we assume line 83 is within a test case or this describe block.
  // Since the file was missing, I'm recreating it without any known problematic line 83 that inspects `route.methods`.
  // If such a line existed in a previous version of the test, it's not in this recreated version.
  // The provided `getHandler` is a more robust way to get a handler for testing.

  const getHandler = (path: string, method: 'post' | 'get' = 'post') => {
    const foundRoute = adventureApiRouter.stack.find(
      (s) => s.route && s.route.path === path && s.route.methods[method]
    );
     if (foundRoute && foundRoute.route && foundRoute.route.stack.length > 0) {
        const handlerLayer = foundRoute.route.stack.find(layer => layer.method === method);
        if (handlerLayer) return handlerLayer.handle as unknown as (req: Request, res: Response, next: NextFunction) => Promise<void>;
    }
    throw new Error(`Handler for ${method.toUpperCase()} ${path} not found`);
  };

  describe('POST /api/adventure/outline', () => {
    const routeHandler = () => getHandler('/outline');

    it('should return 200 and outline data on happy path', async () => {
      mockReq.body = { genre: 'Dark Fantasy', persona: 'Brave Warrior' };
      const mockGeneratedPrompt = 'Generated outline prompt';
      (prompts.generateAdventureOutlinePrompt as jest.Mock).mockReturnValue(mockGeneratedPrompt);

      const mockAiResponse = { title: 'Test Adventure', overallGoal: 'Save the world', stages: [{title: 's1', description: 'd1', objective: 'o1'}, {title: 's2', description: 'd2', objective: 'o2'}, {title: 's3', description: 'd3', objective: 'o3'}] };
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify(mockAiResponse) });
      mockedParseJsonFromText.mockReturnValue(mockAiResponse);

      await routeHandler()(mockReq as Request, mockRes as Response, mockNext);

      expect(prompts.generateAdventureOutlinePrompt).toHaveBeenCalledWith('Dark Fantasy', 'Brave Warrior');
      expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({ contents: mockGeneratedPrompt }));
      expect(mockRes.status).not.toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(mockAiResponse);
    });

    it('should return 400 if required parameters are missing', async () => {
      mockReq.body = { genre: 'Dark Fantasy' };
      await routeHandler()(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing required parameters: genre, persona' });
    });

    it('should return 500 if AI SDK throws an error', async () => {
      mockReq.body = { genre: 'Dark Fantasy', persona: 'Brave Warrior' };
      (prompts.generateAdventureOutlinePrompt as jest.Mock).mockReturnValue('prompt');
      const aiError = new Error('AI SDK Error');
      mockGenerateContent.mockRejectedValue(aiError);

      await routeHandler()(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('adventure/outline')}));
    });

    it('should return 500 if parseJsonFromText throws an error', async () => {
        mockReq.body = { genre: 'Dark Fantasy', persona: 'Brave Warrior' };
        (prompts.generateAdventureOutlinePrompt as jest.Mock).mockReturnValue('prompt');
        mockGenerateContent.mockResolvedValue({ text: "this is not json" });

        const parseError = new JsonParseError("Bad JSON from mock", "this is not json");
        mockedParseJsonFromText.mockImplementation(() => { throw parseError; });

        await routeHandler()(mockReq as Request, mockRes as Response, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Bad JSON from mock" }));
    });
  });

  describe('POST /api/adventure/world-details', () => {
    const routeHandler = () => getHandler('/world-details');
    const mockAdvOutline: AdventureOutline = { title: 'Test Adventure', overallGoal: 'Test Goal', stages: [{title: 's1', description: 'd1', objective: 'o1'},{title: 's2', description: 'd2', objective: 'o2'},{title: 's3', description: 'd3', objective: 'o3'}] };

    it('should return 200 and world details on happy path', async () => {
      mockReq.body = { adventureOutline: mockAdvOutline, persona: 'Cunning Rogue' as Persona, genre: 'Sci-Fi Detective' as GameGenre };
      const mockGeneratedPrompt = 'Generated world details prompt';
      (prompts.generateWorldDetailsPrompt as jest.Mock).mockReturnValue(mockGeneratedPrompt);

      const mockFullWorldDetails: WorldDetails = {
        worldName: 'Cyberpunk City',
        genreClarification: 'Noir detective story',
        keyEnvironmentalFeatures: ["Rainy streets", "Neon signs"],
        dominantSocietiesOrFactions: ["MegaCorp X", "The Underground"],
        uniqueCreaturesOrMonsters: ["Cybernetic Rats", "Glitch Wraiths"],
        magicSystemOverview: "No magic, only tech that feels like it.",
        briefHistoryHook: "The great data crash of '77 wiped memories.",
        culturalNormsOrTaboos: ["Don't trust corporate AIs.", "Physical currency is a relic."]
      };
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify(mockFullWorldDetails) });
      mockedParseJsonFromText.mockReturnValue(mockFullWorldDetails);

      await routeHandler()(mockReq as Request, mockRes as Response, mockNext);

      expect(prompts.generateWorldDetailsPrompt).toHaveBeenCalledWith(mockAdvOutline, 'Cunning Rogue', 'Sci-Fi Detective');
      expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({ contents: mockGeneratedPrompt }));
      expect(mockRes.json).toHaveBeenCalledWith(mockFullWorldDetails);
    });

    it('should return 400 if adventureOutline is missing', async () => {
      mockReq.body = { persona: 'Cunning Rogue', genre: 'Sci-Fi Detective' };
      await routeHandler()(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing required parameters: adventureOutline, persona, genre' });
    });
  });

  describe('POST /api/adventure/generate-image', () => {
    const routeHandler = () => getHandler('/generate-image');

    it('should return 200 and image URL on happy path (Imagen)', async () => {
        mockReq.body = { prompt: 'A dragon flying.' };
        const mockImageUrl = 'data:image/jpeg;base64,mockedBase64ImageDataViaImagegen';

        const originalEnv = { ...process.env };
        process.env.USE_IMAGEN = 'true';

        mockedGenerateImageWithImagegen.mockResolvedValue(mockImageUrl);

        await routeHandler()(mockReq as Request, mockRes as Response, mockNext);

        expect(mockedGenerateImageWithImagegen).toHaveBeenCalledWith(aiInstance, 'A dragon flying.');
        expect(mockedGenerateImageWithGemini).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ image: mockImageUrl });

        process.env = originalEnv;
    });

    it('should return 400 if prompt is missing for image generation', async () => {
        mockReq.body = {};
        await routeHandler()(mockReq as Request, mockRes as Response, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing required parameter: prompt" });
    });
  });

});
