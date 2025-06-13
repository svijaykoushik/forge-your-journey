import {
  AdventureOutline,
  // AdventureStage, // No longer directly used for validation here
  GameGenre,
  GeminiActionFeasibilityResponse,
  // GeminiAdventureOutlineResponse, // Expecting direct AdventureOutline
  GeminiExaminationResponse,
  // GeminiStoryResponse, // Expecting direct StorySegment
  // GeminiWorldDetailsResponse, // Expecting direct WorldDetails
  ImageGenerationQuotaError, // May still be thrown by handleServiceError
  InventoryItem,
  JsonParseError, // May still be thrown by handleServiceError
  Persona,
  StorySegment,
  WorldDetails
} from '../types';

const PROXY_REQUEST_TIMEOUT = 30000;

const fetchWithTimeout = async (
  resource: RequestInfo,
  options: RequestInit = {},
  timeout: number = PROXY_REQUEST_TIMEOUT
) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
};

const handleServiceError = (error: any, context: string): Error => {
  console.error(`Error in ${context} (client-side service):`, error);
  if (error instanceof JsonParseError || error instanceof ImageGenerationQuotaError) {
    throw error;
  }
  if (error.name === 'AbortError') {
    return new Error(`Request for ${context} timed out. Please check connection.`);
  }
  let message = `An unknown error occurred in ${context}.`;
  if (error.error && typeof error.error === 'string') {
    message = error.error;
  } else if (error.message && typeof error.message === 'string') {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  // Detect specific error types if server signals them, otherwise use generic message
  if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
    if (context === 'generateImage') { // Keep specific error for image quota
        throw new ImageGenerationQuotaError(message || 'Image generation quota has been exceeded.');
    }
    return new Error(`API quota likely exceeded for ${context}. Details: ${message}`);
  }
  if (message.includes('API Key configuration error on the server')) {
      return new Error(message);
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return new Error(`Network error for ${context}: Could not connect. Please check connection.`);
  }
  return new Error(message);
};

export const fetchAdventureOutline = async (genre: GameGenre, persona: Persona): Promise<AdventureOutline> => {
  try {
    const response = await fetchWithTimeout('/api/adventure/outline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genre, persona }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to fetch adventure outline: ${response.status}` }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    return await response.json() as AdventureOutline;
  } catch (error) {
    throw handleServiceError(error, 'fetchAdventureOutline');
  }
};

export const fetchWorldDetails = async (adventureOutline: AdventureOutline, persona: Persona, genre: GameGenre): Promise<WorldDetails> => {
  try {
    const response = await fetchWithTimeout('/api/adventure/world-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adventureOutline, persona, genre }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to fetch world details: ${response.status}` }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    return await response.json() as WorldDetails;
  } catch (error) {
    throw handleServiceError(error, 'fetchWorldDetails');
  }
};

export const fetchStorySegment = async (fullPrompt: string, isInitialScene: boolean = false): Promise<StorySegment> => {
  try {
    const response = await fetchWithTimeout('/api/adventure/story-segment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullPrompt, isInitialScene }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to fetch story segment: ${response.status}` }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    return await response.json() as StorySegment;
  } catch (error) {
    throw handleServiceError(error, 'fetchStorySegment');
  }
};

export const evaluateCustomActionFeasibility = async (
  userInputText: string, currentSegment: StorySegment, adventureOutline: AdventureOutline,
  worldDetails: WorldDetails, selectedGenre: GameGenre, selectedPersona: Persona,
  inventory: InventoryItem[], currentStageIndex: number
): Promise<GeminiActionFeasibilityResponse> => {
  try {
    const response = await fetchWithTimeout('/api/adventure/evaluate-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userInputText, currentSegment, adventureOutline, worldDetails, selectedGenre, selectedPersona, inventory, currentStageIndex }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to evaluate action feasibility: ${response.status}` }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    return await response.json() as GeminiActionFeasibilityResponse;
  } catch (error) {
    throw handleServiceError(error, 'evaluateCustomActionFeasibility');
  }
};

export const fetchCustomActionOutcome = async (
  userInputText: string, currentSegment: StorySegment, adventureOutline: AdventureOutline,
  worldDetails: WorldDetails, selectedGenre: GameGenre, selectedPersona: Persona,
  inventory: InventoryItem[], currentStageIndex: number, feasibilityContext: { wasImpossible: boolean; reasonForImpossibility?: string; suggestionIfPossible?: string; }
): Promise<StorySegment> => {
  try {
    const response = await fetchWithTimeout('/api/adventure/custom-action-outcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userInputText, currentSegment, adventureOutline, worldDetails, selectedGenre, selectedPersona, inventory, currentStageIndex, feasibilityContext }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to fetch custom action outcome: ${response.status}` }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    return await response.json() as StorySegment;
  } catch (error) {
    throw handleServiceError(error, 'fetchCustomActionOutcome');
  }
};

export const attemptToFixJson = async (faultyJsonText: string, originalPromptContext: string): Promise<StorySegment> => {
  try {
    const response = await fetchWithTimeout('/api/adventure/fix-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faultyJsonText, originalPromptContext }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to fix JSON: ${response.status}` }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    return await response.json() as StorySegment;
  } catch (error) {
    throw handleServiceError(error, 'attemptToFixJson');
  }
};

export const fetchSceneExamination = async (
  currentSceneDescription: string, adventureGenre: GameGenre, adventureOutline: AdventureOutline,
  worldDetails: WorldDetails, currentStageTitle: string, currentStageObjective: string,
  persona: Persona, inventory: InventoryItem[]
): Promise<GeminiExaminationResponse> => {
  try {
    const response = await fetchWithTimeout('/api/adventure/scene-examination', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentSceneDescription, adventureGenre, adventureOutline, worldDetails, currentStageTitle, currentStageObjective, persona, inventory }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to fetch scene examination: ${response.status}` }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    return await response.json() as GeminiExaminationResponse;
  } catch (error) {
    throw handleServiceError(error, 'fetchSceneExamination');
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await fetchWithTimeout('/api/adventure/generate-image', { // Corrected to new endpoint
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to generate image: ${response.status}` }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    const result = await response.json();
    // The server's /api/adventure/generate-image endpoint returns { image: "data:..." }
    // So, result.image is the string URL.
    if (result && typeof result.image === 'string') {
        return result.image;
    } else {
        console.warn('Image generation did not return a valid image string for prompt:', prompt, 'Result:', result);
        return ''; // Return empty string if no valid image URL
    }
  } catch (error) {
    // handleServiceError might throw ImageGenerationQuotaError if error message matches
    throw handleServiceError(error, 'generateImage');
  }
};
