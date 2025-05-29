

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
  isExamineAction?: boolean; // For the special "Examine" choice
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
  itemFound?: InventoryItem; // Added for newly found item in this segment
}

export interface JournalEntry {
  type: 'scene' | 'choice' | 'examine' | 'system' | 'item_found' | 'world_generated' | 'genre_selected' | 'persona_selected';
  content: string;
  timestamp: string; // ISO string format
}

export type RetryType = 'resend_original' | 'fix_json';
export interface RetryInfo {
  type: RetryType;
  originalPrompt: string; // The prompt that led to the current situation
  faultyJsonText?: string; // The malformed JSON text, if applicable
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
  selectedGenre: GameGenre | null; // Added selected genre
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
  journal: JournalEntry[];
  inventory: InventoryItem[];
  lastRetryInfo: RetryInfo | null;
}

export interface SavableGameState {
  selectedGenre: GameGenre; // Added selected genre
  selectedPersona: Persona; // Changed to non-null, assuming game can't be saved before persona selection
  adventureOutline: AdventureOutline;
  worldDetails: WorldDetails; 
  currentSegment: StorySegment;
  currentStageIndex: number;
  isGameEnded: boolean;
  journal: JournalEntry[];
  inventory: InventoryItem[];
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
  itemFound?: GeminiStoryResponseItemFound;
}

export interface GeminiAdventureOutlineResponse extends AdventureOutline {}

export interface GeminiWorldDetailsResponse extends WorldDetails {}

export interface GeminiExaminationResponse {
  examinationText: string;
}

// Custom error class for JSON parsing issues to carry raw text
export class JsonParseError extends Error {
  constructor(message: string, public rawText: string) {
    super(message);
    this.name = "JsonParseError";
  }
}
