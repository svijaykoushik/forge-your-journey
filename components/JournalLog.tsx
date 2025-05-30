import React, { useEffect, useRef } from 'react';
import { JournalEntry } from '../types';

interface JournalLogProps {
  journal: JournalEntry[];
  className?: string; 
}

const JournalLog: React.FC<JournalLogProps> = ({ journal, className }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [journal]);

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getEntryStyle = (type: JournalEntry['type']) => {
    switch (type) {
      case 'scene':
        return "border-l-4 border-blue-500 pl-3";
      case 'choice':
        return "border-l-4 border-green-500 pl-3";
      case 'examine':
        return "border-l-4 border-yellow-500 pl-3";
      case 'item_found':
        return "border-l-4 border-teal-500 pl-3";
      case 'world_generated':
        return "border-l-4 border-indigo-500 pl-3 text-indigo-300";
      case 'genre_selected':
        return "border-l-4 border-pink-500 pl-3 text-pink-300";
      case 'persona_selected':
        return "border-l-4 border-orange-500 pl-3 text-orange-300";
      case 'system':
        return "border-l-4 border-gray-500 pl-3 text-gray-400 italic";
      default:
        return "pl-3";
    }
  };
  
  const getEntryPrefix = (type: JournalEntry['type']) => {
    switch (type) {
      case 'scene':
        return <strong className="text-blue-400">Scene:</strong>;
      case 'choice':
        return <strong className="text-green-400">Choice:</strong>;
      case 'examine':
        return <strong className="text-yellow-400">Examined:</strong>;
      case 'item_found':
        return <strong className="text-teal-400">Item Found:</strong>;
      case 'world_generated':
        return <strong className="text-indigo-400">World Event:</strong>;
      case 'genre_selected':
        return <strong className="text-pink-400">Genre Focus:</strong>;
      case 'persona_selected':
        return <strong className="text-orange-400">Persona Chosen:</strong>;
      case 'system':
         return <strong className="text-gray-400">System:</strong>;
      default:
        return "";
    }
  }

  if (!journal || journal.length === 0) {
    // This case is handled by App.tsx for desktop to show a styled empty state.
     return null;
  }

  const defaultClasses = "bg-gray-800 p-4 rounded-lg shadow-xl max-h-96 overflow-y-auto custom-scrollbar";

  return (
    <div className={className || defaultClasses}>
      <h3 className="font-['Alegreya_Sans'] text-xl font-bold mb-3 text-purple-300 border-b border-gray-700 pb-2 sticky top-0 bg-gray-800 z-10">
        Adventure Log
      </h3>
      {journal.map((entry, index) => (
        <div key={index} className={`py-2 my-1 text-base ${getEntryStyle(entry.type)}`}> {/* Increased font size from text-sm */}
          <span className="text-xs text-gray-500 block mb-0.5">{formatTimestamp(entry.timestamp)}</span>
          <div className="flex gap-x-2">
            <span>{getEntryPrefix(entry.type)}</span>
            <p className="whitespace-pre-line leading-relaxed">{entry.content}</p>
          </div>
        </div>
      ))}
      <div ref={logEndRef} />
    </div>
  );
};

export default JournalLog;