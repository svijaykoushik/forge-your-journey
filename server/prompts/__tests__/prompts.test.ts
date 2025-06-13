import {
  generateAdventureOutlinePrompt,
  generateWorldDetailsPrompt,
  generateStorySegmentPrompt,
  generateActionFeasibilityPrompt,
  generateCustomActionOutcomePrompt,
  generateAttemptToFixJsonPrompt,
  generateSceneExaminationPrompt,
  genrePersonaDetails
} from '../prompts'; // Removed .js extension
import { AdventureOutline, Persona, StorySegment, WorldDetails, GameGenre, InventoryItem } from '../../../types'; // Removed .js extension

describe('server/prompts.ts', () => {
  // Mock data for testing prompts
  const mockGenre: GameGenre = 'Dark Fantasy';
  const mockPersona: Persona = 'Brave Warrior';
  const mockAdventureOutline: AdventureOutline = {
    title: 'The Sunless Citadel',
    overallGoal: 'Reclaim the Sunstone from the heart of the citadel.',
    stages: [
      { title: 'Entry', description: 'Breach the citadel gates.', objective: 'Find a way in.' },
      { title: 'The Undercroft', description: 'Navigate the haunted halls.', objective: 'Reach the inner sanctum.' },
      { title: 'Sanctum of Shadows', description: 'Confront the guardian and claim the Sunstone.', objective: 'Defeat the guardian.' },
    ],
  };
  const mockWorldDetails: WorldDetails = {
    worldName: 'Aethel',
    genreClarification: 'Gritty low-magic fantasy',
    keyEnvironmentalFeatures: ['A perpetual twilight covers the land', 'Twisted, thorny forests'],
    dominantSocietiesOrFactions: ['The Iron Concord (human supremacists)', 'The Silent Hand (thieves guild)'],
    uniqueCreaturesOrMonsters: ['Gloomfang Wyrm', 'Shadow Stalkers'],
    magicSystemOverview: 'Magic is rare and dangerous, often corrupting its users.',
    briefHistoryHook: 'A great war centuries ago shattered the old kingdoms, leaving behind ruins and bitterness.',
    culturalNormsOrTaboos: ['Never trust a sorcerer', 'Obsidian is a symbol of bad luck'],
  };
  const mockCurrentSegment: StorySegment = {
    sceneDescription: 'You stand before a crumbling fortress, an eerie silence blanketing the air.',
    choices: [],
    imagePrompt: 'A crumbling fortress under a dark sky.',
    isUserInputCommandOnly: true,
  };
  const mockInventory: InventoryItem[] = [
    { id: 'torch', name: 'Torch', description: 'A flickering torch to light your way.' },
  ];

  describe('generateAdventureOutlinePrompt', () => {
    it('should generate the correct prompt for adventure outline', () => {
      const prompt = generateAdventureOutlinePrompt(mockGenre, mockPersona);
      expect(prompt).toContain(mockGenre);
      expect(prompt).toContain(genrePersonaDetails[mockGenre]?.[mockPersona]?.title || mockPersona);
      expect(prompt).toMatchSnapshot();
    });
  });

  describe('generateWorldDetailsPrompt', () => {
    it('should generate the correct prompt for world details', () => {
      const prompt = generateWorldDetailsPrompt(mockAdventureOutline, mockPersona, mockGenre);
      expect(prompt).toContain(mockAdventureOutline.title);
      expect(prompt).toContain(mockAdventureOutline.overallGoal);
      expect(prompt).toContain(genrePersonaDetails[mockGenre]?.[mockPersona]?.title || mockPersona);
      expect(prompt).toMatchSnapshot();
    });
  });

  describe('generateStorySegmentPrompt', () => {
    const baseFullPrompt = `The player chose to open the ancient chest.`;
    it('should generate the correct prompt for an initial story segment', () => {
      const prompt = generateStorySegmentPrompt(baseFullPrompt, true);
      expect(prompt).toContain(baseFullPrompt);
      expect(prompt).toContain('For this initial scene');
      expect(prompt).toMatchSnapshot();
    });
    it('should generate the correct prompt for a subsequent story segment', () => {
      const prompt = generateStorySegmentPrompt(baseFullPrompt, false);
      expect(prompt).toContain(baseFullPrompt);
      expect(prompt).toContain('For subsequent scenes');
      expect(prompt).toMatchSnapshot();
    });
  });

  describe('generateActionFeasibilityPrompt', () => {
    it('should generate the correct prompt for action feasibility', () => {
      const userInput = 'I try to scale the fortress wall.';
      const prompt = generateActionFeasibilityPrompt(
        userInput,
        mockCurrentSegment,
        mockAdventureOutline,
        mockWorldDetails,
        mockGenre,
        mockPersona,
        mockInventory,
        0 // currentStageIndex
      );
      expect(prompt).toContain(userInput);
      expect(prompt).toContain(mockCurrentSegment.sceneDescription);
      expect(prompt).toContain(mockAdventureOutline.title);
      expect(prompt).toContain(mockWorldDetails.worldName);
      expect(prompt).toContain(mockInventory[0].name);
      expect(prompt).toMatchSnapshot();
    });
  });

  describe('generateCustomActionOutcomePrompt', () => {
    const userInput = 'I use my torch to light the way.';
    const feasibilityContextPossible = {
        wasImpossible: false,
        suggestionIfPossible: "The torch reveals a hidden inscription."
    };
    const feasibilityContextImpossible = {
        wasImpossible: true,
        reasonForImpossibility: "The torch is too damp to light."
    };

    it('should generate the correct prompt for a possible custom action outcome', () => {
      const prompt = generateCustomActionOutcomePrompt(
        userInput,
        mockCurrentSegment,
        mockAdventureOutline,
        mockWorldDetails,
        mockGenre,
        mockPersona,
        mockInventory,
        0, // currentStageIndex
        feasibilityContextPossible
      );
      expect(prompt).toContain(userInput);
      expect(prompt).toContain(feasibilityContextPossible.suggestionIfPossible);
      expect(prompt).toMatchSnapshot();
    });

    it('should generate the correct prompt for an impossible custom action outcome', () => {
      const prompt = generateCustomActionOutcomePrompt(
        userInput,
        mockCurrentSegment,
        mockAdventureOutline,
        mockWorldDetails,
        mockGenre,
        mockPersona,
        mockInventory,
        0, // currentStageIndex
        feasibilityContextImpossible
      );
      expect(prompt).toContain(userInput);
      expect(prompt).toContain(feasibilityContextImpossible.reasonForImpossibility);
      expect(prompt).toMatchSnapshot();
    });
  });

  describe('generateAttemptToFixJsonPrompt', () => {
    it('should generate the correct prompt for attempting to fix JSON', () => {
      const faultyJson = '{"name": "Test", "description": "A test object",'; // Missing closing brace
      const originalContext = 'User was trying to create an item.';
      const prompt = generateAttemptToFixJsonPrompt(faultyJson, originalContext);
      expect(prompt).toContain(faultyJson);
      expect(prompt).toContain(originalContext.substring(0,500));
      expect(prompt).toMatchSnapshot();
    });
  });

  describe('generateSceneExaminationPrompt', () => {
    it('should generate the correct prompt for scene examination', () => {
      const prompt = generateSceneExaminationPrompt(
        mockCurrentSegment.sceneDescription,
        mockGenre,
        mockAdventureOutline,
        mockWorldDetails,
        mockAdventureOutline.stages[0].title,
        mockAdventureOutline.stages[0].objective,
        mockPersona,
        mockInventory
      );
      expect(prompt).toContain(mockCurrentSegment.sceneDescription);
      expect(prompt).toContain(mockWorldDetails.worldName);
      expect(prompt).toContain(mockInventory[0].name);
      expect(prompt).toMatchSnapshot();
    });
  });
});
