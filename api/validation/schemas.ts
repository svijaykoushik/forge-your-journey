import z from 'zod/v4';

const gameGenreSchema = z.enum([
  'Dark Fantasy',
  'Sci-Fi Detective',
  'Post-Apocalyptic Survival',
  'Mythological Epic',
  'Steampunk Chronicle',
  'Cosmic Horror'
]);

const personaSchema = z.enum([
  'Cautious Scholar',
  'Brave Warrior',
  'Cunning Rogue',
  'Mysterious Wanderer'
]);

export const adventrueOutlinePayload = z.object({
  genre: gameGenreSchema,
  persona: personaSchema
});

const adventureStageSchema = z.object({
  title: z.string(),
  description: z.string(),
  objective: z.string()
});

const adventureOutlineSchema = z.object({
  title: z.string(),
  overallGoal: z.string(),
  stages: z.array(adventureStageSchema)
});

const worldDetailsSchema = z.object({
  worldName: z.string(),
  genreClarification: z.string(),
  keyEnvironmentalFeatures: z.array(z.string()),
  dominantSocietiesOrFactions: z.array(z.string()),
  uniqueCreaturesOrMonsters: z.array(z.string()),
  magicSystemOverview: z.string(),
  briefHistoryHook: z.string(),
  culturalNormsOrTaboos: z.array(z.string())
});

const inventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string()
});

const choiceSchema = z.object({
  text: z.string(),
  outcomePrompt: z.string(),
  signalsStageCompletion: z.boolean().optional(),
  leadsToFailure: z.boolean().optional(),
  isExamineAction: z.boolean().optional()
});

const storySegmentSchema = z.object({
  sceneDescription: z.string(),
  choices: z.array(choiceSchema),
  imagePrompt: z.string(),
  imageUrl: z.string().optional(),
  isFinalScene: z.boolean().optional(),
  isFailureScene: z.boolean().optional(),
  itemFound: inventoryItemSchema.optional(),
  isUserInputCommandOnly: z.boolean().optional()
});

export const customActionEvaluationPayload = z.object({
  userInputText: z.string(),
  currentSegment: storySegmentSchema,
  adventureOutline: adventureOutlineSchema,
  worldDetails: worldDetailsSchema,
  selectedGenre: gameGenreSchema,
  selectedPersona: personaSchema,
  inventory: z.array(inventoryItemSchema),
  currentStageIndex: z.number()
});

export const fetchStorySegmentSchema = z.object({
  fullPrompt: z.string(),
  isInitialScene: z.boolean()
});

export const customActionOutcomePayloadSchema = z.object({
  userInputText: z.string(),
  currentSegment: storySegmentSchema,
  adventureOutline: adventureOutlineSchema,
  worldDetails: worldDetailsSchema,
  selectedGenre: gameGenreSchema,
  selectedPersona: personaSchema,
  inventory: z.array(inventoryItemSchema),
  currentStageIndex: z.number(),
  feasibilityContext: z.object({
    wasImpossible: z.boolean(),
    reasonForImpossibility: z.string().optional(),
    suggestionIfPossible: z.string().optional()
  })
});

export const attemptToFixJsonPayloadSchema = z.object({
  faultyJsonText: z.string(),
  originalPromptContext: z.string()
});

export const sceneExamiationPayloadSchema = z.object({
  currentSceneDescription: z.string(),
  adventureGenre: gameGenreSchema,
  adventureOutline: adventureOutlineSchema,
  worldDetails: worldDetailsSchema,
  currentStageTitle: z.string(),
  currentStageObjective: z.string(),
  persona: personaSchema,
  inventory: z.array(inventoryItemSchema)
});

export const loadSceneSchema = z.object({
  adventureOutline: adventureOutlineSchema,
  worldDetails: worldDetailsSchema,
  currentStageIndex: z.int(),
  selectedGenre: gameGenreSchema,
  selectedPersona: personaSchema,
  inventory: z.array(inventoryItemSchema)
});
