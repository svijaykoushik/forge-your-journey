

import React from 'react';
import { Persona, PERSONA_OPTIONS, GameGenre, genrePersonaDetails, GenrePersonaDetail } from '../types';

interface PersonaSelectionProps {
  onPersonaSelected: (persona: Persona) => void;
  selectedGenre: GameGenre;
}

// Default descriptions, can serve as fallback
const defaultPersonaDescriptions: Record<Persona, string> = {
  "Cautious Scholar": "Values knowledge and careful planning. Prefers to understand a situation fully before acting.",
  "Brave Warrior": "Faces challenges head-on with courage and strength. Quick to act and defend.",
  "Cunning Rogue": "Relies on wit, stealth, and trickery. Adept at finding unconventional solutions.",
  "Mysterious Wanderer": "An enigmatic figure with unclear motives, often an outsider observing and adapting.",
};

const PersonaSelection: React.FC<PersonaSelectionProps> = ({ onPersonaSelected, selectedGenre }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900 text-gray-100">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-2xl text-center border border-gray-700">
        <p className="text-base text-indigo-300 mb-2">Genre: {selectedGenre}</p> {/* Increased font size from text-sm */}
        <h1 className="font-press-start text-2xl sm:text-3xl mb-3 text-purple-300">Choose Your Persona</h1>
        <p className="text-gray-400 mb-8 text-base sm:text-lg font-['Alegreya_Sans']">Your choice will subtly shape your adventure within the {selectedGenre} world.</p> {/* Increased font size */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PERSONA_OPTIONS.map((persona) => {
            const genreSpecificDetails: GenrePersonaDetail | undefined = genrePersonaDetails[selectedGenre]?.[persona];
            const displayTitle = genreSpecificDetails?.title || persona;
            const displayDescription = genreSpecificDetails?.description || defaultPersonaDescriptions[persona];

            return (
              <button
                key={persona}
                onClick={() => onPersonaSelected(persona)} // Pass the original Persona type
                className="p-6 bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75 transform hover:scale-105 text-left h-full flex flex-col"
                aria-label={`Select persona: ${displayTitle}`}
              >
                {/* Display genre-specific title. "Press Start 2P" will be applied by a global class if this h2 inherits it, or by direct styling if needed */}
                <h2 className="text-xl font-semibold mb-1 font-press-start">{displayTitle}</h2> 
                {/* Display genre-specific description. */}
                <p className="text-base text-purple-100 opacity-90 flex-grow font-['Alegreya_Sans']">{displayDescription}</p> {/* Increased font size from text-sm */}
              </button>
            );
          })}
        </div>
      </div>
       <footer className="mt-8 text-center text-sm text-gray-500"> {/* Increased from text-xs */}
        <p>&copy; {new Date().getFullYear()} Forge your Journey. All rights reserved (not really).</p>
      </footer>
    </div>
  );
};

export default PersonaSelection;