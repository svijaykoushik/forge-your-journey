

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { StorySegment, GeminiStoryResponse, AdventureOutline, GeminiAdventureOutlineResponse, AdventureStage, Persona, GeminiExaminationResponse, JsonParseError, InventoryItem, GeminiStoryResponseItemFound, WorldDetails, GeminiWorldDetailsResponse, genrePersonaDetails, Choice, ImageGenerationQuotaError } from '../types';

const API_KEY = process.env.API_KEY as string;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

const GENAI_MODEL_NAME = "gemini-2.5-flash-preview-04-17";
const IMAGEN_MODEL_NAME = "imagen-3.0-generate-002";

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
    console.error("Original text received from AI (trimmed):", text);
    console.error("String attempted for JSON.parse:", jsonStr);
    console.error("Parser error:", e.message);
    
    let detailedError = `Failed to parse JSON from AI response. The AI may not have strictly adhered to the JSON format.`;
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

const handleError = (error: any, context: string): Error => {
    console.error(`Error in ${context}:`, error);
    if (error instanceof JsonParseError || error instanceof ImageGenerationQuotaError) {
        throw error;
    }
    let message = `An unknown error occurred in ${context}.`;
    if (error instanceof Error) {
        message = error.message;
        if (message.includes("API key not valid")) {
            return new Error("Invalid API Key. Please check your configuration.");
        }
        if (message.includes("quota") || message.includes("RESOURCE_EXHAUSTED")) { // Generic quota for text models
            return new Error(`API quota likely exceeded for ${context}. Please try again later or check your plan. Error: ${message}`);
        }
    }
    return new Error(message);
}


export const fetchAdventureOutline = async (genre: string, persona: Persona): Promise<AdventureOutline> => {
  if (!ai) {
    throw new Error("Gemini API client not initialized. API_KEY might be missing.");
  }
  const genreSpecificPersonaTitle = genrePersonaDetails[genre]?.[persona]?.title || persona;

  const prompt = `You are a master storyteller and game designer. Generate a compelling adventure outline for a text-based RPG.
The genre is: ${genre}.
The player's chosen persona is "${genreSpecificPersonaTitle}" (base archetype: ${persona}). This persona choice should subtly influence the themes or initial hook of the adventure if appropriate for the genre.
The outline should have a clear narrative arc with a distinct beginning, rising action, climax, and resolution.
The adventure should consist of exactly 3 main stages or acts.

Provide the following in a STRICT JSON format:
{
  "title": "A captivating title for the adventure, reflecting the ${genre} genre and possibly hinting at the ${genreSpecificPersonaTitle}'s journey.",
  "overallGoal": "A concise description of the ultimate goal the player (as ${genreSpecificPersonaTitle}) is trying to achieve.",
  "stages": [
    {
      "title": "Title for Stage 1 (e.g., The Shadowed Summons)",
      "description": "A brief overview of what happens in this stage.",
      "objective": "The player's main objective to complete this stage."
    },
    {
      "title": "Title for Stage 2 (e.g., The Corrupted Woods)",
      "description": "A brief overview of what happens in this stage.",
      "objective": "The player's main objective to complete this stage."
    },
    {
      "title": "Title for Final Stage (e.g., The Obsidian Throne)",
      "description": "A brief overview of the climactic stage.",
      "objective": "The player's main objective to complete this stage and the adventure."
    }
  ]
}

Example for overallGoal: "To find and destroy the ancient artifact known as the 'Heart of Shadows' to save the village of Oakhaven from eternal darkness."
Ensure the stage descriptions and objectives logically progress the player towards the overallGoal.
The tone should be ${genre}.
Respond ONLY with the valid JSON object, without any surrounding text or markdown fences.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GENAI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const outlineData = parseJsonFromText<GeminiAdventureOutlineResponse>(response.text);
    if (!outlineData || !outlineData.title || !outlineData.overallGoal || !outlineData.stages || !Array.isArray(outlineData.stages) || outlineData.stages.length === 0) {
      console.error("Invalid adventure outline structure received:", outlineData);
      throw new Error("Received incomplete or malformed adventure outline from AI. Essential fields missing or 'stages' is not a valid array.");
    }
    outlineData.stages.forEach((stage: AdventureStage, index: number) => {
        if (!stage || typeof stage.title !== 'string' || typeof stage.description !== 'string' || typeof stage.objective !== 'string') {
            console.error(`Malformed stage at index ${index}:`, stage);
            throw new Error(`Stage ${index + 1} in the adventure outline is malformed or missing required string fields.`);
        }
    });
    return outlineData;
  } catch (error) {
    throw handleError(error, "fetchAdventureOutline");
  }
};

export const fetchWorldDetails = async (
  adventureOutline: AdventureOutline,
  persona: Persona, 
  genre: string
): Promise<WorldDetails> => {
  if (!ai) {
    throw new Error("Gemini API client not initialized. API_KEY might be missing.");
  }
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
Provide the following in a STRICT JSON format:
{
  "worldName": "A unique and evocative name for this game world or region, fitting for a ${genreSpecificPersonaTitle}.",
  "genreClarification": "A more specific clarification of the genre, possibly blending sub-genres (e.g., 'High fantasy with elements of cosmic horror' or 'Dark fantasy survival in a post-magical apocalypse').",
  "keyEnvironmentalFeatures": ["List 2-3 distinct and striking environmental features or geographical oddities. e.g., 'A constantly shifting crystal desert', 'Floating islands wreathed in perpetual storms', 'A forest where trees whisper prophecies'"],
  "dominantSocietiesOrFactions": ["Describe 1-2 major societies, factions, or sentient species that the player might encounter or hear about. Include a brief note on their culture or general attitude. e.g., 'The reclusive Sky-Elves of Mount Cinder, known for their powerful elemental magic and distrust of outsiders.'"],
  "uniqueCreaturesOrMonsters": ["Name and briefly describe 1-2 unique creatures or monsters native to this world, fitting the genre and adventure. e.g., 'Chronomites: small, insectoid creatures that can locally distort time.', 'Grief-fiends: ethereal beings that feed on sorrow.'"],
  "magicSystemOverview": "Briefly describe the nature of magic in this world. Is it common, rare, dangerous, structured, chaotic? e.g., 'Magic is a wild, untamed force drawn from the raw elements, accessible only to those with innate talent or through dangerous pacts.'",
  "briefHistoryHook": "A short, intriguing piece of history or lore that is relevant to the adventure outline or the world's current state. e.g., 'The land is still scarred by the 'War of Whispers' a century ago, where forbidden knowledge almost unmade reality.'",
  "culturalNormsOrTaboos": ["List 1-2 significant cultural norms, traditions, or taboos that might affect player interactions or understanding of the world. e.g., 'Offering a shard of obsidian is a sign of respect.', 'Speaking the name of the last Tyrant King is forbidden and believed to bring misfortune.'"]
}

Ensure all fields are filled with creative and relevant information.
Respond ONLY with the valid JSON object, without any surrounding text or markdown fences.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GENAI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
    const worldData = parseJsonFromText<GeminiWorldDetailsResponse>(response.text);

    if (!worldData || typeof worldData.worldName !== 'string' || worldData.worldName.trim() === "" ||
        !Array.isArray(worldData.keyEnvironmentalFeatures) || !Array.isArray(worldData.dominantSocietiesOrFactions) ||
        !Array.isArray(worldData.uniqueCreaturesOrMonsters) || typeof worldData.magicSystemOverview !== 'string' ||
        typeof worldData.briefHistoryHook !== 'string' || !Array.isArray(worldData.culturalNormsOrTaboos)) {
      console.error("Invalid world details structure received:", worldData);
      throw new Error("Received incomplete or malformed world details from AI. Essential fields are missing or have incorrect types.");
    }
    return worldData;
  } catch (error) {
    throw handleError(error, "fetchWorldDetails");
  }
};


export const fetchStorySegment = async (
  fullPrompt: string, 
  isInitialScene: boolean = false 
): Promise<StorySegment> => {
  if (!ai) {
    throw new Error("Gemini API client not initialized. API_KEY might be missing.");
  }

  const augmentedPrompt = `${fullPrompt}

General Instructions for Story Segment Generation:
- "sceneDescription": Should be vivid but concise, ideally 2-4 sentences.
- "choices": If not "isUserInputCommandOnly", provide 3 distinct choices. Each choice object must include:
    - "text": Player-facing choice text.
    - "outcomePrompt": AI instruction for the next scene if this choice is picked. This prompt should imply the nature of the consequence (positive, negative, neutral) which the AI will then narrate in the next scene's description.
    - "signalsStageCompletion": Boolean. True if this choice DIRECTLY completes the current stage objective.
    - "leadsToFailure": Boolean. True if this choice leads to definitive game failure.
- "isUserInputCommandOnly": Boolean. There is a small chance (around 10-15%, slightly less for the very first scene unless context demands it) that the situation calls for the player's direct input. In such cases, set this to true, and the "choices" array MUST be empty. The "sceneDescription" should naturally lead to the player needing to decide what to do.
- "isFailureScene": Boolean. Set to true ONLY if this scene itself IS the game failure narration (e.g., after a choice with "leadsToFailure: true" was picked). If true, "choices" should be empty, and "imagePrompt" can be a somber final image.
- "isFinalScene": Boolean. Set to true ONLY if this scene represents the SUCCESSFUL conclusion of the ENTIRE adventure.

Respond ONLY with the valid JSON object as specified, without any surrounding text or markdown fences. The JSON object should include keys: sceneDescription, choices, imagePrompt, isFinalScene, isFailureScene, isUserInputCommandOnly, and optionally itemFound.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GENAI_MODEL_NAME,
      contents: augmentedPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const storyData = parseJsonFromText<GeminiStoryResponse>(response.text);
    
    if (!storyData || typeof storyData.sceneDescription !== 'string' || 
        (storyData.isUserInputCommandOnly === false && !Array.isArray(storyData.choices)) || 
        (storyData.isUserInputCommandOnly === true && (!Array.isArray(storyData.choices) || storyData.choices.length !== 0)) || 
        typeof storyData.imagePrompt !== 'string') {
        console.error("Invalid story data structure received:", storyData);
        throw new Error("Received incomplete or malformed story data from AI. Essential fields missing or 'choices'/'isUserInputCommandOnly' inconsistent.");
    }

    if (storyData.choices) { 
        storyData.choices.forEach((choice, index) => {
            if (!choice || typeof choice.text !== 'string' || typeof choice.outcomePrompt !== 'string' || 
                typeof choice.signalsStageCompletion !== 'boolean' || typeof choice.leadsToFailure !== 'boolean') {
                console.error(`Malformed choice at index ${index}:`, choice);
                throw new Error(`Choice ${index + 1} is malformed. Expected 'text', 'outcomePrompt', 'signalsStageCompletion', 'leadsToFailure'. Received: ${JSON.stringify(choice)}`);
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
      isFinalScene: typeof storyData.isFinalScene === 'boolean' ? storyData.isFinalScene : false,
      isFailureScene: typeof storyData.isFailureScene === 'boolean' ? storyData.isFailureScene : false,
      isUserInputCommandOnly: typeof storyData.isUserInputCommandOnly === 'boolean' ? storyData.isUserInputCommandOnly : false,
      itemFound: foundItem,
    };
  } catch (error) {
    throw handleError(error, "fetchStorySegment");
  }
};


export const fetchCustomActionOutcome = async (
  userInputText: string,
  currentSegment: StorySegment,
  adventureOutline: AdventureOutline,
  worldDetails: WorldDetails,
  selectedGenre: string,
  selectedPersona: Persona,
  inventory: InventoryItem[],
  currentStageIndex: number
): Promise<StorySegment> => {
  if (!ai) {
    throw new Error("Gemini API client not initialized. API_KEY might be missing.");
  }

  const genreSpecificPersonaTitle = genrePersonaDetails[selectedGenre]?.[selectedPersona]?.title || selectedPersona;
  const personaContext = `The player is a ${genreSpecificPersonaTitle} (base persona: ${selectedPersona}).`;
  const inventoryContext = inventory.length > 0
    ? `The player possesses: ${inventory.map(item => item.name).join(', ')}.`
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
${inventoryContext}
${worldContext}
The overall adventure is titled: "${adventureOutline.title}".
The player's ultimate goal is: "${adventureOutline.overallGoal}".
Current Stage ${currentStageIndex + 1}: "${currentStage.title}" (Objective: "${currentStage.objective}").
Previous Scene Description was: "${currentSegment.sceneDescription}"
Player's custom action: "${userInputText}"

Your task is to evaluate the player's custom action and generate the resulting story segment.

1.  Evaluation:
    *   Is the action "${userInputText}" plausible, safe, and sensible given the current scene, world details, player's persona (${genreSpecificPersonaTitle}), inventory, and the ${selectedGenre} genre?
    *   Consider if it aligns with or contradicts cultural norms/taboos or the magic system of "${worldDetails.worldName}".
    *   Does it directly contribute to the current stage objective ("${currentStage.objective}") or the overall goal ("${adventureOutline.overallGoal}")? Or does it lead to significant danger or failure?

2.  Generation - Adhere STRICTLY to this JSON format:
    {
      "sceneDescription": "string", 
      "choices": [], 
      "isUserInputCommandOnly": boolean, 
      "imagePrompt": "string", 
      "isFinalScene": boolean, 
      "isFailureScene": boolean, 
      "itemFound": { "name": "string", "description": "string" } 
    }

    *   If action is IMPOSSIBLE/NONSENSICAL:
        *   "sceneDescription": Explain why in a narrative way.
        *   "choices": Return the *exact same choices array* as in the previous scene: ${JSON.stringify(currentSegment.choices)}.
        *   "isUserInputCommandOnly": Set to ${currentSegment.isUserInputCommandOnly}. (If previous was user-input-only, this should be too).
        *   "imagePrompt": Reflect the failed attempt or unchanged scene.
        *   "isFailureScene": Likely false, unless the attempt itself is catastrophic.
    *   If action is POSSIBLE:
        *   "sceneDescription": Narrate the outcome, including positive/negative consequences.
        *   "choices": Provide 3 new distinct choices relevant to the new situation OR set "isUserInputCommandOnly": true (10-15% chance) and "choices": [].
        *   "imagePrompt": New image prompt matching the new scene.
        *   "isFinalScene": True if successful adventure completion.
        *   "isFailureScene": True if this action leads to game failure.
        *   "itemFound": Award if logical.

Sanitize user input: Do not directly reflect harmful, offensive, or role-play-breaking user input. If user input is inappropriate, make the "sceneDescription" a gentle refusal like "You ponder that course of action, but decide against it." and return original choices.

Respond ONLY with the valid JSON object.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GENAI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 } 
      },
    });
    const storyData = parseJsonFromText<GeminiStoryResponse>(response.text);

     if (!storyData || typeof storyData.sceneDescription !== 'string' || 
        (storyData.isUserInputCommandOnly === false && !Array.isArray(storyData.choices)) ||
        (storyData.isUserInputCommandOnly === true && (!Array.isArray(storyData.choices) || storyData.choices.length !== 0)) ||
        typeof storyData.imagePrompt !== 'string') {
        console.error("Invalid custom action outcome structure received:", storyData);
        throw new Error("Received incomplete or malformed story data from AI for custom action. Essential fields missing or 'choices'/'isUserInputCommandOnly' inconsistent.");
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
      isFinalScene: typeof storyData.isFinalScene === 'boolean' ? storyData.isFinalScene : false,
      isFailureScene: typeof storyData.isFailureScene === 'boolean' ? storyData.isFailureScene : false,
      isUserInputCommandOnly: typeof storyData.isUserInputCommandOnly === 'boolean' ? storyData.isUserInputCommandOnly : false,
      itemFound: foundItem,
    };

  } catch (error) {
    throw handleError(error, "fetchCustomActionOutcome");
  }
};


export const attemptToFixJson = async (
  faultyJsonText: string,
  originalPromptContext: string 
): Promise<StorySegment> => {
  if (!ai) {
    throw new Error("Gemini API client not initialized. API_KEY might be missing.");
  }

  const fixPrompt = `The following JSON response was received but is malformed:
\`\`\`json
${faultyJsonText}
\`\`\`

This response was for a request related to generating a story segment. The original request's core instructions were to produce a JSON object with keys: "sceneDescription" (string), "choices" (array of objects, each with "text" (string), "outcomePrompt" (string), "signalsStageCompletion" (boolean), and "leadsToFailure" (boolean)), "imagePrompt" (string), "isFinalScene" (boolean), "isFailureScene" (boolean), "isUserInputCommandOnly" (boolean), and optionally "itemFound" (an object with "name" (string) and "description" (string)).
If "isUserInputCommandOnly" is true, "choices" array must be empty.
The context of the original prompt included aspects like:
"${originalPromptContext.substring(0, 500)}..."

Please analyze the faulty JSON, correct its structure, and provide ONLY the valid JSON object for the story segment. Ensure all required fields are present and correctly typed according to the structure described. Do not include any explanatory text, only the corrected JSON object.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GENAI_MODEL_NAME,
      contents: fixPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const storyData = parseJsonFromText<GeminiStoryResponse>(response.text, true);

    if (!storyData || typeof storyData.sceneDescription !== 'string' || 
        (storyData.isUserInputCommandOnly === false && !Array.isArray(storyData.choices)) ||
        (storyData.isUserInputCommandOnly === true && (!Array.isArray(storyData.choices) || storyData.choices.length !== 0)) ||
        typeof storyData.imagePrompt !== 'string') {
        console.error("Invalid story data structure received after fix attempt:", storyData);
        throw new Error("Received incomplete or malformed story data from AI after fix attempt. Essential fields missing or inconsistent.");
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
      isFinalScene: typeof storyData.isFinalScene === 'boolean' ? storyData.isFinalScene : false,
      isFailureScene: typeof storyData.isFailureScene === 'boolean' ? storyData.isFailureScene : false,
      isUserInputCommandOnly: typeof storyData.isUserInputCommandOnly === 'boolean' ? storyData.isUserInputCommandOnly : false,
      itemFound: foundItem,
    };
  } catch (error) {
    throw handleError(error, "attemptToFixJson");
  }
};


export const fetchSceneExamination = async (
    currentSceneDescription: string,
    adventureGenre: string,
    adventureOutline: AdventureOutline,
    worldDetails: WorldDetails, 
    currentStageTitle: string,
    currentStageObjective: string,
    persona: Persona, 
    inventory: InventoryItem[]
): Promise<GeminiExaminationResponse> => {
    if (!ai) {
        throw new Error("Gemini API client not initialized. API_KEY might be missing.");
    }

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

Based on this, provide a more detailed "examinationText" of the scene. This text should:
- Elaborate on details already mentioned or hint at things not immediately obvious, drawing from the established World Context.
- Reveal subtle clues, interesting lore, or atmospheric details that are consistent with the world's features, history, or magic.
- Consider the player's persona (${genreSpecificPersonaTitle}) and items they possess for any specific insights they might gain, filtered through their understanding of this world.
- DO NOT advance the plot or introduce new choices. This is for observation only.
- Maintain the ${adventureGenre} tone, enriched by the world's specific genre clarification.
- Be 2-4 sentences long and concise.

Format the response STRICTLY as a JSON object:
{
  "examinationText": "A detailed description of the scene upon closer examination, revealing [specific details/lore/clues related to persona/items/world context as applicable]."
}
Respond ONLY with the valid JSON object.`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: GENAI_MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            },
        });
        const examinationData = parseJsonFromText<GeminiExaminationResponse>(response.text);
        if (!examinationData || typeof examinationData.examinationText !== 'string' || examinationData.examinationText.trim() === "") {
            console.error("Invalid examination data structure received:", examinationData);
            throw new Error("Received incomplete or malformed examination data from AI. 'examinationText' field is missing or empty.");
        }
        return examinationData;
    } catch (error) {
        throw handleError(error, "fetchSceneExamination");
    }
};

export const generateImage = async (prompt: string): Promise<string> => {
  if (!ai) {
    throw new Error("Imagen API client not initialized. API_KEY might be missing.");
  }

  try {
    const response = await ai.models.generateImages({
      model: IMAGEN_MODEL_NAME,
      prompt: prompt,
      config: { numberOfImages: 1, outputMimeType: "image/jpeg" },
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image.imageBytes) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      console.warn("No image generated or image data is missing for prompt:", prompt);
      return ""; 
    }
  } catch (error: any) {
    console.error("Error generating image:", error);
    if (error.message && (error.message.includes("RESOURCE_EXHAUSTED") || (error.toString && error.toString().includes("RESOURCE_EXHAUSTED")) )) {
        // Check for a status code if available, e.g. error.code === 429 or error.status === 'RESOURCE_EXHAUSTED'
        // For now, checking message content as per prompt.
        throw new ImageGenerationQuotaError("Image generation quota has been exceeded. This feature will be disabled for the remainder of your session.");
    }
    if (error.message && error.message.includes("API key not valid")) {
        throw new Error("Invalid API Key for image generation. Please check your configuration.");
    }
    throw new Error(error.message || "An unknown error occurred during image generation.");
  }
};