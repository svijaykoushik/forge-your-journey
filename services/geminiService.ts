import { Schema, Type } from '@google/genai'; // Kept for schema definitions used in request payloads
import {
  AdventureOutline,
  AdventureStage,
  GeminiActionFeasibilityResponse,
  GeminiAdventureOutlineResponse,
  GeminiExaminationResponse,
  GeminiStoryResponse,
  GeminiWorldDetailsResponse,
  genrePersonaDetails,
  GenreSpecificPersonaDetails,
  ImageGenerationQuotaError,
  InventoryItem,
  JsonParseError,
  Persona,
  StorySegment,
  WorldDetails
} from '../types';

const GENAI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';
const IMAGEN_MODEL_NAME = 'imagen-3.0-generate-002';
const GEMINI_IMAGE_MODEL_NAME = 'gemini-2.0-flash-preview-image-generation';

const PROXY_REQUEST_TIMEOUT = 30000; // 30 seconds for proxy requests

// --- Schema Definitions ---
const AdventureOutlineStageSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Title for the stage.' },
    description: {
      type: Type.STRING,
      description: 'A brief overview of what happens in this stage.'
    },
    objective: {
      type: Type.STRING,
      description: "The player's main objective to complete this stage."
    }
  },
  required: ['title', 'description', 'objective']
};

const AdventureOutlineSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'A captivating title for the adventure.'
    },
    overallGoal: {
      type: Type.STRING,
      description: 'A concise description of the ultimate goal.'
    },
    stages: {
      type: Type.ARRAY,
      description: 'An array of 3 main stages or acts.',
      items: AdventureOutlineStageSchema
    }
  },
  required: ['title', 'overallGoal', 'stages']
};

const WorldDetailsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    worldName: {
      type: Type.STRING,
      description: 'A unique and evocative name for this game world or region.'
    },
    genreClarification: {
      type: Type.STRING,
      description: 'A more specific clarification of the genre.'
    },
    keyEnvironmentalFeatures: {
      type: Type.ARRAY,
      description:
        'List 2-3 distinct and striking environmental features or geographical oddities.',
      items: { type: Type.STRING }
    },
    dominantSocietiesOrFactions: {
      type: Type.ARRAY,
      description:
        'Describe 1-2 major societies, factions, or sentient species.',
      items: { type: Type.STRING }
    },
    uniqueCreaturesOrMonsters: {
      type: Type.ARRAY,
      description:
        'Name and briefly describe 1-2 unique creatures or monsters.',
      items: { type: Type.STRING }
    },
    magicSystemOverview: {
      type: Type.STRING,
      description: 'Briefly describe the nature of magic in this world.'
    },
    briefHistoryHook: {
      type: Type.STRING,
      description:
        'A short, intriguing piece of history or lore relevant to the adventure.'
    },
    culturalNormsOrTaboos: {
      type: Type.ARRAY,
      description:
        'List 1-2 significant cultural norms, traditions, or taboos.',
      items: { type: Type.STRING }
    }
  },
  required: [
    'worldName',
    'genreClarification',
    'keyEnvironmentalFeatures',
    'dominantSocietiesOrFactions',
    'uniqueCreaturesOrMonsters',
    'magicSystemOverview',
    'briefHistoryHook',
    'culturalNormsOrTaboos'
  ]
};

const StorySegmentChoiceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING, description: 'Player-facing choice text.' },
    outcomePrompt: {
      type: Type.STRING,
      description: 'AI instruction for the next scene if this choice is picked.'
    },
    signalsStageCompletion: {
      type: Type.BOOLEAN,
      description:
        'True if this choice DIRECTLY completes the current stage objective.'
    },
    leadsToFailure: {
      type: Type.BOOLEAN,
      description: 'True if this choice leadsTo definitive game failure.'
    }
  },
  required: [
    'text',
    'outcomePrompt',
    'signalsStageCompletion',
    'leadsToFailure'
  ]
};

const StorySegmentItemFoundSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'Name of the item found.' },
    description: {
      type: Type.STRING,
      description: 'Description of the item found.'
    }
  },
  required: ['name', 'description']
};

const StorySegmentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sceneDescription: {
      type: Type.STRING,
      description:
        'Narrative text describing the current situation. Should be 2-3 short paragraphs, with varied sentences. Paragraphs separated by a double newline character (\\n\\n) in the string.'
    },
    choices: {
      type: Type.ARRAY,
      description:
        'Array of choice objects. Empty if isUserInputCommandOnly is true.',
      items: StorySegmentChoiceSchema
    },
    imagePrompt: {
      type: Type.STRING,
      description:
        'A text prompt for Imagen to generate a visual for the scene.'
    },
    isFinalScene: {
      type: Type.BOOLEAN,
      description:
        'True if this scene represents the SUCCESSFUL conclusion of the ENTIRE adventure.'
    },
    isFailureScene: {
      type: Type.BOOLEAN,
      description: 'True if this scene itself IS the game failure narration.'
    },
    itemFound: {
      ...StorySegmentItemFoundSchema,
      nullable: true,
      description:
        'Details of any item discovered in this scene. Omit if no item is found.'
    },
    isUserInputCommandOnly: {
      type: Type.BOOLEAN,
      description:
        'True if no predefined choices are given, and the player is expected to provide a custom action.'
    }
  },
  required: [
    'sceneDescription',
    'choices',
    'imagePrompt',
    'isFinalScene',
    'isFailureScene',
    'isUserInputCommandOnly'
  ]
};

const ExaminationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    examinationText: {
      type: Type.STRING,
      description:
        'A detailed description of the scene upon closer examination, revealing specific details/lore/clues. Should be 2-4 sentences long, concise, with varied sentence structures.'
    }
  },
  required: ['examinationText']
};

const ActionFeasibilitySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isPossible: {
      type: Type.BOOLEAN,
      description:
        "True if the action is plausible, sensible, and can be attempted within the game's context and rules. False if it's impossible, nonsensical, breaks established world rules, or is clearly out of character/genre."
    },
    reason: {
      type: Type.STRING,
      description:
        "A concise explanation. If 'isPossible' is false, explain clearly why the action cannot be performed or is nonsensical. If 'isPossible' is true, briefly state why or how it's plausible, or what aspect it might affect."
    },
    suggestedOutcomeSummaryIfPossible: {
      type: Type.STRING,
      nullable: true,
      description:
        "If 'isPossible' is true, provide a very brief (1-2 sentence) summary of the likely immediate consequence or next step. Omit if 'isPossible' is false or if the outcome is too complex for a brief summary."
    }
  },
  required: ['isPossible', 'reason']
};
// --- End of Schema Definitions ---

const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

const parseJsonFromText = <T>(
  text: string,
  isFixAttempt: boolean = false
): T => {
  let jsonStr = text.trim();
  const fenceRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);

  if (match && match[1]) {
    jsonStr = match[1].trim();
  } else {
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    const firstBracket = jsonStr.indexOf('[');
    const lastBracket = jsonStr.lastIndexOf(']');
    let potentialJson = '';

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      potentialJson = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    if (firstBracket !== -1 && lastBracket > firstBracket) {
      const potentialArrayJson = jsonStr.substring(
        firstBracket,
        lastBracket + 1
      );
      if (
        potentialJson.length === 0 ||
        potentialArrayJson.length > potentialJson.length ||
        (firstBracket < firstBrace &&
          lastBracket > lastBrace &&
          firstBrace !== -1) ||
        firstBrace === -1
      ) {
        potentialJson = potentialArrayJson;
      }
    }

    if (potentialJson) {
      jsonStr = potentialJson;
    }
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch (e: any) {
    console.error('JSON PARSING ERROR DETAILS:');
    console.error('Original text received (trimmed):', text);
    console.error('String attempted for JSON.parse:', jsonStr);
    console.error('Parser error:', e.message);

    let detailedError = `Failed to parse JSON from response. The AI or proxy may not have strictly adhered to the JSON format.`;
    if (isFixAttempt) {
      detailedError = `AI failed to correct the JSON format. ${detailedError}`;
    }
    if (jsonStr.length < 250) {
      detailedError += ` Attempted content: "${jsonStr}"`;
    } else {
      detailedError += ` Attempted content snippet (start and end): "${jsonStr.substring(0, 120)}...${jsonStr.substring(jsonStr.length - 120)}"`;
    }
    if (e.message) {
      detailedError += ` | Parser error: ${e.message}`;
    }
    throw new JsonParseError(detailedError, text);
  }
};

const fetchWithTimeout = async (
  resource: RequestInfo,
  options: RequestInit = {},
  timeout: number = PROXY_REQUEST_TIMEOUT
) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(id);
  return response;
};

const handleServiceError = (error: any, context: string): Error => {
  console.error(`Error in ${context} (from proxy or client-side):`, error);

  if (
    error instanceof JsonParseError ||
    error instanceof ImageGenerationQuotaError
  ) {
    throw error;
  }

  if (error.name === 'AbortError') {
    // Specifically handle AbortError for timeouts
    return new Error(
      `The request to the game server (proxy) for ${context} timed out. Please check your connection or try again later.`
    );
  }

  let message = `An unknown error occurred in ${context}.`;
  let isQuotaError = false;

  if (error.error && typeof error.error === 'string') {
    // Structure from proxy's error response
    message = error.error;
    if (
      message.includes('quota') ||
      message.includes('RESOURCE_EXHAUSTED') ||
      message.includes('429')
    ) {
      isQuotaError = true;
    }
    if (message.includes('API Key configuration error on the server')) {
      return new Error(message);
    }
  } else if (error.message && typeof error.message === 'string') {
    // Standard Error object
    message = error.message;
    if (
      message.includes('Failed to fetch') ||
      message.includes('NetworkError')
    ) {
      message = `Network error: Could not connect to the game server (proxy) for ${context}. Please check your connection.`;
    }
  } else if (typeof error === 'string') {
    message = error;
  }

  if (isQuotaError) {
    if (context === 'generateImage') {
      throw new ImageGenerationQuotaError(
        message || 'Image generation quota has been exceeded.'
      );
    }
    return new Error(
      `API quota likely exceeded for ${context}. Details: ${message}`
    );
  }

  return new Error(message);
};

export const fetchAdventureOutline = async (
  genre: keyof GenreSpecificPersonaDetails,
  persona: Persona
): Promise<AdventureOutline> => {
  const payload = {
    genre,
    persona
  };

  try {
    const response = await fetchWithTimeout(`/api/adventure/outline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Proxy request for outline failed: ${response.status} ${response.statusText}`
      }));
      throw errorData;
    }
    const responseData = await response.json();
    if (!responseData.text)
      throw new JsonParseError(
        "Proxy response for outline missing 'text' field.",
        JSON.stringify(responseData)
      );
    const outlineData = parseJsonFromText<GeminiAdventureOutlineResponse>(
      responseData.text
    );

    if (
      !outlineData ||
      !outlineData.title ||
      !outlineData.overallGoal ||
      !outlineData.stages ||
      !Array.isArray(outlineData.stages) ||
      outlineData.stages.length !== 3
    ) {
      console.error(
        'Invalid adventure outline structure received:',
        outlineData
      );
      throw new Error(
        "Received incomplete adventure outline. Essential fields missing or 'stages' is not a valid 3-element array."
      );
    }
    outlineData.stages.forEach((stage: AdventureStage, index: number) => {
      if (
        !stage ||
        typeof stage.title !== 'string' ||
        typeof stage.description !== 'string' ||
        typeof stage.objective !== 'string'
      ) {
        console.error(`Malformed stage at index ${index}:`, stage);
        throw new Error(
          `Stage ${index + 1} in the adventure outline is malformed.`
        );
      }
    });
    return outlineData;
  } catch (error) {
    throw handleServiceError(error, 'fetchAdventureOutline');
  }
};

export const fetchWorldDetails = async (
  adventureOutline: AdventureOutline,
  persona: Persona,
  genre: keyof GenreSpecificPersonaDetails
): Promise<WorldDetails> => {
  const payload = {
    adventureOutline,
    persona,
    genre
  };

  try {
    const response = await fetchWithTimeout(`/api/adventure/world-details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Proxy request for world details failed: ${response.status} ${response.statusText}`
      }));
      throw errorData;
    }
    const responseData = await response.json();
    if (!responseData.text)
      throw new JsonParseError(
        "Proxy response for world details missing 'text' field.",
        JSON.stringify(responseData)
      );
    const worldData = parseJsonFromText<GeminiWorldDetailsResponse>(
      responseData.text
    );

    if (
      !worldData ||
      typeof worldData.worldName !== 'string' ||
      worldData.worldName.trim() === '' ||
      !Array.isArray(worldData.keyEnvironmentalFeatures) ||
      !Array.isArray(worldData.dominantSocietiesOrFactions) ||
      !Array.isArray(worldData.uniqueCreaturesOrMonsters) ||
      typeof worldData.magicSystemOverview !== 'string' ||
      typeof worldData.briefHistoryHook !== 'string' ||
      !Array.isArray(worldData.culturalNormsOrTaboos)
    ) {
      console.error('Invalid world details structure received:', worldData);
      throw new Error('Received incomplete or malformed world details.');
    }
    return worldData;
  } catch (error) {
    throw handleServiceError(error, 'fetchWorldDetails');
  }
};

export const fetchStorySegment = async (
  fullPrompt: string,
  isInitialScene: boolean = false
): Promise<StorySegment> => {
  const payload = {
    fullPrompt,
    isInitialScene
  };

  try {
    const response = await fetchWithTimeout(`/api/adventure/story-segment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Proxy request for story segment failed: ${response.status} ${response.statusText}`
      }));
      throw errorData;
    }
    const responseData = await response.json();
    if (!responseData.text)
      throw new JsonParseError(
        "Proxy response for story segment missing 'text' field.",
        JSON.stringify(responseData)
      );
    const storyData = parseJsonFromText<GeminiStoryResponse>(responseData.text);

    if (
      !storyData ||
      typeof storyData.sceneDescription !== 'string' ||
      !Array.isArray(storyData.choices) ||
      typeof storyData.imagePrompt !== 'string' ||
      typeof storyData.isFinalScene !== 'boolean' ||
      typeof storyData.isFailureScene !== 'boolean' ||
      typeof storyData.isUserInputCommandOnly !== 'boolean'
    ) {
      console.error('Invalid story data structure received:', storyData);
      throw new Error('Received incomplete or malformed story data.');
    }
    if (
      storyData.isUserInputCommandOnly === true &&
      storyData.choices.length !== 0
    ) {
      console.error(
        'Inconsistency: isUserInputCommandOnly is true but choices array is not empty:',
        storyData
      );
      throw new Error(
        'AI returned isUserInputCommandOnly=true but provided choices.'
      );
    }

    if (storyData.choices) {
      storyData.choices.forEach((choice, index) => {
        if (
          !choice ||
          typeof choice.text !== 'string' ||
          typeof choice.outcomePrompt !== 'string' ||
          typeof choice.signalsStageCompletion !== 'boolean' ||
          typeof choice.leadsToFailure !== 'boolean'
        ) {
          console.error(`Malformed choice at index ${index}:`, choice);
          throw new Error(`Choice ${index + 1} is malformed.`);
        }
      });
    }

    let foundItem: InventoryItem | undefined = undefined;
    if (storyData.itemFound) {
      if (
        typeof storyData.itemFound.name === 'string' &&
        typeof storyData.itemFound.description === 'string' &&
        storyData.itemFound.name.trim() !== ''
      ) {
        foundItem = {
          id: slugify(storyData.itemFound.name),
          name: storyData.itemFound.name.trim(),
          description: storyData.itemFound.description.trim()
        };
      } else {
        console.warn(
          'Received itemFound field with invalid structure or empty name:',
          storyData.itemFound
        );
      }
    }

    return {
      sceneDescription: storyData.sceneDescription,
      choices: storyData.choices || [],
      imagePrompt: storyData.imagePrompt,
      isFinalScene: storyData.isFinalScene,
      isFailureScene: storyData.isFailureScene,
      isUserInputCommandOnly: storyData.isUserInputCommandOnly,
      itemFound: foundItem
    };
  } catch (error) {
    throw handleServiceError(error, 'fetchStorySegment');
  }
};

export const evaluateCustomActionFeasibility = async (
  userInputText: string,
  currentSegment: StorySegment,
  adventureOutline: AdventureOutline,
  worldDetails: WorldDetails,
  selectedGenre: keyof GenreSpecificPersonaDetails,
  selectedPersona: Persona,
  inventory: InventoryItem[],
  currentStageIndex: number
): Promise<GeminiActionFeasibilityResponse> => {
  const payload = {
    userInputText,
    currentSegment,
    adventureOutline,
    worldDetails,
    selectedGenre,
    selectedPersona,
    inventory,
    currentStageIndex
  };

  try {
    const response = await fetchWithTimeout(
      `/api/adventure/custom-action/evaluation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Proxy request for action feasibility failed: ${response.status} ${response.statusText}`
      }));
      throw errorData;
    }
    const responseData = await response.json();
    if (!responseData.text)
      throw new JsonParseError(
        "Proxy response for action feasibility missing 'text' field.",
        JSON.stringify(responseData)
      );
    const feasibilityData = parseJsonFromText<GeminiActionFeasibilityResponse>(
      responseData.text
    );

    if (
      typeof feasibilityData.isPossible !== 'boolean' ||
      typeof feasibilityData.reason !== 'string'
    ) {
      console.error(
        'Invalid action feasibility structure received:',
        feasibilityData
      );
      throw new Error(
        'Received incomplete or malformed action feasibility data.'
      );
    }
    return feasibilityData;
  } catch (error) {
    throw handleServiceError(error, 'evaluateCustomActionFeasibility');
  }
};

export const fetchCustomActionOutcome = async (
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
): Promise<StorySegment> => {
  const payload = {
    userInputText,
    currentSegment,
    adventureOutline,
    worldDetails,
    selectedGenre,
    selectedPersona,
    inventory,
    currentStageIndex,
    feasibilityContext
  };

  try {
    const response = await fetchWithTimeout(
      `/api/adventure/custom-action/outcome`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Proxy request for custom action outcome failed: ${response.status} ${response.statusText}`
      }));
      throw errorData;
    }
    const responseData = await response.json();
    if (!responseData.text)
      throw new JsonParseError(
        "Proxy response for custom action outcome missing 'text' field.",
        JSON.stringify(responseData)
      );
    const storyData = parseJsonFromText<GeminiStoryResponse>(responseData.text);

    if (
      !storyData ||
      typeof storyData.sceneDescription !== 'string' ||
      !Array.isArray(storyData.choices) ||
      typeof storyData.imagePrompt !== 'string' ||
      typeof storyData.isFinalScene !== 'boolean' ||
      typeof storyData.isFailureScene !== 'boolean' ||
      typeof storyData.isUserInputCommandOnly !== 'boolean'
    ) {
      console.error(
        'Invalid custom action outcome structure received:',
        storyData
      );
      throw new Error(
        'Received incomplete or malformed story data for custom action outcome.'
      );
    }
    if (
      storyData.isUserInputCommandOnly === true &&
      storyData.choices.length !== 0
    ) {
      console.error(
        'Inconsistency (custom action outcome): isUserInputCommandOnly is true but choices array is not empty:',
        storyData
      );
      throw new Error(
        'AI returned isUserInputCommandOnly=true but provided choices for custom action outcome.'
      );
    }
    if (storyData.choices) {
      storyData.choices.forEach((choice, index) => {
        if (
          !choice ||
          typeof choice.text !== 'string' ||
          typeof choice.outcomePrompt !== 'string' ||
          typeof choice.signalsStageCompletion !== 'boolean' ||
          typeof choice.leadsToFailure !== 'boolean'
        ) {
          console.error(
            `Malformed choice at index ${index} in custom action outcome response:`,
            choice
          );
          throw new Error(
            `Choice ${index + 1} (custom action outcome) is malformed.`
          );
        }
      });
    }

    let foundItem: InventoryItem | undefined = undefined;
    if (storyData.itemFound) {
      if (
        typeof storyData.itemFound.name === 'string' &&
        typeof storyData.itemFound.description === 'string' &&
        storyData.itemFound.name.trim() !== ''
      ) {
        foundItem = {
          id: slugify(storyData.itemFound.name),
          name: storyData.itemFound.name.trim(),
          description: storyData.itemFound.description.trim()
        };
      }
    }

    return {
      sceneDescription: storyData.sceneDescription,
      choices: storyData.choices || [],
      imagePrompt: storyData.imagePrompt,
      isFinalScene: storyData.isFinalScene,
      isFailureScene: storyData.isFailureScene,
      isUserInputCommandOnly: storyData.isUserInputCommandOnly,
      itemFound: foundItem
    };
  } catch (error) {
    throw handleServiceError(error, 'fetchCustomActionOutcome');
  }
};

export const attemptToFixJson = async (
  faultyJsonText: string,
  originalPromptContext: string
): Promise<StorySegment> => {
  const payload = {
    faultyJsonText,
    originalPromptContext
  };

  try {
    const response = await fetchWithTimeout(`/api/json-tools/fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Proxy request for JSON fix failed: ${response.status} ${response.statusText}`
      }));
      throw errorData;
    }
    const responseData = await response.json();
    if (!responseData.text)
      throw new JsonParseError(
        "Proxy response for JSON fix missing 'text' field.",
        JSON.stringify(responseData)
      );
    const storyData = parseJsonFromText<GeminiStoryResponse>(
      responseData.text,
      true
    ); // isFixAttempt = true

    if (
      !storyData ||
      typeof storyData.sceneDescription !== 'string' ||
      !Array.isArray(storyData.choices) ||
      typeof storyData.imagePrompt !== 'string' ||
      typeof storyData.isFinalScene !== 'boolean' ||
      typeof storyData.isFailureScene !== 'boolean' ||
      typeof storyData.isUserInputCommandOnly !== 'boolean'
    ) {
      console.error(
        'Invalid story data structure received after fix attempt:',
        storyData
      );
      throw new Error(
        'Received incomplete or malformed story data after fix attempt.'
      );
    }
    if (storyData.choices) {
      storyData.choices.forEach((choice, index) => {
        if (
          !choice ||
          typeof choice.text !== 'string' ||
          typeof choice.outcomePrompt !== 'string' ||
          typeof choice.signalsStageCompletion !== 'boolean' ||
          typeof choice.leadsToFailure !== 'boolean'
        ) {
          console.error(
            `Malformed choice at index ${index} after fix attempt:`,
            choice
          );
          throw new Error(`Choice ${index + 1} (post-fix) is malformed.`);
        }
      });
    }

    let foundItem: InventoryItem | undefined = undefined;
    if (storyData.itemFound) {
      if (
        typeof storyData.itemFound.name === 'string' &&
        typeof storyData.itemFound.description === 'string' &&
        storyData.itemFound.name.trim() !== ''
      ) {
        foundItem = {
          id: slugify(storyData.itemFound.name),
          name: storyData.itemFound.name.trim(),
          description: storyData.itemFound.description.trim()
        };
      } else {
        console.warn(
          'Received itemFound field with invalid structure or empty name after fix attempt:',
          storyData.itemFound
        );
      }
    }

    return {
      sceneDescription: storyData.sceneDescription,
      choices: storyData.choices || [],
      imagePrompt: storyData.imagePrompt,
      isFinalScene: storyData.isFinalScene,
      isFailureScene: storyData.isFailureScene,
      isUserInputCommandOnly: storyData.isUserInputCommandOnly,
      itemFound: foundItem
    };
  } catch (error) {
    throw handleServiceError(error, 'attemptToFixJson');
  }
};

export const fetchSceneExamination = async (
  currentSceneDescription: string,
  adventureGenre: keyof GenreSpecificPersonaDetails,
  adventureOutline: AdventureOutline,
  worldDetails: WorldDetails,
  currentStageTitle: string,
  currentStageObjective: string,
  persona: Persona,
  inventory: InventoryItem[]
): Promise<GeminiExaminationResponse> => {
  const payload = {
    currentSceneDescription,
    adventureGenre,
    adventureOutline,
    worldDetails,
    currentStageTitle,
    currentStageObjective,
    persona,
    inventory
  };

  try {
    const response = await fetchWithTimeout(
      `/api/adventure/scene-examination`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Proxy request for examination failed: ${response.status} ${response.statusText}`
      }));
      throw errorData;
    }
    const responseData = await response.json();
    if (!responseData.text)
      throw new JsonParseError(
        "Proxy response for examination missing 'text' field.",
        JSON.stringify(responseData)
      );
    const examinationData = parseJsonFromText<GeminiExaminationResponse>(
      responseData.text
    );

    if (
      !examinationData ||
      typeof examinationData.examinationText !== 'string' ||
      examinationData.examinationText.trim() === ''
    ) {
      console.error(
        'Invalid examination data structure received:',
        examinationData
      );
      throw new Error(
        "Received incomplete or malformed examination data. 'examinationText' field is missing or empty."
      );
    }
    return examinationData;
  } catch (error) {
    throw handleServiceError(error, 'fetchSceneExamination');
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  const payload = {
    prompt: prompt
  };

  try {
    const response = await fetchWithTimeout(`/api/generate-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Image generation proxy request failed: ${response.status} ${response.statusText}`
      }));
      if (
        errorData.error &&
        (errorData.error.toLowerCase().includes('quota') ||
          errorData.error.includes('RESOURCE_EXHAUSTED'))
      ) {
        throw new ImageGenerationQuotaError(errorData.error);
      }
      throw errorData;
    }

    const result = await response.json();

    if (result.image) {
      const base64ImageBytes = result.image;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      console.warn(
        'No image generated or image data is missing (via proxy) for prompt:',
        prompt,
        'Result:',
        result
      );
      return '';
    }
  } catch (error) {
    if (error instanceof ImageGenerationQuotaError) {
      throw error;
    }
    throw handleServiceError(error, 'generateImage');
  }
};
