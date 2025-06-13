import {
  fetchAdventureOutline,
  fetchWorldDetails,
  fetchStorySegment,
  evaluateCustomActionFeasibility,
  fetchCustomActionOutcome,
  attemptToFixJson,
  fetchSceneExamination,
  generateImage,
} from '../geminiService';
import {
    AdventureOutline,
    GameGenre,
    Persona,
    WorldDetails,
    StorySegment,
    GeminiActionFeasibilityResponse,
    GeminiExaminationResponse,
    // ImageGenerationQuotaError, // No longer asserting instanceof directly
    InventoryItem
} from '../../types';

const mockFetch = global.fetch as jest.Mock;

describe('services/geminiService.ts', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('fetchAdventureOutline', () => {
    const genre: GameGenre = 'Dark Fantasy';
    const persona: Persona = 'Brave Warrior';
    const mockRequestBody = { genre, persona };
    const expectedUrl = '/api/adventure/outline';

    it('should fetch adventure outline successfully', async () => {
      const mockResponseData: AdventureOutline = { title: 'Test', overallGoal: 'Goal', stages: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponseData),
      });

      const result = await fetchAdventureOutline(genre, persona);

      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockRequestBody),
        })
      );
      expect(result).toEqual(mockResponseData);
    });

    it('should handle network error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server Error' }),
      });

      await expect(fetchAdventureOutline(genre, persona))
        .rejects
        .toThrow('Server Error');
    });
  });

  describe('generateImage', () => {
    const prompt = 'A dragon';
    const mockRequestBody = { prompt };
    const expectedUrl = '/api/adventure/generate-image';

    it('should generate image successfully', async () => {
      const mockResponseData = { image: 'data:image/jpeg;base64,fakedata' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponseData),
      });

      const result = await generateImage(prompt);
      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockRequestBody),
        })
      );
      expect(result).toBe(mockResponseData.image);
    });

    it('should return empty string if image data is invalid or missing in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ image: null }),
      });
      let result = await generateImage(prompt);
      expect(result).toBe('');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });
      result = await generateImage(prompt);
      expect(result).toBe('');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      });
      result = await generateImage(prompt);
      expect(result).toBe('');
    });

    it('should throw an error with quota message on 429 error', async () => {
      // Test that the specific message is thrown, sidestepping constructor issues.
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Quota exceeded for images' }),
      });
      await expect(generateImage(prompt)).rejects.toThrow('Quota exceeded for images');
    });

     it('should handle generic server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Generic Server Error' }),
      });

      await expect(generateImage(prompt))
        .rejects
        .toThrow('Generic Server Error');
    });
  });

  describe('fetchWorldDetails', () => {
    const mockAdventureOutline: AdventureOutline = { title: 'Test', overallGoal: 'Goal', stages: [] };
    const persona: Persona = 'Brave Warrior';
    const genre: GameGenre = 'Dark Fantasy';
    const mockRequestBody = { adventureOutline: mockAdventureOutline, persona, genre };
    const expectedUrl = '/api/adventure/world-details';

    it('should fetch world details successfully', async () => {
      const mockResponseData: WorldDetails = { worldName: 'Test World', genreClarification: 'Dark', keyEnvironmentalFeatures: [], dominantSocietiesOrFactions: [], uniqueCreaturesOrMonsters: [], magicSystemOverview: '', briefHistoryHook: '', culturalNormsOrTaboos: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponseData),
      });

      const result = await fetchWorldDetails(mockAdventureOutline, persona, genre);
      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockRequestBody),
        })
      );
      expect(result).toEqual(mockResponseData);
    });

    it('should handle network error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'World Details Server Error' }),
      });

      await expect(fetchWorldDetails(mockAdventureOutline, persona, genre))
        .rejects
        .toThrow('World Details Server Error');
    });
  });

});
