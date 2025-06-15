import {
  AdventureOutline,
  GameGenre,
  Persona,
  WorldDetails,
  StorySegment,
  InventoryItem,
  GeminiActionFeasibilityResponse,
  GeminiExaminationResponse,
  ImageGenerationQuotaError, // For handleServiceError
  JsonParseError,           // For handleServiceError
  // The following are response types from server, not directly constructed here
  // GeminiAdventureOutlineResponse,
  // GeminiStoryResponse,
  // GeminiWorldDetailsResponse,
} from '../types'; // Assuming types.ts is in the parent directory

const PROXY_REQUEST_TIMEOUT = 30000;

// fetchWithTimeout remains a client-side utility for API calls
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

// handleServiceError is simplified for client-side error interpretation
const handleServiceError = (error: any, context: string): Error => {
  console.error(`Error in ${context} (client-side service):`, error);

  // If the error is already one of our specific client-side error types, re-throw it.
  // This can happen if the fetch logic itself constructs and throws these.
  if (error instanceof JsonParseError || error instanceof ImageGenerationQuotaError) {
    throw error;
  }

  // Handle AbortError for timeouts
  if (error.name === 'AbortError') {
    return new Error(`Request for ${context} timed out. Please check your connection.`);
  }

  // Process error messages that might have been passed from the server
  // (e.g., from the error object created when response.ok was false)
  let message = `An unknown error occurred in ${context}.`;
  let status = error.status || null; // Preserve status if attached

  if (error.message) { // Prioritize error.message if it exists
    message = error.message;
  } else if (error.error && typeof error.error === 'string') { // Check for { error: "message" } structure
    message = error.error;
  } else if (typeof error === 'string') { // If a string was thrown
    message = error;
  }

  // Check for specific error conditions based on message content or status
  // This allows the client to still throw specific error types if desired,
  // based on how the server formats its errors.
  if ( (status === 429 || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) && context === 'generateImage') {
    throw new ImageGenerationQuotaError(message || 'Image generation quota has been exceeded.');
  }
   if ( (status === 429 || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) ) {
    return new Error(`API quota likely exceeded for ${context}. Details: ${message}`);
  }


  if (message.includes('API Key configuration error on the server')) {
    return new Error(message); // Server already formatted this well
  }
  // Standard "Failed to fetch" or network errors
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return new Error(`Network error for ${context}: Could not connect. Please check your connection.`);
  }

  // For other errors that came from a non-ok server response, message might already be well-formed.
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
      const errorData = await response.json().catch(() => ({
        error: `Failed to fetch adventure outline. Status: ${response.status} ${response.statusText || ''}`.trim()
      }));
      const err = new Error(errorData.error);
      (err as any).status = response.status;
      throw err;
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
      const errorData = await response.json().catch(() => ({
        error: `Failed to fetch world details. Status: ${response.status} ${response.statusText || ''}`.trim()
      }));
      const err = new Error(errorData.error);
      (err as any).status = response.status;
      throw err;
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
      const errorData = await response.json().catch(() => ({
        error: `Failed to fetch story segment. Status: ${response.status} ${response.statusText || ''}`.trim()
      }));
      const err = new Error(errorData.error);
      (err as any).status = response.status;
      throw err;
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
      const errorData = await response.json().catch(() => ({
        error: `Failed to evaluate action. Status: ${response.status} ${response.statusText || ''}`.trim()
      }));
      const err = new Error(errorData.error);
      (err as any).status = response.status;
      throw err;
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
      const errorData = await response.json().catch(() => ({
        error: `Failed to fetch custom action outcome. Status: ${response.status} ${response.statusText || ''}`.trim()
      }));
      const err = new Error(errorData.error);
      (err as any).status = response.status;
      throw err;
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
      const errorData = await response.json().catch(() => ({
        error: `Failed to attempt JSON fix. Status: ${response.status} ${response.statusText || ''}`.trim()
      }));
      const err = new Error(errorData.error);
      (err as any).status = response.status;
      throw err;
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
      const errorData = await response.json().catch(() => ({
        error: `Failed to fetch scene examination. Status: ${response.status} ${response.statusText || ''}`.trim()
      }));
      const err = new Error(errorData.error);
      (err as any).status = response.status;
      throw err;
    }
    return await response.json() as GeminiExaminationResponse;
  } catch (error) {
    throw handleServiceError(error, 'fetchSceneExamination');
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await fetchWithTimeout('/api/adventure/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Failed to generate image. Status: ${response.status} ${response.statusText || ''}`.trim()
      }));
      const err = new Error(errorData.error);
      (err as any).status = response.status; // Pass status for handleServiceError
      throw err;
    }
    const result = await response.json();
    if (result && typeof result.image === 'string') {
        return result.image;
    } else {
        console.warn('Image generation did not return a valid image string for prompt:', prompt.substring(0,100), 'Result:', result);
        return '';
    }
  } catch (error) {
    throw handleServiceError(error, 'generateImage');
  }
};
