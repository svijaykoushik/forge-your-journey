import React from 'react';
import { GameGenre, GENRE_OPTIONS } from '../types';

interface GenreSelectionProps {
  onGenreSelected: (genre: GameGenre) => void;
}

const genreDescriptions: Record<GameGenre, string> = {
  'Dark Fantasy':
    'A grim world of perilous magic, ancient evils, and morally ambiguous choices.',
  'Sci-Fi Detective':
    'Unravel complex mysteries in a futuristic city, using advanced tech and keen observation.',
  'Post-Apocalyptic Survival':
    'Navigate a harsh, ruined world, scavenging for resources and facing constant danger.',
  'Mythological Epic':
    'Embark on a grand quest inspired by ancient myths, encountering gods, monsters, and legendary heroes.',
  'Steampunk Chronicle':
    'Explore a world of Victorian aesthetics, steam-powered marvels, and daring inventions.',
  'Cosmic Horror':
    'Confront sanity-shattering truths and entities from beyond the stars in a universe indifferent to humanity.'
};

const GenreSelection: React.FC<GenreSelectionProps> = ({ onGenreSelected }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900 text-gray-100">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-2xl text-center border border-gray-700">
        <h1 className="font-press-start text-2xl sm:text-3xl mb-3 text-purple-300">
          Choose Your Adventure's Genre
        </h1>
        <p className="text-gray-400 mb-8 text-base sm:text-lg font-['Alegreya_Sans']">
          This will set the tone and theme of your story.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GENRE_OPTIONS.map((genre) => (
            <button
              key={genre}
              onClick={() => onGenreSelected(genre)}
              className="p-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 transform hover:scale-105 text-left h-full flex flex-col"
              aria-label={`Select genre: ${genre}`}
            >
              <h2 className="text-xl font-semibold mb-1 font-press-start">
                {genre}
              </h2>
              <p className="text-base text-indigo-100 opacity-90 flex-grow font-['Alegreya_Sans']">
                {genreDescriptions[genre]}
              </p>
            </button>
          ))}
        </div>
      </div>
      <footer className="mt-8 text-center text-sm text-gray-500">
        <p>
          &copy; {new Date().getFullYear()} Forge your Journey. Adventure
          awaits!
        </p>
      </footer>
    </div>
  );
};

export default GenreSelection;
