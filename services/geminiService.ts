
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { StorySegment, GeminiStoryResponse, AdventureOutline, GeminiAdventureOutlineResponse, AdventureStage, Persona, GeminiExaminationResponse, JsonParseError, InventoryItem, GeminiStoryResponseItemFound, WorldDetails, GeminiWorldDetailsResponse, genrePersonaDetails } from '../types';

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
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple - with single -
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
    throw new JsonParseError(detailedError, text); // text is the original, pre-processed text from AI.
  }
};

export const fetchAdventureOutline = async (genre: string, persona: Persona): Promise<AdventureOutline> => {
  if (!ai) {
    throw new Error("Gemini API client not initialized. API_KEY might be missing.");
  }
  // Persona is the base persona type, genrePersonaDetails is available if needed for prompt enrichment
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
    console.error("Error fetching adventure outline:", error);
    if (error instanceof Error && !(error instanceof JsonParseError)) {
        if (error.message.includes("API key not valid")) {
            throw new Error("Invalid API Key. Please check your configuration.");
        }
        if (error.message.includes("quota")) {
            throw new Error("API quota exceeded. Please try again later.");
        }
    }
    throw error;
  }
};

export const fetchWorldDetails = async (
  adventureOutline: AdventureOutline,
  persona: Persona, // Base persona
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

    // Basic validation
    if (!worldData || typeof worldData.worldName !== 'string' || worldData.worldName.trim() === "" ||
        !Array.isArray(worldData.keyEnvironmentalFeatures) || !Array.isArray(worldData.dominantSocietiesOrFactions) ||
        !Array.isArray(worldData.uniqueCreaturesOrMonsters) || typeof worldData.magicSystemOverview !== 'string' ||
        typeof worldData.briefHistoryHook !== 'string' || !Array.isArray(worldData.culturalNormsOrTaboos)) {
      console.error("Invalid world details structure received:", worldData);
      throw new Error("Received incomplete or malformed world details from AI. Essential fields are missing or have incorrect types.");
    }
    return worldData;
  } catch (error) {
    console.error("Error fetching world details:", error);
    if (error instanceof Error && !(error instanceof JsonParseError)) {
        if (error.message.includes("API key not valid")) {
            throw new Error("Invalid API Key. Please check your configuration.");
        }
        if (error.message.includes("quota")) {
            throw new Error("API quota exceeded. Please try again later.");
        }
    }
    throw error;
  }
};


export const fetchStorySegment = async (
  fullPrompt: string // This fullPrompt will now be constructed in App.tsx to include world details
): Promise<StorySegment> => {
  if (!ai) {
    throw new Error("Gemini API client not initialized. API_KEY might be missing.");
  }
  // The fullPrompt already contains instructions for JSON, persona, inventory, world details etc.
  // Ensure the final instruction for JSON only response is at the very end.
  const finalPrompt = `${fullPrompt}\n\nRespond ONLY with the valid JSON object as specified, without any surrounding text or markdown fences. The JSON object should include keys: sceneDescription, choices, imagePrompt, isFinalScene, and optionally itemFound (which itself is an object with 'name' and 'description' if an item is awarded).`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GENAI_MODEL_NAME,
      contents: finalPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const storyData = parseJsonFromText<GeminiStoryResponse>(response.text);
    
    if (!storyData || typeof storyData.sceneDescription !== 'string' || !Array.isArray(storyData.choices) || typeof storyData.imagePrompt !== 'string') {
        console.error("Invalid story data structure received:", storyData);
        throw new Error("Received incomplete or malformed story data from AI. Essential fields missing or 'choices' is not an array.");
    }
    storyData.choices.forEach((choice, index) => {
        if (!choice || typeof choice.text !== 'string' || typeof choice.outcomePrompt !== 'string' || typeof choice.signalsStageCompletion !== 'boolean') {
             console.error(`Malformed choice at index ${index}:`, choice);
            throw new Error(`Choice ${index + 1} is malformed. Expected 'text' (string), 'outcomePrompt' (string), 'signalsStageCompletion' (boolean). Received: ${JSON.stringify(choice)}`);
        }
    });

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
      choices: storyData.choices,
      imagePrompt: storyData.imagePrompt,
      isFinalScene: typeof storyData.isFinalScene === 'boolean' ? storyData.isFinalScene : false,
      itemFound: foundItem,
    };
  } catch (error) {
    console.error("Error fetching story segment:", error);
    if (error instanceof Error && !(error instanceof JsonParseError)) {
        if (error.message.includes("API key not valid")) {
            throw new Error("Invalid API Key. Please check your configuration.");
        }
        if (error.message.includes("quota")) {
            throw new Error("API quota exceeded. Please try again later.");
        }
    }
    throw error; 
  }
};

export const attemptToFixJson = async (
  faultyJsonText: string,
  originalPromptContext: string // The prompt that led to the faulty JSON
): Promise<StorySegment> => {
  if (!ai) {
    throw new Error("Gemini API client not initialized. API_KEY might be missing.");
  }

  const fixPrompt = `The following JSON response was received but is malformed:
\`\`\`json
${faultyJsonText}
\`\`\`

This response was for a request related to generating a story segment. The original request's core instructions were to produce a JSON object with keys: "sceneDescription" (string), "choices" (array of objects, each with "text" (string), "outcomePrompt" (string), and "signalsStageCompletion" (boolean)), "imagePrompt" (string), "isFinalScene" (boolean), and optionally "itemFound" (an object with "name" (string) and "description" (string)).
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

    if (!storyData || typeof storyData.sceneDescription !== 'string' || !Array.isArray(storyData.choices) || typeof storyData.imagePrompt !== 'string') {
        console.error("Invalid story data structure received after fix attempt:", storyData);
        throw new Error("Received incomplete or malformed story data from AI after fix attempt. Essential fields missing or 'choices' is not an array.");
    }
     storyData.choices.forEach((choice, index) => {
        if (!choice || typeof choice.text !== 'string' || typeof choice.outcomePrompt !== 'string' || typeof choice.signalsStageCompletion !== 'boolean') {
             console.error(`Malformed choice at index ${index} after fix attempt:`, choice);
            throw new Error(`Choice ${index + 1} (post-fix) is malformed. Expected 'text' (string), 'outcomePrompt' (string), 'signalsStageCompletion' (boolean).`);
        }
    });
    
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
      choices: storyData.choices,
      imagePrompt: storyData.imagePrompt,
      isFinalScene: typeof storyData.isFinalScene === 'boolean' ? storyData.isFinalScene : false,
      itemFound: foundItem,
    };
  } catch (error) {
    console.error("Error attempting to fix JSON:", error);
     if (error instanceof Error && !(error instanceof JsonParseError)) {
        if (error.message.includes("API key not valid")) {
            throw new Error("Invalid API Key for fix attempt. Please check your configuration.");
        }
        if (error.message.includes("quota")) {
            throw new Error("API quota exceeded during fix attempt. Please try again later.");
        }
    }
    if (!(error instanceof JsonParseError)) {
        throw new Error(`Failed during JSON fix attempt: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw error;
  }
};


export const fetchSceneExamination = async (
    currentSceneDescription: string,
    adventureGenre: string,
    adventureOutline: AdventureOutline,
    worldDetails: WorldDetails, 
    currentStageTitle: string,
    currentStageObjective: string,
    persona: Persona, // Base persona
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
- Be 2-4 sentences long.

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
        console.error("Error fetching scene examination:", error);
        if (error instanceof Error && !(error instanceof JsonParseError)) {
            if (error.message.includes("API key not valid")) {
                throw new Error("Invalid API Key. Please check your configuration.");
            }
            if (error.message.includes("quota")) {
                throw new Error("API quota exceeded. Please try again later.");
            }
        }
        throw error;
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
  } catch (error) {
    console.error("Error generating image:", error);
    throw error; 
  }
};
