import { Schema, Type } from '@google/genai';

export const AdventureOutlineStageSchema: Schema = {
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

export const AdventureOutlineSchema: Schema = {
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

export const WorldDetailsSchema: Schema = {
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

export const StorySegmentChoiceSchema: Schema = {
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

export const StorySegmentItemFoundSchema: Schema = {
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

export const StorySegmentSchema: Schema = {
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

export const ExaminationSchema: Schema = {
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

export const ActionFeasibilitySchema: Schema = {
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
