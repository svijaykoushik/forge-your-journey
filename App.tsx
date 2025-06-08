import React, { useCallback, useEffect, useState } from 'react';
import ChoicePanel from './components/ChoicePanel';
import ExaminationModal from './components/ExaminationModal';
import GenreSelection from './components/GenreSelection';
import InventoryDisplay from './components/InventoryDisplay';
import JournalLog from './components/JournalLog';
import LoadingSpinner from './components/LoadingSpinner';
import PersonaSelection from './components/PersonaSelection';
import ResumeModal from './components/ResumeModal';
import StoryDisplay from './components/StoryDisplay';
import {
  attemptToFixJson,
  fetchAdventureOutline,
  fetchCustomActionOutcome,
  fetchSceneExamination,
  fetchStorySegment,
  fetchWorldDetails,
  generateImage
} from './services/geminiService';
import {
  Choice,
  GameGenre,
  GameState,
  genrePersonaDetails,
  ImageGenerationQuotaError,
  JournalEntry,
  JsonParseError,
  Persona,
  SavableGameState,
  StorySegment
} from './types';

const LOCAL_STORAGE_KEY = 'forgeYourJourney_v1';
const IMAGE_QUOTA_DISABLED_KEY = 'forgeYourJourney_imageQuotaDisabled_v1';

const outlineLoadingTexts = [
  "Forging a new world's skeleton...",
  'Consulting ancient maps for an outline...',
  "Seeking cosmic inspiration for the adventure's path...",
  'The mists of creation stir, revealing a basic quest...',
  "A new legend's blueprint is being drafted..."
];
const worldLoadingTexts = [
  'Sculpting continents and forbidden lands...',
  'Defining cultural tapestries and ancient laws...',
  "Breathing life into the world's lore and creatures...",
  'Mapping the unseen realms and their secrets...',
  "The world takes shape from the outline's core..."
];
const storyLoadingTexts = [
  'Weaving the threads of fate within the new world...',
  "The storyteller ponders, influenced by the world's echoes...",
  'Unveiling the next chapter, rich with world details...',
  'Listening to the choices that resonate through this realm...',
  'The path unfolds, shaped by the world itself...',
  'Considering your bold move...',
  'The world reacts to your decision...'
];
const imageLoadingTexts = [
  "Capturing the scene's essence from this specific world...",
  "The artist's brush takes flight, painting world-specific visuals...",
  'Visualizing the unseen corners of this realm...',
  "Painting with pixels and magic, true to the world's nature...",
  'Awaiting a glimpse of this unique world...'
];
const examinationLoadingTexts = [
  "Peering deeper into the world's shadows...",
  'Uncovering hidden details unique to this realm...',
  'The world reveals its intricate secrets...'
];
const fixJsonLoadingTexts = [
  "Attempting to repair story data, mindful of the world's consistency...",
  'The AI is re-evaluating its response within the established world...',
  "Working to fix the narrative flow, aligned with the world's lore..."
];
const customActionLoadingTexts = [
  'The threads of fate respond to your will...',
  'Evaluating your custom action...',
  'The world considers your input...'
];

const getRandomLoadingText = (textArray: string[]) =>
  textArray[Math.floor(Math.random() * textArray.length)];

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    selectedGenre: null,
    selectedPersona: null,
    adventureOutline: null,
    worldDetails: null,
    currentSegment: null,
    currentStageIndex: 0,
    isLoadingOutline: false,
    isLoadingWorld: false,
    isLoadingStory: false,
    isLoadingImage: false,
    error: null,
    // apiKeyMissing: typeof process.env.API_KEY !== 'string' || process.env.API_KEY === '', // REMOVED
    apiKeyMissing: false, // API Key is now server-side, client doesn't check it directly.
    isGameEnded: false,
    isGameFailed: false,
    journal: [],
    inventory: [],
    lastRetryInfo: null,
    imageGenerationPermanentlyDisabled: false
  });

  const [showResumeModal, setShowResumeModal] = useState(false);
  const [initialLoadedState, setInitialLoadedState] =
    useState<SavableGameState | null>(null);
  const [isSelectingGenre, setIsSelectingGenre] = useState(false);
  const [isSelectingPersona, setIsSelectingPersona] = useState(false);
  const [currentLoadingText, setCurrentLoadingText] = useState<string>('');
  const [showExaminationModal, setShowExaminationModal] = useState(false);
  const [examinationText, setExaminationText] = useState<string | null>(null);
  const [isLoadingExamination, setIsLoadingExamination] = useState(false);
  const [isJournalOpenOnMobile, setIsJournalOpenOnMobile] = useState(false);
  const [isInventoryOpenOnMobile, setIsInventoryOpenOnMobile] = useState(false);

  const [imageGenerationFeatureEnabled, setImageGenerationFeatureEnabled] =
    useState(true);
  const [showImageQuotaNotification, setShowImageQuotaNotification] =
    useState(false);

  useEffect(() => {
    const storedQuotaDisabled =
      localStorage.getItem(IMAGE_QUOTA_DISABLED_KEY) === 'true';
    setGameState((prev) => ({
      ...prev,
      imageGenerationPermanentlyDisabled: storedQuotaDisabled
    }));

    setImageGenerationFeatureEnabled(!storedQuotaDisabled);
  }, []);

  const addJournalEntry = useCallback(
    (type: JournalEntry['type'], content: string) => {
      setGameState((prev) => ({
        ...prev,
        journal: [
          ...prev.journal,
          { type, content, timestamp: new Date().toISOString() }
        ]
      }));
    },
    []
  );

  useEffect(() => {
    // API Key check removed from here, as it's handled by proxy.
    // If proxy fails due to key, an error will be set through normal API call flow.

    const savedGameJson = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedGameJson) {
      try {
        const loadedState = JSON.parse(savedGameJson) as SavableGameState;
        if (
          loadedState.selectedGenre &&
          loadedState.selectedPersona &&
          loadedState.adventureOutline &&
          loadedState.worldDetails &&
          typeof loadedState.currentStageIndex === 'number' &&
          loadedState.currentSegment &&
          Array.isArray(loadedState.journal) &&
          Array.isArray(loadedState.inventory) &&
          typeof loadedState.isGameFailed === 'boolean' &&
          typeof loadedState.imageGenerationPermanentlyDisabled === 'boolean'
        ) {
          setInitialLoadedState(loadedState);
          setShowResumeModal(true);
          setGameState((prev) => ({
            ...prev,
            imageGenerationPermanentlyDisabled:
              loadedState.imageGenerationPermanentlyDisabled
          }));
          setImageGenerationFeatureEnabled(
            imageGenerationFeatureEnabled &&
              !loadedState.imageGenerationPermanentlyDisabled
          );
        } else {
          console.warn(
            'Saved game state was missing essential fields. Discarding.'
          );
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          setIsSelectingGenre(true);
        }
      } catch (e) {
        console.error('Failed to parse saved game state:', e);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setIsSelectingGenre(true);
      }
    } else {
      setIsSelectingGenre(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed gameState.apiKeyMissing from dependencies

  const handleGenreSelected = (genre: GameGenre) => {
    addJournalEntry('genre_selected', `Selected genre: ${genre}.`);
    setGameState((prev) => ({
      ...prev,
      selectedGenre: genre,
      selectedPersona: null,
      adventureOutline: null,
      worldDetails: null,
      currentSegment: null,
      currentStageIndex: 0,
      isGameEnded: false,
      isGameFailed: false,
      inventory: [],
      lastRetryInfo: null,
      error: null,
      journal: prev.journal.filter(
        (entry) =>
          entry.type === 'genre_selected' ||
          (entry.type === 'system' &&
            entry.content.includes('Image generation disabled'))
      )
    }));
    setIsSelectingGenre(false);
    setIsSelectingPersona(true);
  };

  const handlePersonaSelected = (persona: Persona) => {
    const genreSpecificTitle = gameState.selectedGenre
      ? genrePersonaDetails[gameState.selectedGenre]?.[persona]?.title ||
        persona
      : persona;
    addJournalEntry('persona_selected', `${genreSpecificTitle}.`);

    setGameState((prev) => ({
      ...prev,
      selectedPersona: persona,
      isLoadingOutline: true,
      isLoadingWorld: false,
      worldDetails: null,
      lastRetryInfo: null,
      inventory: prev.selectedPersona === persona ? prev.inventory : []
    }));
    setIsSelectingPersona(false);
  };

  useEffect(() => {
    if (
      gameState.isLoadingOutline &&
      gameState.selectedGenre &&
      gameState.selectedPersona &&
      !gameState.adventureOutline &&
      !gameState.apiKeyMissing
    ) {
      // apiKeyMissing check can stay as a general guard
      const loadNewOutline = async () => {
        setGameState((prev) => ({
          ...prev,
          error: null,
          isLoadingWorld: false
        }));
        setCurrentLoadingText(getRandomLoadingText(outlineLoadingTexts));
        const genreSpecificPersonaTitle =
          genrePersonaDetails[gameState.selectedGenre!][
            gameState.selectedPersona!
          ]?.title || gameState.selectedPersona;
        addJournalEntry(
          'system',
          `Starting new adventure: ${gameState.selectedGenre} - ${genreSpecificPersonaTitle}. Generating outline...`
        );
        try {
          const outline = await fetchAdventureOutline(
            gameState.selectedGenre!,
            gameState.selectedPersona!
          );
          addJournalEntry(
            'system',
            `Adventure outline "${outline.title}" generated.`
          );
          setGameState((prev) => ({
            ...prev,
            adventureOutline: outline,
            isLoadingOutline: false,
            isLoadingWorld: true,
            currentStageIndex: 0,
            isGameEnded: false,
            isGameFailed: false,
            currentSegment: null,
            lastRetryInfo: null
          }));
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'An unknown error occurred.';
          setGameState((prev) => ({
            ...prev,
            isLoadingOutline: false,
            error: `Failed to load adventure outline: ${errorMessage}`,
            lastRetryInfo: {
              type: 'resend_original',
              originalPrompt: 'fetch_outline_action'
            }
          }));
        }
      };
      loadNewOutline();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameState.isLoadingOutline,
    gameState.selectedGenre,
    gameState.selectedPersona,
    gameState.apiKeyMissing,
    addJournalEntry
  ]); // apiKeyMissing still here as a general check for app readiness, not direct key use.

  useEffect(() => {
    if (
      gameState.isLoadingWorld &&
      gameState.adventureOutline &&
      gameState.selectedGenre &&
      gameState.selectedPersona &&
      !gameState.worldDetails &&
      !gameState.apiKeyMissing
    ) {
      const loadWorldDetails = async () => {
        setGameState((prev) => ({ ...prev, error: null }));
        setCurrentLoadingText(getRandomLoadingText(worldLoadingTexts));
        try {
          const world = await fetchWorldDetails(
            gameState.adventureOutline!,
            gameState.selectedPersona!,
            gameState.selectedGenre!
          );
          addJournalEntry(
            'world_generated',
            `World details for "${world.worldName}" established. Genre clarification: ${world.genreClarification}.`
          );
          setGameState((prev) => ({
            ...prev,
            worldDetails: world,
            isLoadingWorld: false,
            lastRetryInfo: null
          }));
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'An unknown error occurred.';
          setGameState((prev) => ({
            ...prev,
            isLoadingWorld: false,
            error: `Failed to load world details: ${errorMessage}`,
            lastRetryInfo: {
              type: 'resend_original',
              originalPrompt: 'fetch_world_action'
            }
          }));
        }
      };
      loadWorldDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameState.isLoadingWorld,
    gameState.adventureOutline,
    gameState.selectedGenre,
    gameState.selectedPersona,
    gameState.apiKeyMissing,
    addJournalEntry
  ]);

  const processSuccessfulSegment = useCallback(
    async (segmentData: StorySegment) => {
      addJournalEntry('scene', segmentData.sceneDescription);

      let newInventory = [...gameState.inventory];
      if (segmentData.itemFound) {
        if (
          !newInventory.find((item) => item.id === segmentData.itemFound!.id)
        ) {
          newInventory.push(segmentData.itemFound);
          addJournalEntry(
            'item_found',
            `You found: ${segmentData.itemFound.name}. (${segmentData.itemFound.description})`
          );
        } else {
          addJournalEntry(
            'system',
            `You re-discovered ${segmentData.itemFound.name}, but you already possess it.`
          );
        }
      }

      const shouldAttemptImageLoad =
        imageGenerationFeatureEnabled &&
        !gameState.imageGenerationPermanentlyDisabled &&
        !!segmentData.imagePrompt &&
        !(segmentData.isFailureScene || segmentData.isFinalScene);

      setGameState((prev) => ({
        ...prev,
        isLoadingStory: false,
        currentSegment: segmentData,
        inventory: newInventory,
        isGameEnded: segmentData.isFinalScene || false,
        isGameFailed: segmentData.isFailureScene || false,
        lastRetryInfo: null,
        error: null,
        isLoadingImage: shouldAttemptImageLoad
      }));

      if (shouldAttemptImageLoad) {
        setCurrentLoadingText(getRandomLoadingText(imageLoadingTexts));
        try {
          const imageUrl = await generateImage(segmentData.imagePrompt);
          setGameState((prev) => ({
            ...prev,
            isLoadingImage: false,
            currentSegment: prev.currentSegment
              ? { ...prev.currentSegment, imageUrl }
              : null
          }));
        } catch (imgErr) {
          const imgErrorMessage =
            imgErr instanceof Error
              ? imgErr.message
              : 'Unknown image generation error.';
          console.error('Failed to generate image:', imgErr);

          if (imgErr instanceof ImageGenerationQuotaError) {
            addJournalEntry(
              'system',
              'Image generation quota exceeded. Visuals disabled for this session.'
            );
            setShowImageQuotaNotification(true);
            setGameState((prev) => ({
              ...prev,
              imageGenerationPermanentlyDisabled: true,
              isLoadingImage: false,
              error: null,
              currentSegment: prev.currentSegment
                ? { ...prev.currentSegment, imageUrl: undefined }
                : null
            }));
            setImageGenerationFeatureEnabled(false);
            localStorage.setItem(IMAGE_QUOTA_DISABLED_KEY, 'true');
          } else {
            addJournalEntry(
              'system',
              `Image generation failed: ${imgErrorMessage}. Story continues.`
            );
            setGameState((prev) => ({
              ...prev,
              isLoadingImage: false,
              error: `Failed to load scene image: ${imgErrorMessage}. You can continue with the story.`,
              currentSegment: prev.currentSegment
                ? { ...prev.currentSegment, imageUrl: undefined }
                : null,
              lastRetryInfo: {
                type: 'resend_original',
                originalPrompt: 'generate_image_action',
                customActionText: segmentData.imagePrompt
              }
            }));
          }
        }
      } else {
        setGameState((prev) => ({
          ...prev,
          isLoadingImage: false,
          currentSegment: prev.currentSegment
            ? { ...prev.currentSegment, imageUrl: undefined }
            : null
        }));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      addJournalEntry,
      gameState.inventory,
      imageGenerationFeatureEnabled,
      gameState.imageGenerationPermanentlyDisabled
    ]
  );

  const loadStoryScene = useCallback(
    async (
      prompt: string,
      isRetryAttempt: boolean = false,
      forCustomAction: boolean = false
    ) => {
      const shouldAttemptImageLoadInitial =
        imageGenerationFeatureEnabled &&
        !gameState.imageGenerationPermanentlyDisabled;
      if (!isRetryAttempt && !gameState.isLoadingStory) {
        setCurrentLoadingText(
          getRandomLoadingText(
            forCustomAction ? customActionLoadingTexts : storyLoadingTexts
          )
        );
        setGameState((prev) => ({
          ...prev,
          isLoadingStory: true,
          isLoadingImage:
            shouldAttemptImageLoadInitial && !gameState.currentSegment,
          error: null
        }));
      } else if (
        isRetryAttempt &&
        gameState.lastRetryInfo &&
        gameState.lastRetryInfo.type === 'resend_original' &&
        gameState.lastRetryInfo.originalPrompt !== 'fetch_outline_action' &&
        gameState.lastRetryInfo.originalPrompt !== 'fetch_world_action' &&
        gameState.lastRetryInfo.originalPrompt !== 'examine_action' &&
        gameState.lastRetryInfo.originalPrompt !== 'generate_image_action'
      ) {
        setCurrentLoadingText(getRandomLoadingText(storyLoadingTexts));
      }

      try {
        // The prompt here is already the full, context-rich prompt for Gemini.
        // fetchStorySegment now sends this to the proxy.
        const segmentData = await fetchStorySegment(
          prompt,
          !gameState.currentSegment
        );
        await processSuccessfulSegment(segmentData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unknown error occurred.';
        const retryPrompt = gameState.lastRetryInfo?.customActionText
          ? gameState.lastRetryInfo.originalPrompt
          : prompt;

        if (err instanceof JsonParseError) {
          setGameState((prev) => ({
            ...prev,
            isLoadingStory: false,
            isLoadingImage: false,
            error: `Failed to parse story data: ${errorMessage} Click Retry to attempt a fix.`,
            lastRetryInfo: {
              type: 'fix_json',
              originalPrompt: retryPrompt,
              faultyJsonText: err.rawText,
              customActionText: forCustomAction
                ? gameState.lastRetryInfo?.customActionText
                : undefined
            }
          }));
        } else {
          setGameState((prev) => ({
            ...prev,
            isLoadingStory: false,
            isLoadingImage: false,
            error: `Failed to load story scene: ${errorMessage}`,
            lastRetryInfo: {
              type: 'resend_original',
              originalPrompt: retryPrompt,
              customActionText: forCustomAction
                ? gameState.lastRetryInfo?.customActionText
                : undefined
            }
          }));
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      processSuccessfulSegment,
      gameState.lastRetryInfo,
      gameState.isLoadingStory,
      imageGenerationFeatureEnabled,
      gameState.imageGenerationPermanentlyDisabled,
      gameState.currentSegment
    ]
  );

  useEffect(() => {
    if (
      gameState.adventureOutline &&
      gameState.worldDetails &&
      gameState.selectedGenre &&
      gameState.selectedPersona &&
      !gameState.currentSegment &&
      !gameState.isLoadingOutline &&
      !gameState.isLoadingWorld &&
      !gameState.isLoadingStory &&
      !gameState.error &&
      !showResumeModal &&
      !gameState.isGameEnded &&
      !gameState.isGameFailed &&
      !isSelectingGenre &&
      !isSelectingPersona
    ) {
      const {
        adventureOutline,
        worldDetails,
        currentStageIndex,
        selectedGenre,
        selectedPersona,
        inventory
      } = gameState;
      const currentStage = adventureOutline.stages[currentStageIndex];
      const genreSpecificPersonaTitle =
        genrePersonaDetails[selectedGenre]?.[selectedPersona]?.title ||
        selectedPersona;
      const personaContext = `The player is a ${genreSpecificPersonaTitle} (base persona: ${selectedPersona}). Their choices and the narrative should reflect this.`;
      const inventoryContext =
        inventory.length > 0
          ? `The player possesses: ${inventory.map((item) => item.name).join(', ')}.`
          : 'The player possesses no items yet.';

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

      const initialScenePrompt = `You are a master storyteller for a dynamic text-based RPG adventure game.
Adventure Genre: ${selectedGenre}.
${personaContext}
${inventoryContext}
${worldContext}
The overall adventure is titled: "${adventureOutline.title}".
The player's ultimate goal is: "${adventureOutline.overallGoal}".
The adventure has ${adventureOutline.stages.length} stages.

This is the START of the adventure, beginning with Stage ${currentStageIndex + 1}: "${currentStage.title}".
Objective for this stage: "${currentStage.objective}".

Generate the opening story segment.`;
      loadStoryScene(initialScenePrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameState.adventureOutline,
    gameState.worldDetails,
    gameState.selectedGenre,
    gameState.selectedPersona,
    gameState.currentSegment,
    gameState.isLoadingOutline,
    gameState.isLoadingWorld,
    gameState.isLoadingStory,
    gameState.error,
    showResumeModal,
    gameState.isGameEnded,
    gameState.isGameFailed,
    isSelectingGenre,
    isSelectingPersona,
    loadStoryScene,
    gameState.inventory,
    gameState.currentStageIndex
  ]);

  useEffect(() => {
    // apiKeyMissing check removed
    if (
      showResumeModal ||
      gameState.isLoadingOutline ||
      gameState.isLoadingWorld ||
      gameState.isLoadingStory ||
      isSelectingGenre ||
      isSelectingPersona ||
      isLoadingExamination
    ) {
      return;
    }

    if (gameState.isGameEnded || gameState.isGameFailed) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } else if (
      gameState.selectedGenre &&
      gameState.selectedPersona &&
      gameState.adventureOutline &&
      gameState.worldDetails &&
      gameState.currentSegment
    ) {
      const stateToSave: SavableGameState = {
        selectedGenre: gameState.selectedGenre,
        selectedPersona: gameState.selectedPersona,
        adventureOutline: gameState.adventureOutline,
        worldDetails: gameState.worldDetails,
        currentSegment: gameState.currentSegment,
        currentStageIndex: gameState.currentStageIndex,
        isGameEnded: gameState.isGameEnded,
        isGameFailed: gameState.isGameFailed,
        journal: gameState.journal,
        inventory: gameState.inventory,
        imageGenerationPermanentlyDisabled:
          gameState.imageGenerationPermanentlyDisabled
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameState.selectedGenre,
    gameState.selectedPersona,
    gameState.adventureOutline,
    gameState.worldDetails,
    gameState.currentSegment,
    gameState.currentStageIndex,
    gameState.isGameEnded,
    gameState.isGameFailed,
    gameState.journal,
    gameState.inventory,
    gameState.imageGenerationPermanentlyDisabled,
    showResumeModal,
    gameState.isLoadingOutline,
    gameState.isLoadingWorld,
    gameState.isLoadingStory,
    isSelectingGenre,
    isSelectingPersona,
    isLoadingExamination
  ]); // apiKeyMissing removed

  const handleChoiceSelected = async (choice: Choice) => {
    if (
      !gameState.currentSegment ||
      !gameState.adventureOutline ||
      !gameState.worldDetails ||
      !gameState.selectedGenre ||
      !gameState.selectedPersona
    )
      return;

    setCurrentLoadingText(getRandomLoadingText(storyLoadingTexts));
    setGameState((prev) => ({
      ...prev,
      isLoadingStory: true,
      isLoadingImage: false,
      error: null
    }));

    addJournalEntry('choice', choice.text);

    let nextStageIndex = gameState.currentStageIndex;
    if (choice.signalsStageCompletion && !choice.leadsToFailure) {
      if (
        gameState.currentStageIndex <
        gameState.adventureOutline.stages.length - 1
      ) {
        nextStageIndex = gameState.currentStageIndex + 1;
      }
    }
    const finalNextStageIndex = nextStageIndex;
    setGameState((prev) => ({
      ...prev,
      currentStageIndex: finalNextStageIndex
    }));

    const {
      adventureOutline,
      worldDetails,
      selectedGenre,
      selectedPersona,
      inventory
    } = gameState;
    const currentStageForPrompt = adventureOutline.stages[finalNextStageIndex];
    const previousStageForPromptContext =
      adventureOutline.stages[
        gameState.currentStageIndex === finalNextStageIndex &&
        finalNextStageIndex > 0
          ? finalNextStageIndex - 1
          : gameState.currentStageIndex
      ];

    const genreSpecificPersonaTitle =
      genrePersonaDetails[selectedGenre]?.[selectedPersona]?.title ||
      selectedPersona;
    const personaContext = `The player is a ${genreSpecificPersonaTitle} (base persona: ${selectedPersona}).`;
    const inventoryContext =
      inventory.length > 0
        ? `The player possesses: ${inventory.map((item) => item.name).join(', ')}. These items might be relevant.`
        : 'The player possesses no items.';

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
    const prevSceneDesc =
      gameState.currentSegment?.sceneDescription ||
      'Previously, the adventure continued...';

    const subsequentPrompt = `You are a master storyteller for a dynamic text-based RPG adventure game.
Adventure Genre: ${selectedGenre}.
${personaContext}
${inventoryContext}
${worldContext}
The overall adventure is titled: "${adventureOutline.title}".
The player's ultimate goal is: "${adventureOutline.overallGoal}".
Adventure Stages: ${adventureOutline.stages.map((s) => s.title).join(', ')}.

Player is now at Stage ${finalNextStageIndex + 1}: "${currentStageForPrompt.title}".
Objective for this stage: "${currentStageForPrompt.objective}".

Previous scene (in Stage ${(gameState.currentStageIndex === finalNextStageIndex && finalNextStageIndex > 0 ? finalNextStageIndex : gameState.currentStageIndex) + 1}: "${previousStageForPromptContext.title}") was: "${prevSceneDesc}"
Player chose: "${choice.text}"
This choice's intended outcome prompt for you, the AI, is: "${choice.outcomePrompt}"
${choice.signalsStageCompletion ? `This choice completed Stage ${(gameState.currentStageIndex === finalNextStageIndex && finalNextStageIndex > 0 ? finalNextStageIndex : gameState.currentStageIndex) + 1} ("${previousStageForPromptContext.title}"). Player is now progressing into Stage ${finalNextStageIndex + 1} ("${currentStageForPrompt.title}").` : `Player continues within Stage ${finalNextStageIndex + 1} ("${currentStageForPrompt.title}").`}
${choice.leadsToFailure ? 'This choice has led to failure. Narrate the failure compellingly. Set isFailureScene: true.' : ''}

Generate the next story segment based on the outcomePrompt.
The sceneDescription should narrate the consequences (positive or negative) of the player's choice.`;

    loadStoryScene(subsequentPrompt);
  };

  const handleCustomActionSubmit = async (actionText: string) => {
    if (
      !gameState.currentSegment ||
      !gameState.adventureOutline ||
      !gameState.worldDetails ||
      !gameState.selectedGenre ||
      !gameState.selectedPersona
    )
      return;

    setCurrentLoadingText(getRandomLoadingText(customActionLoadingTexts));
    setGameState((prev) => ({
      ...prev,
      isLoadingStory: true,
      isLoadingImage: false,
      error: null,
      lastRetryInfo: {
        type: 'resend_original',
        originalPrompt: 'custom_action_placeholder',
        customActionText: actionText
      }
    }));
    addJournalEntry('custom_action', actionText);

    try {
      const newSegment = await fetchCustomActionOutcome(
        actionText,
        gameState.currentSegment,
        gameState.adventureOutline,
        gameState.worldDetails,
        gameState.selectedGenre,
        gameState.selectedPersona,
        gameState.inventory,
        gameState.currentStageIndex
      );
      if (
        newSegment.sceneDescription.includes(
          'The situation remains largely unchanged'
        ) ||
        newSegment.sceneDescription.includes('decide against it')
      ) {
        addJournalEntry('action_impossible', newSegment.sceneDescription);
      }
      await processSuccessfulSegment(newSegment);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred.';
      const contextForRetry = `Custom action: ${actionText} in scene: ${gameState.currentSegment.sceneDescription.substring(0, 100)}...`;

      if (err instanceof JsonParseError) {
        setGameState((prev) => ({
          ...prev,
          isLoadingStory: false,
          isLoadingImage: false,
          error: `Failed to parse outcome of custom action: ${errorMessage} Click Retry.`,
          lastRetryInfo: {
            type: 'fix_json',
            originalPrompt: contextForRetry,
            faultyJsonText: err.rawText,
            customActionText: actionText
          }
        }));
      } else {
        setGameState((prev) => ({
          ...prev,
          isLoadingStory: false,
          isLoadingImage: false,
          error: `Failed to process custom action: ${errorMessage}`,
          lastRetryInfo: {
            type: 'resend_original',
            originalPrompt: contextForRetry,
            customActionText: actionText
          }
        }));
      }
    }
  };

  const handleExamineSelected = async () => {
    if (
      !gameState.currentSegment ||
      !gameState.adventureOutline ||
      !gameState.worldDetails ||
      !gameState.selectedGenre ||
      !gameState.selectedPersona
    )
      return;

    setIsLoadingExamination(true);
    setGameState((prev) => ({ ...prev, error: null }));
    setCurrentLoadingText(getRandomLoadingText(examinationLoadingTexts));

    try {
      const { sceneDescription } = gameState.currentSegment;
      const { stages } = gameState.adventureOutline;
      const currentStage = stages[gameState.currentStageIndex];

      const result = await fetchSceneExamination(
        sceneDescription,
        gameState.selectedGenre,
        gameState.adventureOutline,
        gameState.worldDetails,
        currentStage.title,
        currentStage.objective,
        gameState.selectedPersona,
        gameState.inventory
      );
      setExaminationText(result.examinationText);
      addJournalEntry('examine', result.examinationText);
      setShowExaminationModal(true);
      setGameState((prev) => ({ ...prev, lastRetryInfo: null }));
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An unknown error occurred while examining.';
      setGameState((prev) => ({
        ...prev,
        error: `Failed to get details: ${errorMessage}`,
        lastRetryInfo: {
          type: 'resend_original',
          originalPrompt: 'examine_action'
        }
      }));
    } finally {
      setIsLoadingExamination(false);
    }
  };

  const handleResumeGame = () => {
    if (initialLoadedState) {
      const shouldLoadImageOnResume =
        imageGenerationFeatureEnabled &&
        !initialLoadedState.imageGenerationPermanentlyDisabled &&
        !initialLoadedState.currentSegment?.imageUrl &&
        !!initialLoadedState.currentSegment?.imagePrompt &&
        !initialLoadedState.isGameFailed &&
        !initialLoadedState.isGameEnded;
      setGameState((prev) => ({
        ...prev,
        selectedGenre: initialLoadedState.selectedGenre,
        selectedPersona: initialLoadedState.selectedPersona,
        adventureOutline: initialLoadedState.adventureOutline,
        worldDetails: initialLoadedState.worldDetails,
        currentSegment: initialLoadedState.currentSegment,
        currentStageIndex: initialLoadedState.currentStageIndex,
        isGameEnded: initialLoadedState.isGameEnded,
        isGameFailed: initialLoadedState.isGameFailed,
        journal: initialLoadedState.journal || [],
        inventory: initialLoadedState.inventory || [],
        isLoadingOutline: false,
        isLoadingWorld: false,
        isLoadingStory: false,
        isLoadingImage: shouldLoadImageOnResume,
        error: null,
        lastRetryInfo: null,
        imageGenerationPermanentlyDisabled:
          initialLoadedState.imageGenerationPermanentlyDisabled,
        apiKeyMissing: false // Reset this as well
      }));

      setImageGenerationFeatureEnabled(
        imageGenerationFeatureEnabled &&
          !initialLoadedState.imageGenerationPermanentlyDisabled
      );

      addJournalEntry('system', 'Game resumed from saved state.');
      if (initialLoadedState.imageGenerationPermanentlyDisabled) {
        addJournalEntry(
          'system',
          'Image generation was previously disabled due to usage limits and remains off.'
        );
        setShowImageQuotaNotification(true);
      }
      setIsSelectingGenre(false);
      setIsSelectingPersona(false);

      if (shouldLoadImageOnResume) {
        setCurrentLoadingText(getRandomLoadingText(imageLoadingTexts));
        generateImage(initialLoadedState.currentSegment!.imagePrompt!)
          .then((imageUrl) => {
            setGameState((prev) => ({
              ...prev,
              isLoadingImage: false,
              currentSegment: prev.currentSegment
                ? { ...prev.currentSegment, imageUrl }
                : null
            }));
          })
          .catch((imgErr) => {
            console.error('Failed to re-generate image on resume:', imgErr);
            const imgErrorMessage =
              imgErr instanceof Error
                ? imgErr.message
                : 'Unknown image generation error.';
            if (imgErr instanceof ImageGenerationQuotaError) {
              addJournalEntry(
                'system',
                'Image generation quota exceeded on resume. Visuals disabled.'
              );
              setShowImageQuotaNotification(true);
              setGameState((prev) => ({
                ...prev,
                imageGenerationPermanentlyDisabled: true,
                isLoadingImage: false,
                error: null
              }));
              setImageGenerationFeatureEnabled(false);
              localStorage.setItem(IMAGE_QUOTA_DISABLED_KEY, 'true');
            } else {
              setGameState((prev) => ({
                ...prev,
                isLoadingImage: false,
                error: `Failed to reload scene image: ${imgErrorMessage}. You can continue with the story.`
              }));
            }
          });
      } else {
        setGameState((prev) => ({ ...prev, isLoadingImage: false }));
      }
    }
    setShowResumeModal(false);
    setInitialLoadedState(null);
  };

  const handleRestartGame = (isFromErrorModal: boolean = false) => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);

    setShowResumeModal(false);
    setInitialLoadedState(null);

    const initialImageEnvVar =
      process.env.IMAGE_GENERATION_ENABLED?.toLowerCase();
    const envVarDisabled =
      initialImageEnvVar === 'false' ||
      initialImageEnvVar === 'disabled' ||
      initialImageEnvVar === '0';
    const stillQuotaDisabled =
      localStorage.getItem(IMAGE_QUOTA_DISABLED_KEY) === 'true';

    setImageGenerationFeatureEnabled(!envVarDisabled && !stillQuotaDisabled);

    setGameState((prev) => ({
      ...prev,
      imageGenerationPermanentlyDisabled: stillQuotaDisabled,
      selectedGenre: null,
      selectedPersona: null,
      adventureOutline: null,
      worldDetails: null,
      currentSegment: null,
      currentStageIndex: 0,
      isLoadingOutline: false,
      isLoadingWorld: false,
      isLoadingStory: false,
      isLoadingImage: false,
      error: null,
      apiKeyMissing: false, // Key is server-side
      isGameEnded: false,
      isGameFailed: false,
      journal: [],
      inventory: [],
      lastRetryInfo: null
    }));
    setIsSelectingGenre(true);
    setIsSelectingPersona(false);
    if (!isFromErrorModal)
      addJournalEntry('system', 'New game started. Choose a genre.');
    if (stillQuotaDisabled && !isFromErrorModal) {
      addJournalEntry(
        'system',
        'Note: Image generation remains disabled due to previous usage limits.'
      );
      setShowImageQuotaNotification(true);
    } else {
      setShowImageQuotaNotification(false);
    }
    setIsJournalOpenOnMobile(false);
    setIsInventoryOpenOnMobile(false);
  };

  const handleRetry = async () => {
    if (!gameState.lastRetryInfo) return;

    const { type, originalPrompt, faultyJsonText, customActionText } =
      gameState.lastRetryInfo;

    setGameState((prev) => ({
      ...prev,
      error: null,
      isLoadingOutline: originalPrompt === 'fetch_outline_action',
      isLoadingWorld: originalPrompt === 'fetch_world_action',
      isLoadingStory:
        type === 'fix_json' ||
        (originalPrompt !== 'fetch_outline_action' &&
          originalPrompt !== 'fetch_world_action' &&
          originalPrompt !== 'examine_action' &&
          originalPrompt !== 'generate_image_action'),
      isLoadingImage: false
    }));

    if (type === 'fix_json' && faultyJsonText) {
      setCurrentLoadingText(getRandomLoadingText(fixJsonLoadingTexts));
      try {
        // attemptToFixJson now sends the request to the proxy.
        const fixedSegmentData = await attemptToFixJson(
          faultyJsonText,
          originalPrompt
        );
        await processSuccessfulSegment(fixedSegmentData);
      } catch (fixError) {
        const fixErrorMessage =
          fixError instanceof Error
            ? fixError.message
            : 'Unknown error during fix attempt.';
        setGameState((prev) => ({
          ...prev,
          isLoadingStory: false,
          isLoadingImage: false,
          error: `AI could not fix the data. Click Retry to regenerate. (Fix error: ${fixErrorMessage})`,
          lastRetryInfo: {
            type: 'resend_original',
            originalPrompt: originalPrompt,
            customActionText: customActionText
          }
        }));
      }
    } else if (type === 'resend_original') {
      if (originalPrompt === 'fetch_outline_action') {
        setCurrentLoadingText(getRandomLoadingText(outlineLoadingTexts));
        setGameState((prev) => ({
          ...prev,
          adventureOutline: null,
          worldDetails: null,
          currentSegment: null
        }));
        handlePersonaSelected(gameState.selectedPersona!);
      } else if (originalPrompt === 'fetch_world_action') {
        setCurrentLoadingText(getRandomLoadingText(worldLoadingTexts));
        setGameState((prev) => ({
          ...prev,
          worldDetails: null,
          currentSegment: null
        }));
      } else if (originalPrompt === 'examine_action') {
        setCurrentLoadingText(getRandomLoadingText(examinationLoadingTexts));
        await handleExamineSelected();
      } else if (originalPrompt === 'generate_image_action') {
        console.warn(
          'handleRetry called for generate_image_action, delegating to handleReloadImageAttempt.'
        );
        await handleReloadImageAttempt();
      } else if (
        customActionText &&
        gameState.currentSegment &&
        gameState.adventureOutline &&
        gameState.worldDetails &&
        gameState.selectedGenre &&
        gameState.selectedPersona
      ) {
        setCurrentLoadingText(getRandomLoadingText(customActionLoadingTexts));
        await handleCustomActionSubmit(customActionText);
      } else {
        setCurrentLoadingText(getRandomLoadingText(storyLoadingTexts));
        await loadStoryScene(originalPrompt, true);
      }
    }
  };

  const handleContinueWithoutImage = () => {
    setGameState((prev) => ({
      ...prev,
      error: null,
      isLoadingImage: false
    }));
    addJournalEntry(
      'system',
      'Continued story without the current scene image.'
    );
  };

  const handleReloadImageAttempt = async () => {
    if (
      !gameState.currentSegment ||
      !gameState.currentSegment.imagePrompt ||
      !imageGenerationFeatureEnabled ||
      gameState.imageGenerationPermanentlyDisabled
    ) {
      addJournalEntry(
        'system',
        'Image reload skipped: No prompt or image generation disabled.'
      );
      setGameState((prev) => ({ ...prev, error: null, isLoadingImage: false }));
      return;
    }

    setCurrentLoadingText(getRandomLoadingText(imageLoadingTexts));
    setGameState((prev) => ({ ...prev, isLoadingImage: true, error: null }));

    try {
      const imageUrl = await generateImage(
        gameState.currentSegment.imagePrompt
      );
      setGameState((prev) => ({
        ...prev,
        isLoadingImage: false,
        currentSegment: prev.currentSegment
          ? { ...prev.currentSegment, imageUrl }
          : null
      }));
      addJournalEntry('system', 'Scene image successfully reloaded.');
    } catch (imgErr) {
      const imgErrorMessage =
        imgErr instanceof Error
          ? imgErr.message
          : 'Unknown image generation error.';
      console.error('Failed to re-generate image:', imgErr);
      if (imgErr instanceof ImageGenerationQuotaError) {
        addJournalEntry(
          'system',
          'Image generation quota exceeded on retry. Visuals disabled.'
        );
        setShowImageQuotaNotification(true);
        setGameState((prev) => ({
          ...prev,
          imageGenerationPermanentlyDisabled: true,
          isLoadingImage: false,
          error: null
        }));
        setImageGenerationFeatureEnabled(false);
        localStorage.setItem(IMAGE_QUOTA_DISABLED_KEY, 'true');
      } else {
        addJournalEntry(
          'system',
          `Image reload failed again: ${imgErrorMessage}.`
        );
        setGameState((prev) => ({
          ...prev,
          isLoadingImage: false,
          error: `Failed again to load scene image: ${imgErrorMessage}. You can continue with the story.`
        }));
      }
    }
  };

  // Removed the direct API Key Missing error display. Errors from proxy (e.g. if proxy's key is bad)
  // will be shown in the generic error modal.
  // if (gameState.apiKeyMissing && gameState.error) { ... } // REMOVED BLOCK

  if (showResumeModal && initialLoadedState) {
    return (
      <ResumeModal
        onResume={handleResumeGame}
        onRestart={() => handleRestartGame()}
      />
    );
  }

  if (isSelectingGenre && !gameState.selectedGenre) {
    return <GenreSelection onGenreSelected={handleGenreSelected} />;
  }

  if (
    isSelectingPersona &&
    !gameState.selectedPersona &&
    gameState.selectedGenre
  ) {
    return (
      <PersonaSelection
        onPersonaSelected={handlePersonaSelected}
        selectedGenre={gameState.selectedGenre}
      />
    );
  }

  const displayedPersonaTitle =
    gameState.selectedGenre && gameState.selectedPersona
      ? genrePersonaDetails[gameState.selectedGenre]?.[
          gameState.selectedPersona
        ]?.title || gameState.selectedPersona
      : gameState.selectedPersona;

  if (
    (gameState.isGameEnded || gameState.isGameFailed) &&
    gameState.currentSegment
  ) {
    const isSuccess = gameState.isGameEnded && !gameState.isGameFailed;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-gray-900 text-gray-100">
        <header className="w-full max-w-5xl mb-6 text-center">
          <h1
            className={`font-press-start text-3xl tracking-tight ${isSuccess ? 'text-green-400' : 'text-red-500'}`}
          >
            {isSuccess
              ? gameState.adventureOutline?.title || 'Adventure Complete!'
              : 'Your Journey Ends...'}
          </h1>
          {gameState.selectedGenre && (
            <p className="text-xl text-indigo-300 mt-1">
              Genre: {gameState.selectedGenre}
            </p>
          )}
          {gameState.worldDetails && (
            <p className="text-xl text-purple-200 mt-1">
              World: {gameState.worldDetails.worldName}
            </p>
          )}
          {displayedPersonaTitle && (
            <p className="text-base text-purple-300 mt-1">
              As: {displayedPersonaTitle}
            </p>
          )}
        </header>
        <main className="w-full max-w-3xl bg-gray-800 p-8 rounded-lg shadow-xl text-center">
          <h2
            className={`font-press-start text-2xl mb-6 ${isSuccess ? 'text-green-400' : 'text-red-400'}`}
          >
            {isSuccess ? 'Congratulations!' : 'Mission Failed'}
          </h2>
          <p className="text-gray-300 whitespace-pre-line leading-relaxed mb-4 text-lg">
            {gameState.currentSegment.sceneDescription}
          </p>
          {imageGenerationFeatureEnabled &&
            !gameState.imageGenerationPermanentlyDisabled &&
            gameState.currentSegment.imageUrl && (
              <img
                src={gameState.currentSegment.imageUrl}
                alt="Final scene"
                className="rounded-md shadow-lg mx-auto my-4 max-w-full h-auto"
                style={{ maxHeight: '400px' }}
              />
            )}
          {gameState.imageGenerationPermanentlyDisabled && (
            <p className="text-sm text-yellow-400 italic my-4">
              Image generation was disabled due to usage limits.
            </p>
          )}
          {isSuccess && gameState.adventureOutline && (
            <p className="text-xl text-gray-400">
              You have completed the adventure:{' '}
              <span className="font-semibold text-purple-300">
                {gameState.adventureOutline?.overallGoal}
              </span>
            </p>
          )}
          {!isSuccess && (
            <p className="text-xl text-gray-400">
              Your quest for{' '}
              <span className="font-semibold text-purple-300">
                {gameState.adventureOutline?.overallGoal || 'your goal'}
              </span>{' '}
              has come to an untimely end.
            </p>
          )}
          {gameState.inventory.length > 0 && (
            <div className="mt-6 text-left">
              <h3 className="font-press-start text-lg text-purple-300 mb-2">
                Your Final Inventory:
              </h3>
              <ul className="list-disc list-inside text-gray-400 text-base">
                {gameState.inventory.map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => handleRestartGame()}
            className="mt-8 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 text-lg"
          >
            {isSuccess ? 'Play Again?' : 'Try Again?'}
          </button>
        </main>
        <footer className="w-full max-w-5xl mt-12 text-center text-sm text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} Forge your Journey. Content
            generation by Google Gemini, proxied for security.
          </p>
        </footer>
      </div>
    );
  }

  const isLoading =
    gameState.isLoadingOutline ||
    gameState.isLoadingWorld ||
    gameState.isLoadingStory ||
    (gameState.isLoadingImage &&
      imageGenerationFeatureEnabled &&
      !gameState.imageGenerationPermanentlyDisabled) ||
    isLoadingExamination;
  let dynamicLoadingText = currentLoadingText;
  if (
    gameState.isLoadingOutline &&
    (!dynamicLoadingText || !outlineLoadingTexts.includes(dynamicLoadingText))
  )
    dynamicLoadingText = getRandomLoadingText(outlineLoadingTexts);
  else if (
    gameState.isLoadingWorld &&
    (!dynamicLoadingText || !worldLoadingTexts.includes(dynamicLoadingText))
  )
    dynamicLoadingText = getRandomLoadingText(worldLoadingTexts);
  else if (
    gameState.isLoadingStory &&
    (!dynamicLoadingText ||
      (!storyLoadingTexts.includes(dynamicLoadingText) &&
        !customActionLoadingTexts.includes(dynamicLoadingText)))
  ) {
    dynamicLoadingText =
      gameState.lastRetryInfo?.customActionText &&
      !gameState.lastRetryInfo.faultyJsonText
        ? getRandomLoadingText(customActionLoadingTexts)
        : getRandomLoadingText(storyLoadingTexts);
  } else if (
    gameState.isLoadingImage &&
    imageGenerationFeatureEnabled &&
    !gameState.imageGenerationPermanentlyDisabled &&
    (!dynamicLoadingText || !imageLoadingTexts.includes(dynamicLoadingText))
  )
    dynamicLoadingText = getRandomLoadingText(imageLoadingTexts);
  else if (
    isLoadingExamination &&
    (!dynamicLoadingText ||
      !examinationLoadingTexts.includes(dynamicLoadingText))
  )
    dynamicLoadingText = getRandomLoadingText(examinationLoadingTexts);

  const choicePanelProps = {
    currentSegment: gameState.currentSegment,
    isLoadingStory: gameState.isLoadingStory,
    isLoading: isLoading,
    isLoadingExamination: isLoadingExamination,
    handleChoiceSelected: handleChoiceSelected,
    handleExamineSelected: handleExamineSelected,
    handleCustomActionSubmit: handleCustomActionSubmit,
    currentLoadingText: dynamicLoadingText || 'Loading...'
  };

  const isImageOnlyError =
    gameState.error?.includes('Failed to load scene image:') &&
    gameState.currentSegment;

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-gray-900 text-gray-100 items-center">
      {showImageQuotaNotification && (
        <div
          className="fixed top-0 left-0 right-0 bg-yellow-500 text-gray-900 p-3 text-center shadow-lg z-[100]"
          role="alert"
        >
          <p>
            Image generation quota exceeded. Visuals have been disabled for this
            session to ensure gameplay continuity.
          </p>
          <button
            onClick={() => setShowImageQuotaNotification(false)}
            className="ml-4 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm font-semibold"
          >
            &times; Dismiss
          </button>
        </div>
      )}
      <header className="w-full max-w-5xl mb-8 text-center">
        <h1 className="font-press-start text-3xl text-purple-400 tracking-tight mb-3">
          {gameState.adventureOutline
            ? gameState.adventureOutline.title
            : 'Forge your Journey'}
        </h1>

        {gameState.adventureOutline && (
          <p className="text-2xl font-semibold text-purple-300 mt-1 mb-4">
            Goal: {gameState.adventureOutline.overallGoal}
          </p>
        )}

        {gameState.adventureOutline &&
          gameState.currentSegment &&
          !gameState.isGameEnded &&
          !gameState.isGameFailed && (
            <div className="mt-1 mb-4">
              <p className="text-xl font-semibold text-gray-200">
                Stage {gameState.currentStageIndex + 1} /{' '}
                {gameState.adventureOutline.stages.length}:{' '}
                {
                  gameState.adventureOutline.stages[gameState.currentStageIndex]
                    .title
                }
              </p>
              <p className="text-xl font-medium text-gray-300 mt-0.5">
                Objective:{' '}
                {
                  gameState.adventureOutline.stages[gameState.currentStageIndex]
                    .objective
                }
              </p>
            </div>
          )}

        <div className="mt-1 text-sm text-gray-500 space-y-0.5">
          {gameState.selectedGenre && <p>Genre: {gameState.selectedGenre}</p>}
          {gameState.worldDetails && (
            <p>
              World: {gameState.worldDetails.worldName}{' '}
              <span className="text-gray-600">
                ({gameState.worldDetails.genreClarification})
              </span>
            </p>
          )}
          {displayedPersonaTitle && <p>As: {displayedPersonaTitle}</p>}
          {gameState.imageGenerationPermanentlyDisabled && (
            <p className="text-yellow-400 italic">
              Image generation disabled (quota).
            </p>
          )}
          {!imageGenerationFeatureEnabled &&
            !gameState.imageGenerationPermanentlyDisabled && (
              <p className="text-gray-600 italic">
                Image generation disabled (config).
              </p>
            )}
        </div>
      </header>

      {gameState.error && ( // Generic error modal, no longer checking !gameState.apiKeyMissing
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="error-modal-title"
        >
          <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl text-center max-w-md w-full border border-red-700">
            <h2
              id="error-modal-title"
              className="font-press-start text-xl sm:text-2xl mb-4 text-red-400"
            >
              An Error Occurred
            </h2>
            <p className="text-gray-300 mb-6 text-base sm:text-lg whitespace-pre-wrap">
              {gameState.error}
            </p>
            <div className="flex flex-col gap-3">
              {isImageOnlyError ? (
                <>
                  <button
                    onClick={handleContinueWithoutImage}
                    className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transform hover:scale-105 text-lg"
                  >
                    Continue with Story
                  </button>
                  <button
                    onClick={handleReloadImageAttempt}
                    className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-opacity-75 transform hover:scale-105 text-lg"
                  >
                    Try Reloading Image
                  </button>
                </>
              ) : gameState.lastRetryInfo &&
                !gameState.error.includes(
                  'API Key configuration error on the server'
                ) ? ( // Don't show retry for server API key issues
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-opacity-75 transform hover:scale-105 text-lg"
                  aria-label="Retry last action"
                >
                  Retry
                </button>
              ) : null}
              <button
                onClick={() => handleRestartGame(true)}
                className={`px-6 py-3 font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-opacity-75 transform hover:scale-105 text-lg
                            ${
                              isImageOnlyError ||
                              (gameState.lastRetryInfo &&
                                !gameState.error.includes(
                                  'API Key configuration error on the server'
                                ))
                                ? 'bg-gray-600 hover:bg-gray-500 text-white focus:ring-2 focus:ring-gray-400'
                                : 'bg-purple-600 hover:bg-purple-500 text-white focus:ring-2 focus:ring-purple-400'
                            }`}
                aria-label="Start a new game"
              >
                Start New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {(gameState.isLoadingOutline ||
        gameState.isLoadingWorld ||
        (gameState.isLoadingStory && !gameState.currentSegment)) && (
        <div className="flex flex-col items-center justify-center h-64">
          <LoadingSpinner />
          <p className="mt-4 text-xl text-gray-400">
            {dynamicLoadingText || 'Loading...'}
          </p>
        </div>
      )}

      {gameState.currentSegment &&
        !gameState.isGameEnded &&
        !gameState.isGameFailed && (
          <div className="w-full max-w-5xl flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="lg:w-2/3 flex-shrink-0 flex flex-col gap-6">
              <StoryDisplay
                imageUrl={gameState.currentSegment.imageUrl}
                isLoadingImage={
                  gameState.isLoadingImage &&
                  imageGenerationFeatureEnabled &&
                  !gameState.imageGenerationPermanentlyDisabled
                }
                isLoadingStory={
                  gameState.isLoadingStory &&
                  !gameState.currentSegment.sceneDescription
                }
                imageGenerationFeatureEnabled={imageGenerationFeatureEnabled}
                imageGenerationPermanentlyDisabled={
                  gameState.imageGenerationPermanentlyDisabled
                }
              />
              <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl">
                <h2 className="font-press-start text-xl sm:text-2xl mb-3 sm:mb-4 text-purple-300 border-b border-gray-700 pb-2">
                  Current Scene
                </h2>
                <p className="text-gray-300 whitespace-pre-line leading-relaxed text-base sm:text-lg">
                  {gameState.currentSegment.sceneDescription}
                </p>
              </div>

              <div className="lg:hidden">
                <ChoicePanel {...choicePanelProps} />
              </div>

              <div className="lg:hidden space-y-2 mt-4">
                {gameState.journal.length > 0 && (
                  <div>
                    <button
                      onClick={() =>
                        setIsJournalOpenOnMobile(!isJournalOpenOnMobile)
                      }
                      className="w-full p-3 bg-gray-700 hover:bg-gray-600 text-purple-300 font-semibold rounded-lg shadow-md transition-colors duration-150 text-base"
                      aria-expanded={isJournalOpenOnMobile}
                      aria-controls="journal-log-mobile"
                    >
                      {isJournalOpenOnMobile ? 'Hide' : 'Show'} Adventure Log (
                      {gameState.journal.length})
                    </button>
                    {isJournalOpenOnMobile && (
                      <div id="journal-log-mobile" className="mt-2">
                        <JournalLog
                          journal={gameState.journal}
                          className="bg-gray-800 p-4 rounded-lg shadow-xl max-h-72 overflow-y-auto custom-scrollbar"
                        />
                      </div>
                    )}
                  </div>
                )}
                {gameState.inventory.length > 0 && (
                  <div>
                    <button
                      onClick={() =>
                        setIsInventoryOpenOnMobile(!isInventoryOpenOnMobile)
                      }
                      className="w-full p-3 bg-gray-700 hover:bg-gray-600 text-teal-300 font-semibold rounded-lg shadow-md transition-colors duration-150 text-base"
                      aria-expanded={isInventoryOpenOnMobile}
                      aria-controls="inventory-display-mobile"
                    >
                      {isInventoryOpenOnMobile ? 'Hide' : 'Show'} Inventory (
                      {gameState.inventory.length})
                    </button>
                    {isInventoryOpenOnMobile && (
                      <div id="inventory-display-mobile" className="mt-2">
                        <InventoryDisplay
                          inventory={gameState.inventory}
                          className="bg-gray-800 p-4 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar"
                        />
                      </div>
                    )}
                  </div>
                )}
                {gameState.inventory.length === 0 &&
                  gameState.journal.length > 0 && (
                    <div className="p-3 bg-gray-700 text-teal-400 text-center font-semibold rounded-lg shadow-md text-base">
                      Inventory Empty
                    </div>
                  )}
                {gameState.inventory.length === 0 &&
                  gameState.journal.length === 0 &&
                  !isJournalOpenOnMobile && (
                    <div className="p-3 bg-gray-700 text-teal-400 text-center font-semibold rounded-lg shadow-md text-base">
                      Inventory Empty
                    </div>
                  )}
              </div>
            </div>

            <aside className="hidden lg:block lg:w-1/3 space-y-6 flex-shrink-0 sticky top-8 self-start max-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar pr-2">
              <ChoicePanel {...choicePanelProps} />
              {gameState.inventory.length > 0 && (
                <InventoryDisplay inventory={gameState.inventory} />
              )}
              {gameState.inventory.length === 0 && (
                <div className="bg-gray-800 p-4 rounded-lg shadow-xl">
                  <h3 className="font-press-start text-lg text-teal-300 border-b border-gray-700 pb-2 mb-3">
                    Inventory
                  </h3>
                  <p className="text-gray-500 text-base">
                    Your satchel is empty.
                  </p>
                </div>
              )}
              {gameState.journal.length > 0 && (
                <JournalLog journal={gameState.journal} />
              )}
              {gameState.journal.length === 0 && (
                <div className="bg-gray-800 p-4 rounded-lg shadow-xl">
                  <h3 className="font-press-start text-lg text-purple-300 border-b border-gray-700 pb-2 mb-3">
                    Adventure Log
                  </h3>
                  <p className="text-gray-500 text-base">
                    Your adventure is yet to be written.
                  </p>
                </div>
              )}
            </aside>
          </div>
        )}

      {showExaminationModal && examinationText && (
        <ExaminationModal
          text={examinationText}
          onClose={() => setShowExaminationModal(false)}
        />
      )}

      <footer className="w-full max-w-5xl mt-12 text-center text-sm text-gray-500">
        <p>
          &copy; {new Date().getFullYear()} Forge your Journey. Content
          generation by Google Gemini, proxied for security.
        </p>
      </footer>
    </div>
  );
};

export default App;
