
import { Schema, Type } from "@google/genai"; // Kept for schema definitions used in request payloads
import { AdventureOutline, AdventureStage, GeminiAdventureOutlineResponse, GeminiExaminationResponse, GeminiStoryResponse, GeminiWorldDetailsResponse, genrePersonaDetails, GenreSpecificPersonaDetails, ImageGenerationQuotaError, InventoryItem, JsonParseError, Persona, StorySegment, WorldDetails } from '../types';

const GENAI_MODEL_NAME = "gemini-2.5-flash-preview-04-17";
const IMAGEN_MODEL_NAME = "imagen-3.0-generate-002";

const PROXY_BASE_URL = process.env.PROXY_URL || "";
const PROXY_REQUEST_TIMEOUT = 30000; // 30 seconds for proxy requests

// --- Schema Definitions (Unchanged) ---
const AdventureOutlineStageSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {type: Type.STRING, description: "Title for the stage."},
    description: {type: Type.STRING, description: "A brief overview of what happens in this stage."},
    objective: {type: Type.STRING, description: "The player's main objective to complete this stage."}
  },
  required: ['title', 'description', 'objective']
};

const AdventureOutlineSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {type: Type.STRING, description: "A captivating title for the adventure."},
    overallGoal: {type: Type.STRING, description: "A concise description of the ultimate goal."},
    stages: {
      type: Type.ARRAY,
      description: "An array of 3 main stages or acts.",
      items: AdventureOutlineStageSchema
    }
  },
  required: ['title', 'overallGoal', 'stages']
};

const WorldDetailsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    worldName: {type: Type.STRING, description: "A unique and evocative name for this game world or region."},
    genreClarification: {type: Type.STRING, description: "A more specific clarification of the genre."},
    keyEnvironmentalFeatures: {
      type: Type.ARRAY,
      description: "List 2-3 distinct and striking environmental features or geographical oddities.",
      items: {type: Type.STRING}
    },
    dominantSocietiesOrFactions: {
      type: Type.ARRAY,
      description: "Describe 1-2 major societies, factions, or sentient species.",
      items: {type: Type.STRING}
    },
    uniqueCreaturesOrMonsters: {
      type: Type.ARRAY,
      description: "Name and briefly describe 1-2 unique creatures or monsters.",
      items: {type: Type.STRING}
    },
    magicSystemOverview: {type: Type.STRING, description: "Briefly describe the nature of magic in this world."},
    briefHistoryHook: {type: Type.STRING, description: "A short, intriguing piece of history or lore relevant to the adventure."},
    culturalNormsOrTaboos: {
      type: Type.ARRAY,
      description: "List 1-2 significant cultural norms, traditions, or taboos.",
      items: {type: Type.STRING}
    }
  },
  required: [
    'worldName', 'genreClarification', 'keyEnvironmentalFeatures',
    'dominantSocietiesOrFactions', 'uniqueCreaturesOrMonsters',
    'magicSystemOverview', 'briefHistoryHook', 'culturalNormsOrTaboos'
  ]
};

const StorySegmentChoiceSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        text: { type: Type.STRING, description: "Player-facing choice text." },
        outcomePrompt: { type: Type.STRING, description: "AI instruction for the next scene if this choice is picked." },
        signalsStageCompletion: { type: Type.BOOLEAN, description: "True if this choice DIRECTLY completes the current stage objective." },
        leadsToFailure: { type: Type.BOOLEAN, description: "True if this choice leadsTo definitive game failure." }
    },
    required: ['text', 'outcomePrompt', 'signalsStageCompletion', 'leadsToFailure']
};

const StorySegmentItemFoundSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "Name of the item found." },
        description: { type: Type.STRING, description: "Description of the item found." }
    },
    required: ['name', 'description']
};

const StorySegmentSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        sceneDescription: { type: Type.STRING, description: "Narrative text describing the current situation. Should be 2-3 short paragraphs, with varied sentences. Paragraphs separated by a double newline character (\\n\\n) in the string." },
        choices: {
            type: Type.ARRAY,
            description: "Array of choice objects. Empty if isUserInputCommandOnly is true.",
            items: StorySegmentChoiceSchema
        },
        imagePrompt: { type: Type.STRING, description: "A text prompt for Imagen to generate a visual for the scene." },
        isFinalScene: { type: Type.BOOLEAN, description: "True if this scene represents the SUCCESSFUL conclusion of the ENTIRE adventure." },
        isFailureScene: { type: Type.BOOLEAN, description: "True if this scene itself IS the game failure narration." },
        itemFound: { ...StorySegmentItemFoundSchema, nullable: true, description: "Details of any item discovered in this scene. Omit if no item is found." },
        isUserInputCommandOnly: { type: Type.BOOLEAN, description: "True if no predefined choices are given, and the player is expected to provide a custom action." }
    },
    required: ['sceneDescription', 'choices', 'imagePrompt', 'isFinalScene', 'isFailureScene', 'isUserInputCommandOnly']
};

const ExaminationSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        examinationText: { type: Type.STRING, description: "A detailed description of the scene upon closer examination, revealing specific details/lore/clues. Should be 2-4 sentences long, concise, with varied sentence structures." }
    },
    required: ['examinationText']
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
}

const parseJsonFromText = <T,>(text: string, isFixAttempt: boolean = false): T => {
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
    let potentialJson = "";

    if (firstBrace !== -1 && lastBrace > firstBrace) {
        potentialJson = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    
    if (firstBracket !== -1 && lastBracket > firstBracket) {
        const potentialArrayJson = jsonStr.substring(firstBracket, lastBracket + 1);
        if (potentialJson.length === 0 || 
            potentialArrayJson.length > potentialJson.length || 
            (firstBracket < firstBrace && lastBracket > lastBrace && firstBrace !== -1) ||
            (firstBrace === -1)
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
    console.error("JSON PARSING ERROR DETAILS:");
    console.error("Original text received (trimmed):", text);
    console.error("String attempted for JSON.parse:", jsonStr);
    console.error("Parser error:", e.message);
    
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

const fetchWithTimeout = async (resource: RequestInfo, options: RequestInit = {}, timeout: number = PROXY_REQUEST_TIMEOUT) => {
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

    if (error instanceof JsonParseError || error instanceof ImageGenerationQuotaError) {
        throw error; 
    }
    
    if (error.name === 'AbortError') { // Specifically handle AbortError for timeouts
      return new Error(`The request to the game server (proxy) for ${context} timed out. Please check your connection or try again later.`);
    }
    
    let message = `An unknown error occurred in ${context}.`;
    let isQuotaError = false;

    if (error.error && typeof error.error === 'string') { // Structure from proxy's error response
        message = error.error;
        if (message.includes("quota") || message.includes("RESOURCE_EXHAUSTED") || message.includes("429")) {
            isQuotaError = true;
        }
        if (message.includes("API Key configuration error on the server")) {
             return new Error(message); 
        }
    } else if (error.message && typeof error.message === 'string') { // Standard Error object
        message = error.message;
         if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
             message = `Network error: Could not connect to the game server (proxy) for ${context}. Please check your connection.`;
         }
    } else if (typeof error === 'string') {
        message = error;
    }

    if (isQuotaError) {
        if (context === "generateImage") { 
            throw new ImageGenerationQuotaError(message || "Image generation quota has been exceeded.");
        }
        return new Error(`API quota likely exceeded for ${context}. Details: ${message}`);
    }
    
    return new Error(message);
};


export const fetchAdventureOutline = async (genre: keyof GenreSpecificPersonaDetails, persona: Persona): Promise<AdventureOutline> => {
  const genreSpecificPersonaTitle = genrePersonaDetails[genre]?.[persona]?.title || persona;
  const prompt = `You are a master storyteller and game designer. Generate a compelling adventure outline for a text-based RPG.
The genre is: ${genre}.
The player's chosen persona is "${genreSpecificPersonaTitle}" (base archetype: ${persona}). This persona choice should subtly influence the themes or initial hook of the adventure if appropriate for the genre.
The outline should have a clear narrative arc with a distinct beginning, rising action, climax, and resolution.
The adventure should consist of exactly 3 main stages or acts.

For the 'title' field: Provide a captivating title for the adventure, reflecting the ${genre} genre and possibly hinting at the ${genreSpecificPersonaTitle}'s journey.
For the 'overallGoal' field: Provide a concise description of the ultimate goal the player (as ${genreSpecificPersonaTitle}) is trying to achieve. Example: "To find and destroy the ancient artifact known as the 'Heart of Shadows' to save the village of Oakhaven from eternal darkness."
For the 'stages' array (which should contain 3 stage objects):
  For each stage object:
    - 'title': A title for the stage (e.g., The Shadowed Summons).
    - 'description': A brief overview of what happens in this stage.
    - 'objective': The player's main objective to complete this stage.

Ensure the stage descriptions and objectives logically progress the player towards the overallGoal.
The tone should be ${genre}.`;

  const payload = {
    model: GENAI_MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: AdventureOutlineSchema,
    },
  };

  try {
    const response = await fetchWithTimeout(`${PROXY_BASE_URL}/api/generate-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Proxy request for outline failed: ${response.status} ${response.statusText}` }));
        throw errorData;
    }
    const responseData = await response.json();
    if (!responseData.text) throw new JsonParseError("Proxy response for outline missing 'text' field.", JSON.stringify(responseData));
    const outlineData = parseJsonFromText<GeminiAdventureOutlineResponse>(responseData.text);
    
    if (!outlineData || !outlineData.title || !outlineData.overallGoal || !outlineData.stages || !Array.isArray(outlineData.stages) || outlineData.stages.length !== 3) {
      console.error("Invalid adventure outline structure received:", outlineData);
      throw new Error("Received incomplete adventure outline. Essential fields missing or 'stages' is not a valid 3-element array.");
    }
    outlineData.stages.forEach((stage: AdventureStage, index: number) => {
        if (!stage || typeof stage.title !== 'string' || typeof stage.description !== 'string' || typeof stage.objective !== 'string') {
            console.error(`Malformed stage at index ${index}:`, stage);
            throw new Error(`Stage ${index + 1} in the adventure outline is malformed.`);
        }
    });
    return outlineData;
  } catch (error) {
    throw handleServiceError(error, "fetchAdventureOutline");
  }
};

export const fetchWorldDetails = async (
  adventureOutline: AdventureOutline,
  persona: Persona, 
  genre: keyof GenreSpecificPersonaDetails
): Promise<WorldDetails> => {
  const genreSpecificPersonaTitle = genrePersonaDetails[genre]?.[persona]?.title || persona;
  const prompt = `You are a world-building AI. Based on the provided adventure outline, player persona, and genre, generate detailed world information.
Adventure Title: "${adventureOutline.title}"
Overall Goal: "${adventureOutline.overallGoal}"
Adventure Stages:
${adventureOutline.stages.map((s, i) => `  Stage ${i+1}: "${s.title}" - ${s.description} (Objective: ${s.objective})`).join('\n')}
Player Persona: "${genreSpecificPersonaTitle}" (base archetype: ${persona})
Adventure Genre: ${genre}

Generate rich and interconnected world details. These details should directly influence the atmosphere, potential encounters, challenges, and items within the adventure.
The player's persona (${genreSpecificPersonaTitle}) might have unique insights or connections to certain aspects of this world.

Provide content for the following fields:
- 'worldName': A unique and evocative name for this game world or region, fitting for a ${genreSpecificPersonaTitle}.
- 'genreClarification': A more specific clarification of the genre, possibly blending sub-genres (e.g., "High fantasy with elements of cosmic horror" or "Dark fantasy survival in a post-magical apocalypse").
- 'keyEnvironmentalFeatures' (array of strings): List 2-3 distinct and striking environmental features or geographical oddities. Each feature should be a string. Example values: "A constantly shifting crystal desert", "Floating islands wreathed in perpetual storms", "A forest where trees whisper prophecies, sometimes containing \\"forbidden truths\\"."
- 'dominantSocietiesOrFactions' (array of strings): Describe 1-2 major societies, factions, or sentient species. Each description is a string. e.g., "The reclusive Sky-Elves of Mount Cinder, known for their powerful elemental magic and distrust of outsiders."
- 'uniqueCreaturesOrMonsters' (array of strings): Name and briefly describe 1-2 unique creatures or monsters. Each description is a string. e.g., "Chronomites: small, insectoid creatures that can locally distort time.", "Grief-fiends: ethereal beings that feed on sorrow."
- 'magicSystemOverview': Briefly describe the nature of magic in this world. This should be a string. e.g., "Magic is a wild, untamed force drawn from the raw elements, accessible only to those with innate talent or through dangerous pacts."
- 'briefHistoryHook': A short, intriguing piece of history or lore relevant to the adventure. This should be a string. e.g., "The land is still scarred by the 'War of Whispers' a century ago, where forbidden knowledge almost unmade reality."
- 'culturalNormsOrTaboos' (array of strings): List 1-2 significant cultural norms, traditions, or taboos. Each is a string. e.g., "Offering a shard of obsidian is a sign of respect.", "Speaking the name of the last Tyrant King is forbidden and believed to bring misfortune."

Ensure all fields are filled with creative and relevant information.`;

  const payload = {
    model: GENAI_MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: WorldDetailsSchema,
    },
  };

  try {
    const response = await fetchWithTimeout(`${PROXY_BASE_URL}/api/generate-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Proxy request for world details failed: ${response.status} ${response.statusText}` }));
        throw errorData;
    }
    const responseData = await response.json();
    if (!responseData.text) throw new JsonParseError("Proxy response for world details missing 'text' field.", JSON.stringify(responseData));
    const worldData = parseJsonFromText<GeminiWorldDetailsResponse>(responseData.text);

    if (!worldData || typeof worldData.worldName !== 'string' || worldData.worldName.trim() === "" ||
        !Array.isArray(worldData.keyEnvironmentalFeatures) || !Array.isArray(worldData.dominantSocietiesOrFactions) ||
        !Array.isArray(worldData.uniqueCreaturesOrMonsters) || typeof worldData.magicSystemOverview !== 'string' ||
        typeof worldData.briefHistoryHook !== 'string' || !Array.isArray(worldData.culturalNormsOrTaboos)) {
      console.error("Invalid world details structure received:", worldData);
      throw new Error("Received incomplete or malformed world details.");
    }
    return worldData;
  } catch (error) {
    throw handleServiceError(error, "fetchWorldDetails");
  }
};


export const fetchStorySegment = async (
  fullPrompt: string, 
  isInitialScene: boolean = false 
): Promise<StorySegment> => {
  const augmentedPrompt = `${fullPrompt}

General Content Instructions for Story Segment:
- For the 'sceneDescription' field:
    - ${isInitialScene ? 
        "For this initial scene, or if the player is entering a new major location/area, ensure the sceneDescription is immersive and establishes the setting and atmosphere effectively (approx. 3-5 sentences)." :
        "For subsequent scenes, the sceneDescription should be vivid yet concise (approx. 2-4 sentences). If the player's choice outcome (detailed in the prompt above) implies travel, a simple or mundane action, or is primarily transitional, aim for focused brevity (approx. 1-3 sentences), highlighting only essential changes, observations, or the direct result of the action."
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

  const payload = {
    model: GENAI_MODEL_NAME,
    contents: augmentedPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: StorySegmentSchema,
    },
  };

  try {
    const response = await fetchWithTimeout(`${PROXY_BASE_URL}/api/generate-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Proxy request for story segment failed: ${response.status} ${response.statusText}` }));
        throw errorData;
    }
    const responseData = await response.json();
    if (!responseData.text) throw new JsonParseError("Proxy response for story segment missing 'text' field.", JSON.stringify(responseData));
    const storyData = parseJsonFromText<GeminiStoryResponse>(responseData.text);
    
    if (!storyData || typeof storyData.sceneDescription !== 'string' || 
        !Array.isArray(storyData.choices) || 
        typeof storyData.imagePrompt !== 'string' ||
        typeof storyData.isFinalScene !== 'boolean' || 
        typeof storyData.isFailureScene !== 'boolean' ||
        typeof storyData.isUserInputCommandOnly !== 'boolean') {
        console.error("Invalid story data structure received:", storyData);
        throw new Error("Received incomplete or malformed story data.");
    }
    if (storyData.isUserInputCommandOnly === true && storyData.choices.length !== 0) {
        console.error("Inconsistency: isUserInputCommandOnly is true but choices array is not empty:", storyData);
        throw new Error("AI returned isUserInputCommandOnly=true but provided choices.");
    }

    if (storyData.choices) { 
        storyData.choices.forEach((choice, index) => {
            if (!choice || typeof choice.text !== 'string' || typeof choice.outcomePrompt !== 'string' || 
                typeof choice.signalsStageCompletion !== 'boolean' || typeof choice.leadsToFailure !== 'boolean') {
                console.error(`Malformed choice at index ${index}:`, choice);
                throw new Error(`Choice ${index + 1} is malformed.`);
            }
        });
    }

    let foundItem: InventoryItem | undefined = undefined;
    if (storyData.itemFound) {
        if (typeof storyData.itemFound.name === 'string' && typeof storyData.itemFound.description === 'string' && storyData.itemFound.name.trim() !== "") {
            foundItem = {
                id: slugify(storyData.itemFound.name),
                name: storyData.itemFound.name.trim(),
                description: storyData.itemFound.description.trim()
            };
        } else {
            console.warn("Received itemFound field with invalid structure or empty name:", storyData.itemFound);
        }
    }

    return {
      sceneDescription: storyData.sceneDescription,
      choices: storyData.choices || [], 
      imagePrompt: storyData.imagePrompt,
      isFinalScene: storyData.isFinalScene,
      isFailureScene: storyData.isFailureScene,
      isUserInputCommandOnly: storyData.isUserInputCommandOnly,
      itemFound: foundItem,
    };
  } catch (error) {
    throw handleServiceError(error, "fetchStorySegment");
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
  currentStageIndex: number
): Promise<StorySegment> => {
  const genreSpecificPersonaTitle = genrePersonaDetails[selectedGenre]?.[selectedPersona]?.title || selectedPersona;
  const personaContext = `The player is a ${genreSpecificPersonaTitle} (base persona: ${selectedPersona}).`;
  const inventoryContext = inventory.length > 0
    ? `The player possesses: ${inventory.map(item => `'${item.name}' (described as: ${item.description})`).join(', ')}.`
    : "The player possesses no items yet.";
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
  const prompt = `You are a master storyteller for a dynamic text-based RPG adventure game.
Adventure Genre: ${selectedGenre}.
${personaContext}
Player's Current Inventory: ${inventoryContext}
${worldContext}
The overall adventure is titled: "${adventureOutline.title}".
The player's ultimate goal is: "${adventureOutline.overallGoal}".
Current Stage ${currentStageIndex + 1}: "${currentStage.title}" (Objective: "${currentStage.objective}").
Previous Scene Description was: "${currentSegment.sceneDescription}"
Player's custom action: "${userInputText}"

Your task is to evaluate the player's custom action and generate the resulting story segment.

1.  Evaluation and Narrative Considerations for content:
    *   Is the action "${userInputText}" plausible, safe, and sensible given the current scene, world details, player's persona (${genreSpecificPersonaTitle}), and the ${selectedGenre} genre?
    *   Consider if it aligns with or contradicts cultural norms/taboos or the magic system of "${worldDetails.worldName}".
    *   Does it directly contribute to the current stage objective ("${currentStage.objective}") or the overall goal ("${adventureOutline.overallGoal}")? Or does it lead to significant danger or failure?
    *   **Inventory Interaction (Crucial):** When evaluating the player's action ("${userInputText}"), actively consider if any items in their inventory (listed in "Player's Current Inventory" above) could logically assist, hinder, or alter the outcome.
        *   If an item is relevant, the 'sceneDescription' content MUST narrate how the item is used or its effect. For example, if the player has 'Rope' and tries to 'climb the treacherous cliff', the narrative should explicitly mention the rope being used.
        *   The narrative should reflect the item's contribution naturally.
        *   If the player attempts an action that an item in their inventory would clearly make trivial or very easy, reflect this in the outcome. Conversely, if they lack a crucial item for an action, this might lead to failure or a more challenging outcome.

2.  Content Generation guidance (schema will handle structure):
    *   For 'sceneDescription': Narrate the outcome (2-3 short paragraphs, varied sentences, paragraphs separated by \\n\\n in the string), clearly describing any relevant inventory item usage.
        *   If action is IMPOSSIBLE/NONSENSICAL (or if user input is inappropriate and you're narrating a gentle refusal): The 'sceneDescription' should narrate the attempt and why it's not feasible/appropriate. Describe a *minor consequence* or the character's reaction. The scene must reflect this minor change; it should NOT be an exact reversion to the previous state.
    *   For 'choices' / 'isUserInputCommandOnly':
        *   If 'isUserInputCommandOnly' is false: Provide 3 new distinct choice OBJECTS relevant to the new situation.
        *   If 'isUserInputCommandOnly' is true: 'choices' array must be empty.
        *   For impossible/nonsensical actions: New choices should allow the player to move on from the failed attempt. Do NOT simply repeat the previous scene's choices.
    *   For 'imagePrompt': New image prompt matching the new scene, considering item usage.
    *   For 'isFinalScene': True if successful adventure completion.
    *   For 'isFailureScene': True if this action leads to game failure.
    *   For 'itemFound': Award an item if logical (provide 'name' and 'description').

Sanitize user input: Do not directly reflect harmful, offensive, or role-play-breaking user input. If user input is inappropriate, follow the "IMPOSSIBLE/NONSENSICAL" pathway: make the 'sceneDescription' a gentle refusal and generate a new state with new choices or user input mode.`;

  const payload = {
    model: GENAI_MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: StorySegmentSchema,
      thinkingConfig: { thinkingBudget: 0 } 
    },
  };

  try {
    const response = await fetchWithTimeout(`${PROXY_BASE_URL}/api/generate-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Proxy request for custom action failed: ${response.status} ${response.statusText}` }));
        throw errorData;
    }
    const responseData = await response.json();
    if (!responseData.text) throw new JsonParseError("Proxy response for custom action missing 'text' field.", JSON.stringify(responseData));
    const storyData = parseJsonFromText<GeminiStoryResponse>(responseData.text);

    if (!storyData || typeof storyData.sceneDescription !== 'string' || 
        !Array.isArray(storyData.choices) || 
        typeof storyData.imagePrompt !== 'string' ||
        typeof storyData.isFinalScene !== 'boolean' ||
        typeof storyData.isFailureScene !== 'boolean' ||
        typeof storyData.isUserInputCommandOnly !== 'boolean') {
        console.error("Invalid custom action outcome structure received:", storyData);
        throw new Error("Received incomplete or malformed story data for custom action.");
    }
    if (storyData.isUserInputCommandOnly === true && storyData.choices.length !== 0) {
        console.error("Inconsistency (custom action): isUserInputCommandOnly is true but choices array is not empty:", storyData);
        throw new Error("AI returned isUserInputCommandOnly=true but provided choices for custom action.");
    }
    if (storyData.choices) {
        storyData.choices.forEach((choice, index) => {
            if (!choice || typeof choice.text !== 'string' || typeof choice.outcomePrompt !== 'string' || 
                typeof choice.signalsStageCompletion !== 'boolean' || typeof choice.leadsToFailure !== 'boolean') {
                console.error(`Malformed choice at index ${index} in custom action response:`, choice);
                throw new Error(`Choice ${index + 1} (custom action) is malformed.`);
            }
        });
    }

    let foundItem: InventoryItem | undefined = undefined;
    if (storyData.itemFound) {
      if (typeof storyData.itemFound.name === 'string' && typeof storyData.itemFound.description === 'string' && storyData.itemFound.name.trim() !== "") {
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
      itemFound: foundItem,
    };
  } catch (error) {
    throw handleServiceError(error, "fetchCustomActionOutcome");
  }
};


export const attemptToFixJson = async (
  faultyJsonText: string,
  originalPromptContext: string 
): Promise<StorySegment> => {
  const fixPrompt = `The following JSON response was received but is malformed:
\`\`\`json
${faultyJsonText}
\`\`\`

This response was for a request related to generating a story segment. The original request's core instructions were to produce a JSON object with keys: "sceneDescription" (string, formatted into 2-3 short paragraphs with varied sentence structure, paragraphs separated by \\n\\n), "choices" (array of objects, each object with "text" (string), "outcomePrompt" (string), "signalsStageCompletion" (boolean), and "leadsToFailure" (boolean)), "imagePrompt" (string), "isFinalScene" (boolean), "isFailureScene" (boolean), "isUserInputCommandOnly" (boolean), and optionally "itemFound" (an object with "name" (string) and "description" (string)).
If "isUserInputCommandOnly" is true, "choices" array must be empty.
The context of the original prompt included aspects like:
"${originalPromptContext.substring(0, 500)}..."

Please analyze the faulty JSON, correct its structure, and provide ONLY the valid JSON object for the story segment. Ensure all required fields are present and correctly typed according to the structure described, especially the "sceneDescription" formatting and the structure of objects within the "choices" array. Do not include any explanatory text, only the corrected JSON object.`;

  const payload = {
    model: GENAI_MODEL_NAME,
    contents: fixPrompt,
    config: {
      responseMimeType: "application/json",
      // No responseSchema here as the AI is fixing text to match a described schema, not generating from scratch.
    },
  };

  try {
    const response = await fetchWithTimeout(`${PROXY_BASE_URL}/api/generate-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Proxy request for JSON fix failed: ${response.status} ${response.statusText}` }));
        throw errorData;
    }
    const responseData = await response.json();
    if (!responseData.text) throw new JsonParseError("Proxy response for JSON fix missing 'text' field.", JSON.stringify(responseData));
    const storyData = parseJsonFromText<GeminiStoryResponse>(responseData.text, true); // isFixAttempt = true

    if (!storyData || typeof storyData.sceneDescription !== 'string' || 
        !Array.isArray(storyData.choices) || 
        typeof storyData.imagePrompt !== 'string' ||
        typeof storyData.isFinalScene !== 'boolean' ||
        typeof storyData.isFailureScene !== 'boolean' ||
        typeof storyData.isUserInputCommandOnly !== 'boolean') {
        console.error("Invalid story data structure received after fix attempt:", storyData);
        throw new Error("Received incomplete or malformed story data after fix attempt.");
    }
     if (storyData.choices) {
        storyData.choices.forEach((choice, index) => {
            if (!choice || typeof choice.text !== 'string' || typeof choice.outcomePrompt !== 'string' || 
                typeof choice.signalsStageCompletion !== 'boolean' || typeof choice.leadsToFailure !== 'boolean') {
                console.error(`Malformed choice at index ${index} after fix attempt:`, choice);
                throw new Error(`Choice ${index + 1} (post-fix) is malformed.`);
            }
        });
    }
    
    let foundItem: InventoryItem | undefined = undefined;
    if (storyData.itemFound) {
      if (typeof storyData.itemFound.name === 'string' && typeof storyData.itemFound.description === 'string' && storyData.itemFound.name.trim() !== "") {
            foundItem = {
                id: slugify(storyData.itemFound.name),
                name: storyData.itemFound.name.trim(),
                description: storyData.itemFound.description.trim()
            };
        } else {
            console.warn("Received itemFound field with invalid structure or empty name after fix attempt:", storyData.itemFound);
        }
    }

    return {
      sceneDescription: storyData.sceneDescription,
      choices: storyData.choices || [],
      imagePrompt: storyData.imagePrompt,
      isFinalScene: storyData.isFinalScene,
      isFailureScene: storyData.isFailureScene,
      isUserInputCommandOnly: storyData.isUserInputCommandOnly,
      itemFound: foundItem,
    };
  } catch (error) {
    throw handleServiceError(error, "attemptToFixJson");
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
    const genreSpecificPersonaTitle = genrePersonaDetails[adventureGenre]?.[persona]?.title || persona;
    const personaContext = `The player examining is a ${genreSpecificPersonaTitle} (base archetype: ${persona}).`;
    const inventoryContext = inventory.length > 0 ? `They possess: ${inventory.map(item => item.name).join(', ')}.` : "They possess no items.";
    const worldContext = `
World Context:
World Name: "${worldDetails.worldName}" (${worldDetails.genreClarification})
Key Environment: ${worldDetails.keyEnvironmentalFeatures.join(', ') || 'N/A'}
Societies: ${worldDetails.dominantSocietiesOrFactions.join(', ') || 'N/A'}
Creatures: ${worldDetails.uniqueCreaturesOrMonsters.join(', ') || 'N/A'}
Magic: ${worldDetails.magicSystemOverview}
History Hook: ${worldDetails.briefHistoryHook}
Culture: ${worldDetails.culturalNormsOrTaboos.join(', ') || 'N/A'}
This world information should influence the details revealed.`;
    const prompt = `You are a master storyteller. The player wants to examine their current surroundings more closely.
Adventure Title: "${adventureOutline.title}"
Overall Goal: "${adventureOutline.overallGoal}"
Current Stage: "${currentStageTitle}" (Objective: "${currentStageObjective}")
${personaContext}
${inventoryContext}
${worldContext}

Current Scene Description (what the player already sees):
"${currentSceneDescription}"

Based on this, provide content for the 'examinationText' field. This text should:
- Elaborate on details already mentioned or hint at things not immediately obvious, drawing from the established World Context.
- Reveal subtle clues, interesting lore, or atmospheric details that are consistent with the world's features, history, or magic.
- Consider the player's persona (${genreSpecificPersonaTitle}) and items they possess for any specific insights they might gain, filtered through their understanding of this world.
- DO NOT advance the plot or introduce new choices. This is for observation only.
- Maintain the ${adventureGenre} tone, enriched by the world's specific genre clarification.
- Be 2-4 sentences long and concise. Employ varied sentence structures.`;

    const payload = {
        model: GENAI_MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: ExaminationSchema,
        },
    };

    try {
        const response = await fetchWithTimeout(`${PROXY_BASE_URL}/api/generate-content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Proxy request for examination failed: ${response.status} ${response.statusText}` }));
            throw errorData;
        }
        const responseData = await response.json();
        if (!responseData.text) throw new JsonParseError("Proxy response for examination missing 'text' field.", JSON.stringify(responseData));
        const examinationData = parseJsonFromText<GeminiExaminationResponse>(responseData.text);

        if (!examinationData || typeof examinationData.examinationText !== 'string' || examinationData.examinationText.trim() === "") {
            console.error("Invalid examination data structure received:", examinationData);
            throw new Error("Received incomplete or malformed examination data. 'examinationText' field is missing or empty.");
        }
        return examinationData;
    } catch (error) {
        throw handleServiceError(error, "fetchSceneExamination");
    }
};

export const generateImage = async (prompt: string): Promise<string> => {
  const payload = {
    model: IMAGEN_MODEL_NAME,
    prompt: prompt,
    config: { numberOfImages: 1, outputMimeType: "image/jpeg" },
  };

  try {
    const response = await fetchWithTimeout(`${PROXY_BASE_URL}/api/generate-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Image generation proxy request failed: ${response.status} ${response.statusText}` }));
      if (errorData.error && (errorData.error.toLowerCase().includes("quota") || errorData.error.includes("RESOURCE_EXHAUSTED"))) {
          throw new ImageGenerationQuotaError(errorData.error); 
      }
      throw errorData;
    }

    const result = await response.json(); 

    if (result.generatedImages && result.generatedImages.length > 0 && result?.generatedImages?.[0]?.image?.imageBytes) {
      const base64ImageBytes = result.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      console.warn("No image generated or image data is missing (via proxy) for prompt:", prompt, "Result:", result);
      return ""; 
    }
  } catch (error) {
    if (error instanceof ImageGenerationQuotaError) { 
        throw error;
    }
    throw handleServiceError(error, "generateImage");
  }
};
