
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Choice, StorySegment, AdventureOutline, SavableGameState, Persona, JournalEntry, RetryInfo, JsonParseError, WorldDetails, GameGenre, genrePersonaDetails } from './types';
import { fetchAdventureOutline, fetchWorldDetails, fetchStorySegment, generateImage, fetchSceneExamination, attemptToFixJson } from './services/geminiService';
import StoryDisplay from './components/StoryDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ResumeModal from './components/ResumeModal';
import PersonaSelection from './components/PersonaSelection';
import GenreSelection from './components/GenreSelection';
import JournalLog from './components/JournalLog';
import ExaminationModal from './components/ExaminationModal';
import ChoicePanel from './components/ChoicePanel';
import InventoryDisplay from './components/InventoryDisplay';

const LOCAL_STORAGE_KEY = 'forgeYourJourney_v1'; // Updated to new app name and reset version

const outlineLoadingTexts = [
  "Forging a new world's skeleton...", "Consulting ancient maps for an outline...", "Seeking cosmic inspiration for the adventure's path...",
  "The mists of creation stir, revealing a basic quest...", "A new legend's blueprint is being drafted..."
];
const worldLoadingTexts = [
  "Sculpting continents and forbidden lands...", "Defining cultural tapestries and ancient laws...", "Breathing life into the world's lore and creatures...",
  "Mapping the unseen realms and their secrets...", "The world takes shape from the outline's core..."
];
const storyLoadingTexts = [
  "Weaving the threads of fate within the new world...", "The storyteller ponders, influenced by the world's echoes...", "Unveiling the next chapter, rich with world details...",
  "Listening to the choices that resonate through this realm...", "The path unfolds, shaped by the world itself..."
];
const imageLoadingTexts = [
  "Capturing the scene's essence from this specific world...", "The artist's brush takes flight, painting world-specific visuals...", "Visualizing the unseen corners of this realm...",
  "Painting with pixels and magic, true to the world's nature...", "Awaiting a glimpse of this unique world..."
];
const examinationLoadingTexts = [
    "Peering deeper into the world's shadows...", "Uncovering hidden details unique to this realm...", "The world reveals its intricate secrets..."
];
const fixJsonLoadingTexts = [
    "Attempting to repair story data, mindful of the world's consistency...", "The AI is re-evaluating its response within the established world...", "Working to fix the narrative flow, aligned with the world's lore..."
];

const getRandomLoadingText = (textArray: string[]) => textArray[Math.floor(Math.random() * textArray.length)];

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
    apiKeyMissing: typeof process.env.API_KEY !== 'string' || process.env.API_KEY === '',
    isGameEnded: false,
    journal: [],
    inventory: [],
    lastRetryInfo: null,
  });

  const [showResumeModal, setShowResumeModal] = useState(false);
  const [initialLoadedState, setInitialLoadedState] = useState<SavableGameState | null>(null);
  const [isSelectingGenre, setIsSelectingGenre] = useState(false); // New state for genre selection
  const [isSelectingPersona, setIsSelectingPersona] = useState(false);
  const [currentLoadingText, setCurrentLoadingText] = useState<string>('');
  const [showExaminationModal, setShowExaminationModal] = useState(false);
  const [examinationText, setExaminationText] = useState<string | null>(null);
  const [isLoadingExamination, setIsLoadingExamination] = useState(false);
  const [isJournalOpenOnMobile, setIsJournalOpenOnMobile] = useState(false);
  const [isInventoryOpenOnMobile, setIsInventoryOpenOnMobile] = useState(false);
  const [imageGenerationFeatureEnabled, setImageGenerationFeatureEnabled] = useState(true);


  useEffect(() => {
    const imageEnvVar = process.env.IMAGE_GENERATION_ENABLED?.toLowerCase();
    if (imageEnvVar === 'false' || imageEnvVar === 'disabled' || imageEnvVar === '0') {
      setImageGenerationFeatureEnabled(false);
    }
  }, []);


  const addJournalEntry = useCallback((type: JournalEntry['type'], content: string) => {
    setGameState(prev => ({
      ...prev,
      journal: [...prev.journal, { type, content, timestamp: new Date().toISOString() }]
    }));
  }, []);

  // 1. Effect for API Key check and loading from localStorage
  useEffect(() => {
    if (gameState.apiKeyMissing) {
      setGameState(prev => ({
        ...prev,
        error: "API Key is missing. Please ensure the API_KEY environment variable is set and accessible.",
      }));
      return;
    }

    const savedGameJson = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedGameJson) {
      try {
        const loadedState = JSON.parse(savedGameJson) as SavableGameState;
        // Check for essential fields including selectedGenre, worldDetails and inventory
        if (loadedState.selectedGenre && // Check for selectedGenre
            loadedState.selectedPersona && 
            loadedState.adventureOutline && 
            loadedState.worldDetails && 
            typeof loadedState.currentStageIndex === 'number' && 
            loadedState.currentSegment && 
            Array.isArray(loadedState.journal) &&
            Array.isArray(loadedState.inventory)) {
          setInitialLoadedState(loadedState);
          setShowResumeModal(true);
        } else {
          console.warn("Saved game state was missing essential fields (incl. selectedGenre). Discarding.");
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          setIsSelectingGenre(true); // Start with genre selection if save is invalid
        }
      } catch (e) {
        console.error("Failed to parse saved game state:", e);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setIsSelectingGenre(true); // Start with genre selection on parse error
      }
    } else {
      setIsSelectingGenre(true); // Start with genre selection if no saved game
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.apiKeyMissing]);

  const handleGenreSelected = (genre: GameGenre) => {
    addJournalEntry('genre_selected', `Selected genre: ${genre}.`);
    setGameState(prev => ({
      ...prev,
      selectedGenre: genre,
      // Reset other relevant states for a new game path with this genre
      selectedPersona: null,
      adventureOutline: null,
      worldDetails: null,
      currentSegment: null,
      currentStageIndex: 0,
      isGameEnded: false,
      inventory: [],
      lastRetryInfo: null,
      error: null,
      journal: prev.journal, // Keep previous journal entries like "genre_selected"
    }));
    setIsSelectingGenre(false);
    setIsSelectingPersona(true); // Proceed to persona selection
  };

  const handlePersonaSelected = (persona: Persona) => {
    // gameState.selectedGenre should be set at this point from handleGenreSelected
    const genreSpecificTitle = gameState.selectedGenre ? genrePersonaDetails[gameState.selectedGenre]?.[persona]?.title || persona : persona;
    addJournalEntry('persona_selected', `${genreSpecificTitle}.`);
    
    setGameState(prev => ({
      ...prev,
      selectedPersona: persona, // Store the base persona for logic
      isLoadingOutline: true, 
      isLoadingWorld: false,
      worldDetails: null, 
      lastRetryInfo: null, 
      inventory: [], 
    }));
    setIsSelectingPersona(false);
  };

  // 2. Effect for fetching adventure outline (depends on genre AND persona)
  useEffect(() => {
    if (gameState.isLoadingOutline && gameState.selectedGenre && gameState.selectedPersona && !gameState.adventureOutline && !gameState.apiKeyMissing) {
      const loadNewOutline = async () => {
        setGameState(prev => ({ ...prev, error: null, isLoadingWorld: false }));
        setCurrentLoadingText(getRandomLoadingText(outlineLoadingTexts));
        const genreSpecificPersonaTitle = genrePersonaDetails[gameState.selectedGenre!][gameState.selectedPersona!]?.title || gameState.selectedPersona;
        addJournalEntry('system', `Starting new adventure: ${gameState.selectedGenre} - ${genreSpecificPersonaTitle}. Generating outline...`);
        try {
          const outline = await fetchAdventureOutline(gameState.selectedGenre, gameState.selectedPersona);
          addJournalEntry('system', `Adventure outline "${outline.title}" generated.`);
          setGameState(prev => ({
            ...prev,
            adventureOutline: outline,
            isLoadingOutline: false,
            isLoadingWorld: true, // Trigger world loading next
            currentStageIndex: 0,
            isGameEnded: false,
            currentSegment: null,
            lastRetryInfo: null,
          }));
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setGameState(prev => ({ 
            ...prev, 
            isLoadingOutline: false, 
            error: `Failed to load adventure outline: ${errorMessage}`,
            lastRetryInfo: { type: 'resend_original', originalPrompt: "fetch_outline_action" } 
          }));
        }
      };
      loadNewOutline();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.isLoadingOutline, gameState.selectedGenre, gameState.selectedPersona, gameState.apiKeyMissing, addJournalEntry]);

  // 2.5 Effect for fetching world details (depends on outline, genre, persona)
  useEffect(() => {
    if (gameState.isLoadingWorld && gameState.adventureOutline && gameState.selectedGenre && gameState.selectedPersona && !gameState.worldDetails && !gameState.apiKeyMissing) {
      const loadWorldDetails = async () => {
        setGameState(prev => ({ ...prev, error: null }));
        setCurrentLoadingText(getRandomLoadingText(worldLoadingTexts));
        try {
          const world = await fetchWorldDetails(gameState.adventureOutline!, gameState.selectedPersona!, gameState.selectedGenre!);
          addJournalEntry('world_generated', `World details for "${world.worldName}" established. Genre clarification: ${world.genreClarification}.`);
          setGameState(prev => ({
            ...prev,
            worldDetails: world,
            isLoadingWorld: false,
            lastRetryInfo: null,
          }));
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setGameState(prev => ({ 
            ...prev, 
            isLoadingWorld: false, 
            error: `Failed to load world details: ${errorMessage}`,
            lastRetryInfo: { type: 'resend_original', originalPrompt: "fetch_world_action" } 
          }));
        }
      };
      loadWorldDetails();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.isLoadingWorld, gameState.adventureOutline, gameState.selectedGenre, gameState.selectedPersona, gameState.apiKeyMissing, addJournalEntry]);


  const processSuccessfulSegment = useCallback(async (segmentData: StorySegment) => {
    addJournalEntry('scene', segmentData.sceneDescription);
    
    let newInventory = [...gameState.inventory];
    if (segmentData.itemFound) {
      if (!newInventory.find(item => item.id === segmentData.itemFound!.id)) {
        newInventory.push(segmentData.itemFound);
        addJournalEntry('item_found', `You found: ${segmentData.itemFound.name}. (${segmentData.itemFound.description})`);
      } else {
        addJournalEntry('system', `You re-discovered ${segmentData.itemFound.name}, but you already possess it.`);
      }
    }

    setGameState(prev => ({
      ...prev,
      isLoadingStory: false,
      currentSegment: segmentData,
      inventory: newInventory,
      isGameEnded: segmentData.isFinalScene || false,
      lastRetryInfo: null, 
      error: null,
      isLoadingImage: imageGenerationFeatureEnabled && !!segmentData.imagePrompt,
    }));

    if (imageGenerationFeatureEnabled && segmentData.imagePrompt) {
      setCurrentLoadingText(getRandomLoadingText(imageLoadingTexts));
      try {
        const imageUrl = await generateImage(segmentData.imagePrompt);
        setGameState(prev => ({
          ...prev,
          isLoadingImage: false,
          currentSegment: prev.currentSegment ? { ...prev.currentSegment, imageUrl } : null,
        }));
      } catch (imgErr) {
        const imgErrorMessage = imgErr instanceof Error ? imgErr.message : 'Unknown image generation error.';
        console.error("Failed to generate image:", imgErr);
        setGameState(prev => ({
          ...prev,
          isLoadingImage: false,
          error: prev.error || `Failed to load scene image: ${imgErrorMessage}`, 
        }));
      }
    } else {
      setGameState(prev => ({ 
        ...prev, 
        isLoadingImage: false, 
        currentSegment: prev.currentSegment ? { ...prev.currentSegment, imageUrl: undefined } : null 
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addJournalEntry, gameState.inventory, imageGenerationFeatureEnabled]);


  const loadStoryScene = useCallback(async (prompt: string, isRetryAttempt: boolean = false) => {
    if (!isRetryAttempt && !gameState.isLoadingStory) { 
       setCurrentLoadingText(getRandomLoadingText(storyLoadingTexts));
       setGameState(prev => ({ 
        ...prev, 
        isLoadingStory: true, 
        isLoadingImage: imageGenerationFeatureEnabled, 
        error: null 
      }));
    } else if (isRetryAttempt && gameState.lastRetryInfo && gameState.lastRetryInfo.type === 'resend_original' && gameState.lastRetryInfo.originalPrompt !== "fetch_outline_action" && gameState.lastRetryInfo.originalPrompt !== "fetch_world_action" && gameState.lastRetryInfo.originalPrompt !== "examine_action") {
        setCurrentLoadingText(getRandomLoadingText(storyLoadingTexts));
    }

    try {
      const segmentData = await fetchStorySegment(prompt); 
      await processSuccessfulSegment(segmentData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      if (err instanceof JsonParseError) {
        setGameState(prev => ({
          ...prev,
          isLoadingStory: false,
          isLoadingImage: false,
          error: `Failed to parse story data: ${errorMessage} Click Retry to attempt a fix.`,
          lastRetryInfo: { type: 'fix_json', originalPrompt: prompt, faultyJsonText: err.rawText }
        }));
      } else {
        setGameState(prev => ({
          ...prev,
          isLoadingStory: false,
          isLoadingImage: false,
          error: `Failed to load story scene: ${errorMessage}`,
          lastRetryInfo: { type: 'resend_original', originalPrompt: prompt }
        }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processSuccessfulSegment, gameState.lastRetryInfo?.type, gameState.lastRetryInfo?.originalPrompt, gameState.isLoadingStory, imageGenerationFeatureEnabled]); 

  // 3. Effect for fetching FIRST story segment (depends on outline, world, genre, persona)
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
      !isSelectingGenre && 
      !isSelectingPersona 
    ) {
      const { adventureOutline, worldDetails, currentStageIndex, selectedGenre, selectedPersona, inventory } = gameState;
      const currentStage = adventureOutline.stages[currentStageIndex];
      const genreSpecificPersonaTitle = genrePersonaDetails[selectedGenre]?.[selectedPersona]?.title || selectedPersona;
      const personaContext = `The player is a ${genreSpecificPersonaTitle} (base persona: ${selectedPersona}). Their choices and the narrative should reflect this.`;
      const inventoryContext = inventory.length > 0 
        ? `The player possesses: ${inventory.map(item => item.name).join(', ')}.` 
        : "The player possesses no items yet.";
      
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

Describe the opening scene vividly, introducing the player (a ${genreSpecificPersonaTitle}) to the world (as detailed in World Context) and the current stage's context.
Provide exactly 3 distinct choices for the player.
For each choice:
  - "text": Player-facing choice text. Should feel natural within the established world.
  - "outcomePrompt": An instruction for the AI for the *next* scene. This prompt should clearly state if the choice helps progress towards the current stage's objective ("${currentStage.objective}"). If the player is a ${genreSpecificPersonaTitle} (base: ${selectedPersona}), the outcome might be subtly influenced by their archetype, items they possess, and how they interact with the specific elements of this world.
  - "signalsStageCompletion": A boolean (true/false). Set to true if this choice DIRECTLY leads to the completion of the stage objective: "${currentStage.objective}". Otherwise, false.
Provide an "imagePrompt": A detailed artistic description for an image generation AI, matching the ${selectedGenre} tone and the current scene, perhaps hinting at the ${genreSpecificPersonaTitle}'s perspective, and strongly reflecting elements from the World Context.
Provide "isFinalScene": A boolean (true/false). Set to true ONLY if this scene and its choices directly conclude the ENTIRE adventure.
Optionally, if narratively appropriate and it would logically help the player progress or overcome a challenge in this stage, include an "itemFound" field. This field should be an object: { "name": "Item Name", "description": "Brief description of the item and its potential use." }. The item MUST be directly useful for game progression, thematically consistent with the World Context (e.g., its lore, magic system, creatures), the ${selectedGenre}, and potentially the player's persona (${genreSpecificPersonaTitle}, base: ${selectedPersona}). Do not award trivial or purely cosmetic items. Any item awarded should have a clear purpose in aiding the player.

Format the response STRICTLY as a JSON object. Keys: sceneDescription, choices, imagePrompt, isFinalScene, itemFound (optional).`;
      loadStoryScene(initialScenePrompt);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.adventureOutline, gameState.worldDetails, gameState.selectedGenre, gameState.selectedPersona, gameState.currentSegment, gameState.isLoadingOutline, gameState.isLoadingWorld, gameState.isLoadingStory, gameState.error, showResumeModal, gameState.isGameEnded, isSelectingGenre, isSelectingPersona, loadStoryScene, gameState.inventory, gameState.currentStageIndex]);

  // 4. Effect for SAVING game state
  useEffect(() => {
    if (gameState.apiKeyMissing || showResumeModal || gameState.isLoadingOutline || gameState.isLoadingWorld || gameState.isLoadingStory || isSelectingGenre || isSelectingPersona || isLoadingExamination) {
      return;
    }

    if (gameState.isGameEnded) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } else if (gameState.selectedGenre && gameState.selectedPersona && gameState.adventureOutline && gameState.worldDetails && gameState.currentSegment) {
      const stateToSave: SavableGameState = {
        selectedGenre: gameState.selectedGenre,
        selectedPersona: gameState.selectedPersona,
        adventureOutline: gameState.adventureOutline,
        worldDetails: gameState.worldDetails, 
        currentSegment: gameState.currentSegment,
        currentStageIndex: gameState.currentStageIndex,
        isGameEnded: gameState.isGameEnded,
        journal: gameState.journal,
        inventory: gameState.inventory,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.selectedGenre, gameState.selectedPersona, gameState.adventureOutline, gameState.worldDetails, gameState.currentSegment, gameState.currentStageIndex, gameState.isGameEnded, gameState.journal, gameState.inventory, gameState.apiKeyMissing, showResumeModal, gameState.isLoadingOutline, gameState.isLoadingWorld, gameState.isLoadingStory, isSelectingGenre, isSelectingPersona, isLoadingExamination]);

  const handleChoiceSelected = async (choice: Choice) => {
    if (!gameState.currentSegment || !gameState.adventureOutline || !gameState.worldDetails || !gameState.selectedGenre || !gameState.selectedPersona) return;

    setCurrentLoadingText(getRandomLoadingText(storyLoadingTexts));
    setGameState(prev => ({
      ...prev,
      isLoadingStory: true,
      isLoadingImage: imageGenerationFeatureEnabled, // Assume image will load if feature enabled
      error: null,
    }));

    addJournalEntry('choice', choice.text);

    let nextStageIndex = gameState.currentStageIndex;
    if (choice.signalsStageCompletion) {
      if (gameState.currentStageIndex < gameState.adventureOutline.stages.length - 1) {
        nextStageIndex = gameState.currentStageIndex + 1;
      }
    }
    const finalNextStageIndex = nextStageIndex;
    setGameState(prev => ({ ...prev, currentStageIndex: finalNextStageIndex }));


    const { adventureOutline, worldDetails, selectedGenre, selectedPersona, inventory } = gameState;
    const currentStageForPrompt = adventureOutline.stages[finalNextStageIndex];
    const previousStageForPromptContext = adventureOutline.stages[gameState.currentStageIndex === finalNextStageIndex && finalNextStageIndex > 0 ? finalNextStageIndex -1 : gameState.currentStageIndex];

    const genreSpecificPersonaTitle = genrePersonaDetails[selectedGenre]?.[selectedPersona]?.title || selectedPersona;
    const personaContext = `The player is a ${genreSpecificPersonaTitle} (base persona: ${selectedPersona}). Their choices and the narrative should reflect this.`;
    const inventoryContext = inventory.length > 0 
        ? `The player possesses: ${inventory.map(item => item.name).join(', ')}. These items might be relevant based on the world context.` 
        : "The player possesses no items.";
    
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
    const prevSceneDesc = gameState.currentSegment?.sceneDescription || "Previously, the adventure continued...";

    const subsequentPrompt = `You are a master storyteller for a dynamic text-based RPG adventure game.
Adventure Genre: ${selectedGenre}.
${personaContext}
${inventoryContext}
${worldContext}
The overall adventure is titled: "${adventureOutline.title}".
The player's ultimate goal is: "${adventureOutline.overallGoal}".
Adventure Stages: ${adventureOutline.stages.map(s => s.title).join(', ')}.

Player is now at Stage ${finalNextStageIndex + 1}: "${currentStageForPrompt.title}".
Objective for this stage: "${currentStageForPrompt.objective}".

Previous scene (in Stage ${ (gameState.currentStageIndex === finalNextStageIndex && finalNextStageIndex > 0 ? finalNextStageIndex -1 : gameState.currentStageIndex) + 1}: "${previousStageForPromptContext.title}") was: "${prevSceneDesc}"
Player chose: "${choice.text}"
Intended outcome: "${choice.outcomePrompt}"
${choice.signalsStageCompletion ? `This choice completed Stage ${ (gameState.currentStageIndex === finalNextStageIndex && finalNextStageIndex > 0 ? finalNextStageIndex -1 : gameState.currentStageIndex) + 1} ("${previousStageForPromptContext.title}"). Player is now progressing into Stage ${finalNextStageIndex + 1} ("${currentStageForPrompt.title}").` : `Player continues within Stage ${finalNextStageIndex + 1} ("${currentStageForPrompt.title}").`}

Generate the next story segment:
Describe the new scene vividly, aligning with Stage ${finalNextStageIndex + 1} ("${currentStageForPrompt.title}") and objective ("${currentStageForPrompt.objective}"). If the player is a ${genreSpecificPersonaTitle} (base: ${selectedPersona}), the scene might unfold differently based on their archetype, relevant items, and their interaction with the established World Context.
Provide 3 distinct choices. For each choice:
  - "text": Player-facing choice text, appropriate for the world.
  - "outcomePrompt": Instruction for AI for next scene. Detail relation to stage objective: "${currentStageForPrompt.objective}". Consider the ${genreSpecificPersonaTitle} (base: ${selectedPersona}) archetype, available items, and how they might leverage or be affected by the world's specific elements.
  - "signalsStageCompletion": Boolean. True if choice completes stage objective: "${currentStageForPrompt.objective}".
Provide an "imagePrompt": Detailed artistic description for ${selectedGenre} style, reflecting the new scene, ${genreSpecificPersonaTitle}'s perspective, and elements from the World Context.
Provide "isFinalScene": Boolean. True ONLY if this concludes the ENTIRE adventure (overallGoal: "${adventureOutline.overallGoal}" achieved).
Optionally, if narratively appropriate and it would logically help the player progress or overcome a challenge in this stage or a future one, include an "itemFound" field. This field should be an object: { "name": "Item Name", "description": "Brief description of the item and its potential use." }. The item MUST be directly useful for game progression, thematically consistent with the World Context (e.g., its lore, magic system, creatures), the ${selectedGenre}, and potentially the player's persona (${genreSpecificPersonaTitle}, base: ${selectedPersona}). Do not award trivial or purely cosmetic items.

Format response STRICTLY as JSON. Keys: sceneDescription, choices, imagePrompt, isFinalScene, itemFound (optional).`;

    loadStoryScene(subsequentPrompt);
  };

  const handleExamineSelected = async () => {
    if (!gameState.currentSegment || !gameState.adventureOutline || !gameState.worldDetails || !gameState.selectedGenre || !gameState.selectedPersona) return;

    setIsLoadingExamination(true);
    setGameState(prev => ({ ...prev, error: null })); 
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
      setGameState(prev => ({ ...prev, lastRetryInfo: null })); 
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while examining.';
      setGameState(prev => ({ 
          ...prev, 
          error: `Failed to get details: ${errorMessage}`,
          lastRetryInfo: {type: 'resend_original', originalPrompt: "examine_action"} 
      }));
    } finally {
      setIsLoadingExamination(false);
    }
  };

  const handleResumeGame = () => {
    if (initialLoadedState) {
      const shouldLoadImageOnResume = imageGenerationFeatureEnabled && 
                                     !initialLoadedState.currentSegment?.imageUrl && 
                                     !!initialLoadedState.currentSegment?.imagePrompt;
      setGameState(prev => ({
        ...prev,
        selectedGenre: initialLoadedState.selectedGenre, 
        selectedPersona: initialLoadedState.selectedPersona,
        adventureOutline: initialLoadedState.adventureOutline,
        worldDetails: initialLoadedState.worldDetails, 
        currentSegment: initialLoadedState.currentSegment,
        currentStageIndex: initialLoadedState.currentStageIndex,
        isGameEnded: initialLoadedState.isGameEnded,
        journal: initialLoadedState.journal || [],
        inventory: initialLoadedState.inventory || [],
        isLoadingOutline: false,
        isLoadingWorld: false,
        isLoadingStory: false,
        isLoadingImage: shouldLoadImageOnResume,
        error: null,
        lastRetryInfo: null,
      }));
      addJournalEntry('system', 'Game resumed from saved state.');
      setIsSelectingGenre(false); 
      setIsSelectingPersona(false); 

      if (shouldLoadImageOnResume) {
        setCurrentLoadingText(getRandomLoadingText(imageLoadingTexts));
        generateImage(initialLoadedState.currentSegment!.imagePrompt!) // Assert non-null due to shouldLoadImageOnResume check
          .then(imageUrl => {
            setGameState(prev => ({
              ...prev,
              isLoadingImage: false,
              currentSegment: prev.currentSegment ? { ...prev.currentSegment, imageUrl } : null,
            }));
          })
          .catch(err => {
            console.error("Failed to re-generate image on resume:", err);
            setGameState(prev => ({ ...prev, isLoadingImage: false, error: "Failed to reload scene image." }));
          });
      } else {
        // If not loading image (e.g. feature disabled or image already exists), ensure isLoadingImage is false.
         setGameState(prev => ({ ...prev, isLoadingImage: false }));
      }
    }
    setShowResumeModal(false);
    setInitialLoadedState(null);
  };

  const handleRestartGame = (isFromErrorModal: boolean = false) => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setShowResumeModal(false);
    setInitialLoadedState(null);
    
    setGameState({
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
      apiKeyMissing: typeof process.env.API_KEY !== 'string' || process.env.API_KEY === '',
      isGameEnded: false,
      journal: [],
      inventory: [],
      lastRetryInfo: null,
    });
    setIsSelectingGenre(true); 
    setIsSelectingPersona(false); 
    if (!isFromErrorModal) addJournalEntry('system', 'New game started. Choose a genre.');
    setIsJournalOpenOnMobile(false); 
    setIsInventoryOpenOnMobile(false);
  };

  const handleRetry = async () => {
    if (!gameState.lastRetryInfo) return;

    const { type, originalPrompt, faultyJsonText } = gameState.lastRetryInfo;

    setGameState(prev => ({
      ...prev,
      error: null,
      isLoadingOutline: false,
      isLoadingWorld: false,
      isLoadingStory: false,
      isLoadingImage: false,
    }));

    if (type === 'fix_json' && faultyJsonText) {
      setCurrentLoadingText(getRandomLoadingText(fixJsonLoadingTexts));
      setGameState(prev => ({ 
        ...prev, 
        isLoadingStory: true, 
        isLoadingImage: imageGenerationFeatureEnabled 
      }));
      try {
        const fixedSegmentData = await attemptToFixJson(faultyJsonText, originalPrompt);
        await processSuccessfulSegment(fixedSegmentData); 
      } catch (fixError) {
        const fixErrorMessage = fixError instanceof Error ? fixError.message : 'Unknown error during fix attempt.';
        setGameState(prev => ({
          ...prev,
          isLoadingStory: false, 
          isLoadingImage: false,
          error: `AI could not fix the data. Click Retry to regenerate the scene. (Fix error: ${fixErrorMessage})`,
          lastRetryInfo: { type: 'resend_original', originalPrompt: originalPrompt }
        }));
      }
    } else if (type === 'resend_original') {
      if (originalPrompt === "fetch_outline_action") {
        setCurrentLoadingText(getRandomLoadingText(outlineLoadingTexts));
        setGameState(prev => ({
          ...prev,
          isLoadingOutline: true,
          adventureOutline: null, 
          worldDetails: null,     
          currentSegment: null    
        }));
      } else if (originalPrompt === "fetch_world_action") {
        setCurrentLoadingText(getRandomLoadingText(worldLoadingTexts));
        setGameState(prev => ({
          ...prev,
          isLoadingWorld: true,
          worldDetails: null,     
          currentSegment: null    
        }));
      } else if (originalPrompt === "examine_action") {
        setCurrentLoadingText(getRandomLoadingText(examinationLoadingTexts));
        await handleExamineSelected(); 
      } else { 
        setCurrentLoadingText(getRandomLoadingText(storyLoadingTexts));
        setGameState(prev => ({ 
            ...prev, 
            isLoadingStory: true, 
            isLoadingImage: imageGenerationFeatureEnabled 
        })); 
        await loadStoryScene(originalPrompt, true);
      }
    }
  };

  // --- RENDER LOGIC ---

  if (gameState.apiKeyMissing && gameState.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900 text-red-400">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl text-center">
          <h1 className="font-press-start text-xl sm:text-2xl mb-4">Configuration Error</h1>
          <p className="text-lg">{gameState.error}</p>
        </div>
      </div>
    );
  }

  if (showResumeModal && initialLoadedState) {
    return <ResumeModal onResume={handleResumeGame} onRestart={() => handleRestartGame()} />;
  }

  if (isSelectingGenre && !gameState.selectedGenre) {
    return <GenreSelection onGenreSelected={handleGenreSelected} />;
  }
  
  if (isSelectingPersona && !gameState.selectedPersona && gameState.selectedGenre) {
    return <PersonaSelection onPersonaSelected={handlePersonaSelected} selectedGenre={gameState.selectedGenre} />;
  }

  const displayedPersonaTitle = gameState.selectedGenre && gameState.selectedPersona 
    ? genrePersonaDetails[gameState.selectedGenre]?.[gameState.selectedPersona]?.title || gameState.selectedPersona
    : gameState.selectedPersona;

  if (gameState.isGameEnded && gameState.currentSegment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-gray-900 text-gray-100">
        <header className="w-full max-w-5xl mb-6 text-center">
          <h1 className="font-press-start text-3xl text-purple-400 tracking-tight">{gameState.adventureOutline?.title || "Adventure Ended"}</h1>
           {gameState.selectedGenre && <p className="text-xl text-indigo-300 mt-1">Genre: {gameState.selectedGenre}</p>}
           {gameState.worldDetails && <p className="text-xl text-purple-200 mt-1">World: {gameState.worldDetails.worldName}</p>}
           {displayedPersonaTitle && <p className="text-base text-purple-300 mt-1">As: {displayedPersonaTitle}</p>}
        </header>
        <main className="w-full max-w-3xl bg-gray-800 p-8 rounded-lg shadow-xl text-center">
          <h2 className="font-press-start text-2xl mb-6 text-green-400">Congratulations!</h2>
          <p className="text-gray-300 whitespace-pre-line leading-relaxed mb-4 text-lg">
            {gameState.currentSegment.sceneDescription}
          </p>
          {imageGenerationFeatureEnabled && gameState.currentSegment.imageUrl && (
            <img src={gameState.currentSegment.imageUrl} alt="Final scene" className="rounded-md shadow-lg mx-auto my-4 max-w-full h-auto" style={{maxHeight: '400px'}} />
          )}
          <p className="text-xl text-gray-400">You have completed the adventure: <span className="font-semibold text-purple-300">{gameState.adventureOutline?.overallGoal}</span></p>
          {gameState.inventory.length > 0 && (
            <div className="mt-6 text-left">
                <h3 className="font-press-start text-lg text-purple-300 mb-2">Your Final Inventory:</h3>
                <ul className="list-disc list-inside text-gray-400 text-base">
                    {gameState.inventory.map(item => (
                        <li key={item.id}>{item.name}</li>
                    ))}
                </ul>
            </div>
          )}
          <button
            onClick={() => handleRestartGame()}
            className="mt-8 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 text-lg"
          >
            Play Again?
          </button>
        </main>
      </div>
    );
  }

  const isLoading = gameState.isLoadingOutline || gameState.isLoadingWorld || gameState.isLoadingStory || (gameState.isLoadingImage && imageGenerationFeatureEnabled) || isLoadingExamination;
  let dynamicLoadingText = currentLoadingText; 
  if (gameState.isLoadingOutline && (!dynamicLoadingText || !outlineLoadingTexts.includes(dynamicLoadingText))) dynamicLoadingText = getRandomLoadingText(outlineLoadingTexts);
  else if (gameState.isLoadingWorld && (!dynamicLoadingText || !worldLoadingTexts.includes(dynamicLoadingText))) dynamicLoadingText = getRandomLoadingText(worldLoadingTexts);
  else if (gameState.isLoadingStory && (!dynamicLoadingText || !storyLoadingTexts.includes(dynamicLoadingText))) dynamicLoadingText = getRandomLoadingText(storyLoadingTexts);
  else if (gameState.isLoadingImage && imageGenerationFeatureEnabled && (!dynamicLoadingText || !imageLoadingTexts.includes(dynamicLoadingText))) dynamicLoadingText = getRandomLoadingText(imageLoadingTexts);
  else if (isLoadingExamination && (!dynamicLoadingText || !examinationLoadingTexts.includes(dynamicLoadingText))) dynamicLoadingText = getRandomLoadingText(examinationLoadingTexts);


  const choicePanelProps = {
      currentSegment: gameState.currentSegment,
      isLoadingStory: gameState.isLoadingStory,
      isLoading: isLoading, 
      isLoadingExamination: isLoadingExamination,
      handleChoiceSelected: handleChoiceSelected,
      handleExamineSelected: handleExamineSelected,
      currentLoadingText: dynamicLoadingText || "Loading...", 
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-gray-900 text-gray-100 items-center">
      <header className="w-full max-w-5xl mb-8 text-center"> 
        <h1 className="font-press-start text-3xl text-purple-400 tracking-tight mb-3"> 
          {gameState.adventureOutline ? gameState.adventureOutline.title : "Forge your Journey"}
        </h1>

        {gameState.adventureOutline && (
          <p className="text-2xl font-semibold text-purple-300 mt-1 mb-4"> 
            Goal: {gameState.adventureOutline.overallGoal}
          </p>
        )}
        
        {gameState.adventureOutline && gameState.currentSegment && !gameState.isGameEnded && (
          <div className="mt-1 mb-4"> 
            <p className="text-xl font-semibold text-gray-200"> 
              Stage {gameState.currentStageIndex + 1} / {gameState.adventureOutline.stages.length}: {gameState.adventureOutline.stages[gameState.currentStageIndex].title}
            </p>
            <p className="text-xl font-medium text-gray-300 mt-0.5"> 
               Objective: {gameState.adventureOutline.stages[gameState.currentStageIndex].objective}
            </p>
          </div>
        )}

         <div className="mt-1 text-sm text-gray-500 space-y-0.5"> 
            {gameState.selectedGenre && <p>Genre: {gameState.selectedGenre}</p>}
            {gameState.worldDetails && <p>World: {gameState.worldDetails.worldName} <span className="text-gray-600">({gameState.worldDetails.genreClarification})</span></p>}
            {displayedPersonaTitle && <p>As: {displayedPersonaTitle}</p>}
        </div>
      </header>

      {gameState.error && !gameState.apiKeyMissing && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="error-modal-title">
          <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl text-center max-w-md w-full border border-red-700">
            <h2 id="error-modal-title" className="font-press-start text-xl sm:text-2xl mb-4 text-red-400">An Error Occurred</h2>
            <p className="text-gray-300 mb-6 text-base sm:text-lg whitespace-pre-wrap"> 
              {gameState.error}
            </p>
            <div className="flex flex-col gap-3">
              {gameState.lastRetryInfo && (
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-opacity-75 transform hover:scale-105 text-lg"
                  aria-label="Retry last action"
                >
                  Retry
                </button>
              )}
              <button
                onClick={() => handleRestartGame(true)}
                className={`px-6 py-3 font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-opacity-75 transform hover:scale-105 text-lg
                            ${gameState.lastRetryInfo ? 'bg-gray-600 hover:bg-gray-500 text-white focus:ring-2 focus:ring-gray-400'
                                              : 'bg-purple-600 hover:bg-purple-500 text-white focus:ring-2 focus:ring-purple-400'}`}
                aria-label="Start a new game"
              >
                Start New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {(gameState.isLoadingOutline || gameState.isLoadingWorld || (gameState.isLoadingStory && !gameState.currentSegment)) && (
         <div className="flex flex-col items-center justify-center h-64">
           <LoadingSpinner />
           <p className="mt-4 text-xl text-gray-400">{dynamicLoadingText || "Loading..."}</p>
         </div>
      )}
      
      {gameState.currentSegment && !gameState.isGameEnded && (
        <div className="w-full max-w-5xl flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="lg:w-2/3 flex-shrink-0 flex flex-col gap-6">
            <StoryDisplay
              imageUrl={gameState.currentSegment.imageUrl}
              isLoadingImage={gameState.isLoadingImage && !gameState.currentSegment.imageUrl}
              isLoadingStory={gameState.isLoadingStory && !gameState.currentSegment.sceneDescription}
              imageGenerationFeatureEnabled={imageGenerationFeatureEnabled}
            />
            <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl">
                <h2 className="font-press-start text-xl sm:text-2xl mb-3 sm:mb-4 text-purple-300 border-b border-gray-700 pb-2">Current Scene</h2>
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
                            onClick={() => setIsJournalOpenOnMobile(!isJournalOpenOnMobile)}
                            className="w-full p-3 bg-gray-700 hover:bg-gray-600 text-purple-300 font-semibold rounded-lg shadow-md transition-colors duration-150 text-base"
                            aria-expanded={isJournalOpenOnMobile}
                            aria-controls="journal-log-mobile"
                        >
                            {isJournalOpenOnMobile ? "Hide" : "Show"} Adventure Log ({gameState.journal.length})
                        </button>
                        {isJournalOpenOnMobile && (
                            <div id="journal-log-mobile" className="mt-2">
                                <JournalLog journal={gameState.journal} className="bg-gray-800 p-4 rounded-lg shadow-xl max-h-72 overflow-y-auto custom-scrollbar"/>
                            </div>
                        )}
                    </div>
                )}
                {gameState.inventory.length > 0 && (
                     <div>
                        <button
                            onClick={() => setIsInventoryOpenOnMobile(!isInventoryOpenOnMobile)}
                            className="w-full p-3 bg-gray-700 hover:bg-gray-600 text-teal-300 font-semibold rounded-lg shadow-md transition-colors duration-150 text-base"
                            aria-expanded={isInventoryOpenOnMobile}
                            aria-controls="inventory-display-mobile"
                        >
                            {isInventoryOpenOnMobile ? "Hide" : "Show"} Inventory ({gameState.inventory.length})
                        </button>
                        {isInventoryOpenOnMobile && (
                            <div id="inventory-display-mobile" className="mt-2">
                                <InventoryDisplay inventory={gameState.inventory} className="bg-gray-800 p-4 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar"/>
                            </div>
                        )}
                    </div>
                )}
                 {gameState.inventory.length === 0 && gameState.journal.length > 0 && ( 
                     <div className="p-3 bg-gray-700 text-teal-400 text-center font-semibold rounded-lg shadow-md text-base">
                        Inventory Empty
                    </div>
                )}
                 {gameState.inventory.length === 0 && gameState.journal.length === 0 && !isJournalOpenOnMobile && (
                     <div className="p-3 bg-gray-700 text-teal-400 text-center font-semibold rounded-lg shadow-md text-base">
                        Inventory Empty
                    </div>
                )}
            </div>
          </div>

          <aside className="hidden lg:block lg:w-1/3 space-y-6 flex-shrink-0 sticky top-8 self-start max-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar pr-2">
            <ChoicePanel {...choicePanelProps} />
            {gameState.inventory.length > 0 && <InventoryDisplay inventory={gameState.inventory} />}
            {gameState.inventory.length === 0 && (
                 <div className="bg-gray-800 p-4 rounded-lg shadow-xl">
                    <h3 className="font-press-start text-lg text-teal-300 border-b border-gray-700 pb-2 mb-3">Inventory</h3>
                    <p className="text-gray-500 text-base">Your satchel is empty.</p> 
                </div>
            )}
            {gameState.journal.length > 0 && <JournalLog journal={gameState.journal} />}
             {gameState.journal.length === 0 && (
                 <div className="bg-gray-800 p-4 rounded-lg shadow-xl">
                    <h3 className="font-press-start text-lg text-purple-300 border-b border-gray-700 pb-2 mb-3">Adventure Log</h3>
                    <p className="text-gray-500 text-base">Your adventure is yet to be written.</p> 
                </div>
            )}
          </aside>
        </div>
      )}

      {showExaminationModal && examinationText && (
        <ExaminationModal text={examinationText} onClose={() => setShowExaminationModal(false)} />
      )}
      
      <footer className="w-full max-w-5xl mt-12 text-center text-sm text-gray-500"> 
        <p>&copy; {new Date().getFullYear()} Forge your Journey. Content generation by Google Gemini.</p>
      </footer>
    </div>
  );
};

export default App;
