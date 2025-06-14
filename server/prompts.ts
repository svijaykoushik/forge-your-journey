import {
  AdventureOutline,
  Persona,
  StorySegment,
  WorldDetails,
  GenreSpecificPersonaDetails,
  InventoryItem,
  GameGenre, // Renamed from keyof GenreSpecificPersonaDetails for clarity
  AdventureStage // Added for typing map callback
} from '../types.js'; // Added .js extension

// Copied from types.ts
export const genrePersonaDetails: GenreSpecificPersonaDetails = {
  'Dark Fantasy': {
    'Cautious Scholar': {
      title: 'Lorekeeper of Shadows',
      description:
        'Scours forbidden texts and ancient ruins, believing knowledge is the only shield against the encroaching darkness.'
    },
    'Brave Warrior': {
      title: 'Grim Warden',
      description:
        'A stoic defender standing against nightmarish beasts and corrupting influences, their blade a beacon in the gloom.'
    },
    'Cunning Rogue': {
      title: 'Grave Robber',
      description:
        'Navigates treacherous crypts and haunted ruins, using stealth and guile to unearth forgotten treasures and survive.'
    },
    'Mysterious Wanderer': {
      title: 'Curse-Touched Nomad',
      description:
        'A solitary figure bearing a mysterious affliction, their path entwined with grim prophecies and the decaying remnants of forgotten kingdoms.'
    }
  },
  'Sci-Fi Detective': {
    'Cautious Scholar': {
      title: 'Data Forensics Analyst',
      description:
        'Meticulously sifts through corrupted data logs and encrypted corporate networks to uncover digital trails and expose high-tech conspiracies.'
    },
    'Brave Warrior': {
      title: 'Cybernetic Enforcer',
      description:
        'A city police officer or corporate agent with advanced combat augments, unafraid to confront dangerous syndicates in neon-lit alleyways.'
    },
    'Cunning Rogue': {
      title: 'Information Broker',
      description:
        "A master of infiltration and social engineering, navigating the digital underworld and trading secrets in the city's hidden data havens."
    },
    'Mysterious Wanderer': {
      title: 'Off-World Investigator',
      description:
        "An enigmatic detective from a distant colony, observing the city's deep-seated corruption with an outsider's perspective and a hidden agenda."
    }
  },
  'Post-Apocalyptic Survival': {
    'Cautious Scholar': {
      title: 'Wasteland Historian',
      description:
        "Preserves fragments of pre-cataclysm knowledge, seeking to understand the old world's fall to avoid repeating its mistakes."
    },
    'Brave Warrior': {
      title: 'Settlement Guardian',
      description:
        'Protects their small community from mutants, raiders, and the harsh elements, embodying resilience in a broken world.'
    },
    'Cunning Rogue': {
      title: 'Ruin Scavenger',
      description:
        'Expertly navigates the treacherous ruins of the old world, using stealth and resourcefulness to find valuable supplies.'
    },
    'Mysterious Wanderer': {
      title: 'Lone Survivor',
      description:
        'A hardened individual drifting through the desolate wastes, their past a mystery, driven by an unknown purpose or merely the will to endure.'
    }
  },
  'Mythological Epic': {
    'Cautious Scholar': {
      title: "Oracle's Acolyte",
      description:
        'Studies ancient prophecies and divine lore, seeking wisdom from the gods to guide mortals through legendary trials.'
    },
    'Brave Warrior': {
      title: 'Demigod Hero',
      description:
        'Possessing divine blood or blessed by the gods, embarks on epic quests to battle mythical beasts and challenge fate.'
    },
    'Cunning Rogue': {
      title: "Trickster's Chosen",
      description:
        'Favored by a deity of cunning, uses wit and trickery to outsmart mortals and monsters alike, often blurring the line between hero and anti-hero.'
    },
    'Mysterious Wanderer': {
      title: 'Exiled Deity',
      description:
        'A lesser god or spirit stripped of their power, wandering the mortal realm, seeking redemption or a way to reclaim their divinity.'
    }
  },
  'Steampunk Chronicle': {
    'Cautious Scholar': {
      title: 'Clockwork Theorist',
      description:
        'Delves into the intricacies of automatons and aetheric science, always on the verge of the next groundbreaking (and possibly dangerous) invention.'
    },
    'Brave Warrior': {
      title: 'Sky Captain',
      description:
        'Commands a magnificent airship, bravely exploring uncharted territories and defending against sky pirates with steam-powered weaponry.'
    },
    'Cunning Rogue': {
      title: 'Gear-Driven Infiltrator',
      description:
        'Utilizes ingenious gadgets and knowledge of mechanical contraptions to bypass security and acquire sensitive information or artifacts.'
    },
    'Mysterious Wanderer': {
      title: 'Time-Displaced Inventor',
      description:
        'An anachronistic genius from another era or dimension, observing this steam-powered world with a unique perspective and revolutionary ideas.'
    }
  },
  'Cosmic Horror': {
    'Cautious Scholar': {
      title: 'Forbidden Scholar',
      description:
        'Obsessively researches sanity-shattering texts and cultic rituals, driven to understand the incomprehensible entities from beyond.'
    },
    'Brave Warrior': {
      title: 'Doomed Investigator',
      description:
        'Attempts to confront the unnamable horrors, knowing their strength is likely futile against cosmic indifference, but fighting nonetheless.'
    },
    'Cunning Rogue': {
      title: 'Cult Infiltrator',
      description:
        'Navigates the shadowy fringes of society, dealing with deranged cultists and eldritch artifacts, always one step away from madness or a grisly end.'
    },
    'Mysterious Wanderer': {
      title: 'Touched by the Void',
      description:
        'An individual who has glimpsed the abyss and survived, forever changed, wandering the world as a harbinger or a seeker of oblivion.'
    }
  }
};

export const generateAdventureOutlinePrompt = (
  genre: GameGenre,
  persona: Persona
): string => {
  const genreSpecificPersonaTitle =
    genrePersonaDetails[genre]?.[persona]?.title || persona;
  return `You are a master storyteller and game designer. Generate a compelling adventure outline for a text-based RPG.
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
};

export const generateWorldDetailsPrompt = (
  adventureOutline: AdventureOutline,
  persona: Persona,
  genre: GameGenre
): string => {
  const genreSpecificPersonaTitle =
    genrePersonaDetails[genre]?.[persona]?.title || persona;
  return `You are a world-building AI. Based on the provided adventure outline, player persona, and genre, generate detailed world information.
Adventure Title: "${adventureOutline.title}"
Overall Goal: "${adventureOutline.overallGoal}"
Adventure Stages:
${adventureOutline.stages.map((s: AdventureStage, i: number) => `  Stage ${i + 1}: "${s.title}" - ${s.description} (Objective: ${s.objective})`).join('\n')}
Player Persona: "${genreSpecificPersonaTitle}" (base archetype: ${persona})
Adventure Genre: ${genre}

Generate rich and interconnected world details. These details should directly influence the atmosphere, potential encounters, challenges, and items within the adventure.
The player's persona (${genreSpecificPersonaTitle}, archetype ${persona}) might have unique insights or connections to certain aspects of this world.

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
};

export const generateStorySegmentPrompt = (
  fullPrompt: string, // This is the initial, context-specific part of the prompt
  isInitialScene: boolean = false
): string => {
  // This is the "augmentedPrompt" logic from geminiService.ts
  return `${fullPrompt}

General Content Instructions for Story Segment:
- For the 'sceneDescription' field:
    - ${
      isInitialScene
        ? 'For this initial scene, or if the player is entering a new major location/area, ensure the sceneDescription is immersive and establishes the setting and atmosphere effectively (approx. 3-5 sentences).'
        : "For subsequent scenes, the sceneDescription should be vivid yet concise (approx. 2-4 sentences). If the player's choice outcome (detailed in the prompt above) implies travel, a simple or mundane action, or is primarily transitional, aim for focused brevity (approx. 1-3 sentences), highlighting only essential changes, observations, or the direct result of the action."
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
};

export const generateActionFeasibilityPrompt = (
  userInputText: string,
  currentSegment: StorySegment,
  adventureOutline: AdventureOutline,
  worldDetails: WorldDetails,
  selectedGenre: GameGenre,
  selectedPersona: Persona,
  inventory: InventoryItem[],
  currentStageIndex: number
): string => {
  const genreSpecificPersonaTitle =
    genrePersonaDetails[selectedGenre]?.[selectedPersona]?.title ||
    selectedPersona;
  const personaContext = `The player is a ${genreSpecificPersonaTitle} (base persona: ${selectedPersona}).`;
  const inventoryContext =
    inventory.length > 0
      ? `The player possesses: ${inventory.map((item) => `'${item.name}' (described as: ${item.description})`).join(', ')}.`
      : 'The player possesses no items yet.';
  const currentStage = adventureOutline.stages[currentStageIndex];
  const worldContext = `
World Context for Evaluation:
World Name: "${worldDetails.worldName}" (Genre Clarification: ${worldDetails.genreClarification})
Key Environment: ${worldDetails.keyEnvironmentalFeatures.join('; ') || 'N/A'}
Societies/Factions: ${worldDetails.dominantSocietiesOrFactions.join('; ') || 'N/A'}
Creatures/Monsters: ${worldDetails.uniqueCreaturesOrMonsters.join('; ') || 'N/A'}
Magic System: ${worldDetails.magicSystemOverview}
History Hook: ${worldDetails.briefHistoryHook}
Cultural Norms/Taboos: ${worldDetails.culturalNormsOrTaboos.join('; ') || 'N/A'}`;

  return `You are an AI game master evaluating a player's custom action in a text-based RPG.
Adventure Genre: ${selectedGenre}.
${personaContext}
Player's Current Inventory: ${inventoryContext}
${worldContext}
Overall Adventure Title: "${adventureOutline.title}"
Ultimate Goal: "${adventureOutline.overallGoal}"
Current Stage ${currentStageIndex + 1}: "${currentStage.title}" (Objective: "${currentStage.objective}").
Current Scene Description: "${currentSegment.sceneDescription}"
Player's proposed custom action: "${userInputText}"

Your task is to evaluate this action and respond with JSON.
Consider:
- Plausibility: Is the action physically possible in this scene?
- Sensibility: Does it make sense given the character, genre, and world?
- Rules: Does it violate any established game rules, world logic (magic system, cultural taboos), or the tone of the ${selectedGenre} genre?
- Safety: Is it absurdly self-destructive without clear motivation?
- Inventory: Could any inventory items make this action more or less feasible?
- Appropriateness: Sanitize user input. Do not reflect harmful, offensive, or extreme role-play-breaking input directly. If input is inappropriate, deem it 'not possible' and explain gently.

Based on your evaluation, fill the following JSON fields:
- 'isPossible' (boolean): True if the action is plausible and can be attempted. False if impossible, nonsensical, or breaks rules/tone.
- 'reason' (string): Concise explanation. If not possible, clearly state why. If possible, briefly explain its plausibility or what it might affect.
- 'suggestedOutcomeSummaryIfPossible' (string, optional): If 'isPossible' is true, a very brief (1-2 sentence) summary of a likely immediate consequence or next step. Omit if not possible or outcome is too complex to summarize.`;
};

export const generateCustomActionOutcomePrompt = (
  userInputText: string,
  currentSegment: StorySegment,
  adventureOutline: AdventureOutline,
  worldDetails: WorldDetails,
  selectedGenre: GameGenre,
  selectedPersona: Persona,
  inventory: InventoryItem[],
  currentStageIndex: number,
  feasibilityContext: {
    wasImpossible: boolean;
    reasonForImpossibility?: string;
    suggestionIfPossible?: string;
  }
): string => {
  const genreSpecificPersonaTitle =
    genrePersonaDetails[selectedGenre]?.[selectedPersona]?.title ||
    selectedPersona;
  const personaContext = `The player is a ${genreSpecificPersonaTitle} (base persona: ${selectedPersona}).`;
  const inventoryContext =
    inventory.length > 0
      ? `The player possesses: ${inventory.map((item) => `'${item.name}' (described as: ${item.description})`).join(', ')}.`
      : 'The player possesses no items yet.';
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

  let actionNarrativeContext: string;
  if (feasibilityContext.wasImpossible) {
    actionNarrativeContext = `The player previously attempted the action: "${userInputText}".
This action was deemed not possible. The stated reason was: "${feasibilityContext.reasonForImpossibility || 'No specific reason provided, but it was not feasible.'}"
Your task is to narrate the character attempting this action and it either failing, or them realizing its impossibility based on the reason. The sceneDescription should reflect this attempt and its immediate non-success. The situation should change slightly from the previous scene.
Then, provide new choices or set 'isUserInputCommandOnly: true' to allow the player to move on from this failed/impossible attempt. The new choices MUST NOT simply repeat the choices from before the impossible action was attempted.`;
  } else {
    actionNarrativeContext = `The player is performing the custom action: "${userInputText}".
This action has been evaluated as possible. ${feasibilityContext.suggestionIfPossible ? `A potential outcome summary was: "${feasibilityContext.suggestionIfPossible}". Use this as a light suggestion if helpful.` : ''}
Your task is to narrate the outcome of this action.
Consider if any inventory items (listed in "Player's Current Inventory") could logically assist, hinder, or alter the outcome. If an item is relevant, the 'sceneDescription' content MUST narrate how the item is used or its effect.`;
  }

  return `You are a master storyteller for a dynamic text-based RPG adventure game.
Adventure Genre: ${selectedGenre}.
${personaContext}
Player's Current Inventory: ${inventoryContext}
${worldContext}
The overall adventure is titled: "${adventureOutline.title}".
The player's ultimate goal is: "${adventureOutline.overallGoal}".
Current Stage ${currentStageIndex + 1}: "${currentStage.title}" (Objective: "${currentStage.objective}").
Previous Scene Description was: "${currentSegment.sceneDescription}"

${actionNarrativeContext}

General Content Instructions for Story Segment:
- For the 'sceneDescription' field: Narrate the outcome (2-3 short paragraphs, varied sentences, paragraphs separated by \\n\\n in the string).
- For the 'choices' array (if 'isUserInputCommandOnly' is false): Provide 3 new distinct choice OBJECTS relevant to the new situation. Each choice object requires: 'text', 'outcomePrompt', 'signalsStageCompletion' (boolean), and 'leadsToFailure' (boolean).
- For 'isUserInputCommandOnly' (boolean): Set to true if appropriate for the new scene, ensuring 'choices' array is empty.
- For 'imagePrompt' (string): New image prompt matching the new scene.
- For 'isFinalScene' (boolean): True if this action leads to successful adventure completion.
- For 'isFailureScene' (boolean): True if this action leads to game failure.
- For 'itemFound' (object, optional): Award an item if logical (provide 'name' and 'description').
Sanitize original user input: Do not directly reflect harmful, offensive, or role-play-breaking user input in your narration if it was part of the original "${userInputText}". Focus on the game world's reaction.`;
};

export const generateAttemptToFixJsonPrompt = (
  faultyJsonText: string,
  originalPromptContext: string // This is the 'contents' of the original payload
): string => {
  return `The following JSON response was received but is malformed:
\`\`\`json
${faultyJsonText}
\`\`\`

This response was for a request related to generating a story segment. The original request's core instructions were to produce a JSON object with keys: "sceneDescription" (string, formatted into 2-3 short paragraphs with varied sentence structure, paragraphs separated by \\n\\n), "choices" (array of objects, each object with "text" (string), "outcomePrompt" (string), "signalsStageCompletion" (boolean), and "leadsToFailure" (boolean)), "imagePrompt" (string), "isFinalScene" (boolean), "isFailureScene" (boolean), "isUserInputCommandOnly" (boolean), and optionally "itemFound" (an object with "name" (string) and "description" (string)).
If "isUserInputCommandOnly" is true, "choices" array must be empty.
The context of the original prompt included aspects like:
"${originalPromptContext.substring(0, 500)}..."

Please analyze the faulty JSON, correct its structure, and provide ONLY the valid JSON object for the story segment. Ensure all required fields are present and correctly typed according to the structure described, especially the "sceneDescription" formatting and the structure of objects within the "choices" array. Do not include any explanatory text, only the corrected JSON object.`;
};

export const generateSceneExaminationPrompt = (
  currentSceneDescription: string,
  adventureGenre: GameGenre,
  adventureOutline: AdventureOutline,
  worldDetails: WorldDetails,
  currentStageTitle: string,
  currentStageObjective: string,
  persona: Persona,
  inventory: InventoryItem[]
): string => {
  const genreSpecificPersonaTitle =
    genrePersonaDetails[adventureGenre]?.[persona]?.title || persona;
  const personaContext = `The player examining is a ${genreSpecificPersonaTitle} (base archetype: ${persona}).`;
  const inventoryContext =
    inventory.length > 0
      ? `They possess: ${inventory.map((item) => item.name).join(', ')}.`
      : 'They possess no items.';
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
  return `You are a master storyteller. The player wants to examine their current surroundings more closely.
Adventure Title: "${adventureOutline.title}"
Overall Goal: "${adventureOutline.overallGoal}"
Current Stage: "${currentStageTitle}" (Objective: "${currentStageObjective}")
${personaContext}
${inventoryContext}
${worldContext}

Current Scene Description (what the player already sees):
"${currentSceneDescription}"

Based on this, provide content for the 'examinationText' field. This text should:
- Elaborate on details already mentioned or hint at things not immediately obvious.
- Describe the immediate surroundings of the player's current location, providing sensory details that help the player to visually or spatially understand the layout of the area they are in.
- Reveal subtle clues, interesting lore, or atmospheric details.
- All details provided (elaborations, surroundings, clues, lore) MUST be consistent with and draw from the established World Context (environment, societies, creatures, magic, history, culture) provided above.
- Consider the player's persona (${genreSpecificPersonaTitle} -- base archetype: ${persona}) and items they possess for any specific insights they might gain, filtered through their understanding of this world.
- DO NOT advance the plot or introduce new choices. This is for observation only.
- Maintain the ${adventureGenre} tone, enriched by the world's specific genre clarification.
- Be 2-4 sentences long and concise. Employ varied sentence structures.`;
};
