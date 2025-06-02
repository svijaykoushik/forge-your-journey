

export class ImageGenerationQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageGenerationQuotaError";
  }
}

export interface AdventureStage {
  title: string;
  description: string;
  objective: string;
}

export interface AdventureOutline {
  title:string;
  overallGoal: string;
  stages: AdventureStage[];
}

export type Persona = "Cautious Scholar" | "Brave Warrior" | "Cunning Rogue" | "Mysterious Wanderer";
export const PERSONA_OPTIONS: Persona[] = ["Cautious Scholar", "Brave Warrior", "Cunning Rogue", "Mysterious Wanderer"];

export type GameGenre = "Dark Fantasy" | "Sci-Fi Detective" | "Post-Apocalyptic Survival" | "Mythological Epic" | "Steampunk Chronicle" | "Cosmic Horror";
export const GENRE_OPTIONS: GameGenre[] = [
  "Dark Fantasy", 
  "Sci-Fi Detective", 
  "Post-Apocalyptic Survival", 
  "Mythological Epic", 
  "Steampunk Chronicle",
  "Cosmic Horror"
];

export interface GenrePersonaDetail {
  title: string;
  description: string;
}

export type GenreSpecificPersonaDetails = Record<GameGenre, Record<Persona, GenrePersonaDetail>>;

export const genrePersonaDetails: GenreSpecificPersonaDetails = {
  "Dark Fantasy": {
    "Cautious Scholar": {
      title: "Lorekeeper of Shadows",
      description: "Scours forbidden texts and ancient ruins, believing knowledge is the only shield against the encroaching darkness."
    },
    "Brave Warrior": {
      title: "Grim Warden",
      description: "A stoic defender standing against nightmarish beasts and corrupting influences, their blade a beacon in the gloom."
    },
    "Cunning Rogue": {
      title: "Grave Robber",
      description: "Navigates treacherous crypts and haunted ruins, using stealth and guile to unearth forgotten treasures and survive."
    },
    "Mysterious Wanderer": {
      title: "Curse-Touched Nomad",
      description: "A solitary figure bearing a mysterious affliction, their path entwined with grim prophecies and the decaying remnants of forgotten kingdoms."
    }
  },
  "Sci-Fi Detective": {
    "Cautious Scholar": {
      title: "Data Forensics Analyst",
      description: "Meticulously sifts through corrupted data logs and encrypted corporate networks to uncover digital trails and expose high-tech conspiracies."
    },
    "Brave Warrior": {
      title: "Cybernetic Enforcer",
      description: "A city police officer or corporate agent with advanced combat augments, unafraid to confront dangerous syndicates in neon-lit alleyways."
    },
    "Cunning Rogue": {
      title: "Information Broker",
      description: "A master of infiltration and social engineering, navigating the digital underworld and trading secrets in the city's hidden data havens."
    },
    "Mysterious Wanderer": {
      title: "Off-World Investigator",
      description: "An enigmatic detective from a distant colony, observing the city's deep-seated corruption with an outsider's perspective and a hidden agenda."
    }
  },
  "Post-Apocalyptic Survival": {
    "Cautious Scholar": {
      title: "Wasteland Historian",
      description: "Preserves fragments of pre-cataclysm knowledge, seeking to understand the old world's fall to avoid repeating its mistakes."
    },
    "Brave Warrior": {
      title: "Settlement Guardian",
      description: "Protects their small community from mutants, raiders, and the harsh elements, embodying resilience in a broken world."
    },
    "Cunning Rogue": {
      title: "Ruin Scavenger",
      description: "Expertly navigates the treacherous ruins of the old world, using stealth and resourcefulness to find valuable supplies."
    },
    "Mysterious Wanderer": {
      title: "Lone Survivor",
      description: "A hardened individual drifting through the desolate wastes, their past a mystery, driven by an unknown purpose or merely the will to endure."
    }
  },
  "Mythological Epic": {
    "Cautious Scholar": {
      title: "Oracle's Acolyte",
      description: "Studies ancient prophecies and divine lore, seeking wisdom from the gods to guide mortals through legendary trials."
    },
    "Brave Warrior": {
      title: "Demigod Hero",
      description: "Possessing divine blood or blessed by the gods, embarks on epic quests to battle mythical beasts and challenge fate."
    },
    "Cunning Rogue": {
      title: "Trickster's Chosen",
      description: "Favored by a deity of cunning, uses wit and trickery to outsmart mortals and monsters alike, often blurring the line between hero and anti-hero."
    },
    "Mysterious Wanderer": {
      title: "Exiled Deity",
      description: "A lesser god or spirit stripped of their power, wandering the mortal realm, seeking redemption or a way to reclaim their divinity."
    }
  },
  "Steampunk Chronicle": {
    "Cautious Scholar": {
      title: "Clockwork Theorist",
      description: "Delves into the intricacies of automatons and aetheric science, always on the verge of the next groundbreaking (and possibly dangerous) invention."
    },
    "Brave Warrior": {
      title: "Sky Captain",
      description: "Commands a magnificent airship, bravely exploring uncharted territories and defending against sky pirates with steam-powered weaponry."
    },
    "Cunning Rogue": {
      title: "Gear-Driven Infiltrator",
      description: "Utilizes ingenious gadgets and knowledge of mechanical contraptions to bypass security and acquire sensitive information or artifacts."
    },
    "Mysterious Wanderer": {
      title: "Time-Displaced Inventor",
      description: "An anachronistic genius from another era or dimension, observing this steam-powered world with a unique perspective and revolutionary ideas."
    }
  },
  "Cosmic Horror": {
    "Cautious Scholar": {
      title: "Forbidden Scholar",
      description: "Obsessively researches sanity-shattering texts and cultic rituals, driven to understand the incomprehensible entities from beyond."
    },
    "Brave Warrior": {
      title: "Doomed Investigator",
      description: "Attempts to confront the unnamable horrors, knowing their strength is likely futile against cosmic indifference, but fighting nonetheless."
    },
    "Cunning Rogue": {
      title: "Cult Infiltrator",
      description: "Navigates the shadowy fringes of society, dealing with deranged cultists and eldritch artifacts, always one step away from madness or a grisly end."
    },
    "Mysterious Wanderer": {
      title: "Touched by the Void",
      description: "An individual who has glimpsed the abyss and survived, forever changed, wandering the world as a harbinger or a seeker of oblivion."
    }
  }
};


export interface Choice {
  text: string;
  outcomePrompt: string;
  signalsStageCompletion?: boolean;
  leadsToFailure?: boolean; 
  isExamineAction?: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
}

export interface StorySegment {
  sceneDescription: string;
  choices: Choice[]; 
  imagePrompt: string;
  imageUrl?: string;
  isFinalScene?: boolean; 
  isFailureScene?: boolean; 
  itemFound?: InventoryItem;
  isUserInputCommandOnly?: boolean; 
}

export interface JournalEntry {
  type: 'scene' | 'choice' | 'custom_action' | 'examine' | 'system' | 'item_found' | 'world_generated' | 'genre_selected' | 'persona_selected' | 'action_impossible';
  content: string;
  timestamp: string; 
}

export type RetryType = 'resend_original' | 'fix_json';
export interface RetryInfo {
  type: RetryType;
  originalPrompt: string; 
  faultyJsonText?: string; 
  customActionText?: string; 
}

export interface WorldDetails {
  worldName: string;
  genreClarification: string; 
  keyEnvironmentalFeatures: string[];
  dominantSocietiesOrFactions: string[];
  uniqueCreaturesOrMonsters: string[];
  magicSystemOverview: string;
  briefHistoryHook: string;
  culturalNormsOrTaboos: string[];
}

export interface GameState {
  selectedGenre: GameGenre | null;
  selectedPersona: Persona | null;
  adventureOutline: AdventureOutline | null;
  worldDetails: WorldDetails | null; 
  currentSegment: StorySegment | null;
  currentStageIndex: number;
  isLoadingOutline: boolean;
  isLoadingWorld: boolean; 
  isLoadingStory: boolean;
  isLoadingImage: boolean;
  error: string | null;
  apiKeyMissing: boolean;
  isGameEnded: boolean; 
  isGameFailed: boolean; 
  journal: JournalEntry[];
  inventory: InventoryItem[];
  lastRetryInfo: RetryInfo | null;
  imageGenerationPermanentlyDisabled: boolean; // New: for quota limits
}

export interface SavableGameState {
  selectedGenre: GameGenre;
  selectedPersona: Persona;
  adventureOutline: AdventureOutline;
  worldDetails: WorldDetails; 
  currentSegment: StorySegment;
  currentStageIndex: number;
  isGameEnded: boolean;
  isGameFailed: boolean; 
  journal: JournalEntry[];
  inventory: InventoryItem[];
  imageGenerationPermanentlyDisabled: boolean; // New: for quota limits
}

export interface GeminiStoryResponseItemFound {
    name: string;
    description: string;
}

export interface GeminiStoryResponse {
  sceneDescription: string;
  choices: Choice[]; 
  imagePrompt: string;
  isFinalScene?: boolean;
  isFailureScene?: boolean; 
  itemFound?: GeminiStoryResponseItemFound;
  isUserInputCommandOnly?: boolean; 
}

export interface GeminiAdventureOutlineResponse extends AdventureOutline {}

export interface GeminiWorldDetailsResponse extends WorldDetails {}

export interface GeminiExaminationResponse {
  examinationText: string;
}

export class JsonParseError extends Error {
  constructor(message: string, public rawText: string) {
    super(message);
    this.name = "JsonParseError";
  }
}