
import React from 'react';

interface ResumeModalProps {
  onResume: () => void;
  onRestart: () => void;
}

const ResumeModal: React.FC<ResumeModalProps> = ({ onResume, onRestart }) => {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="resume-modal-title">
      <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl text-center max-w-md w-full border border-gray-700">
        <h2 id="resume-modal-title" className="font-press-start text-xl sm:text-2xl mb-6 text-purple-300">Adventure Awaits!</h2>
        <p className="text-gray-300 mb-8 text-base sm:text-lg"> {/* Increased font size */}
          An echo of your past journey lingers. Would you like to continue where you left off, or shall we scribe a new legend?
        </p>
        <div className="flex flex-col sm:flex-row justify-around gap-4">
          <button
            onClick={onResume}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transform hover:scale-105 flex-1 text-lg"
            aria-label="Resume previous game"
          >
            Resume Journey
          </button>
          <button
            onClick={onRestart}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75 transform hover:scale-105 flex-1 text-lg"
            aria-label="Start a new game"
          >
            Start Anew
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeModal;
