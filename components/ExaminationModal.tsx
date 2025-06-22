import React from 'react';

interface ExaminationModalProps {
  text: string;
  onClose: () => void;
}

const ExaminationModal: React.FC<ExaminationModalProps> = ({
  text,
  onClose
}) => {
  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="examination-modal-title"
      onClick={onClose} // Close on backdrop click
    >
      <div
        className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl text-left max-w-xl w-full border border-teal-600 relative"
        onClick={(e) => e.stopPropagation()} // Prevent modal close when clicking inside modal content
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-200 transition-colors text-2xl leading-none"
          aria-label="Close examination details"
        >
          &times;
        </button>
        <h2
          id="examination-modal-title"
          className="font-press-start text-xl sm:text-2xl mb-4 text-teal-300"
        >
          Upon Closer Inspection...
        </h2>
        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <p className="text-gray-300 whitespace-pre-line leading-relaxed text-base sm:text-lg">
            {' '}
            {/* Increased font size */}
            {text}
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75 text-lg"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default ExaminationModal;
