import React from 'react';
import { Choice } from '../types';

interface ChoiceButtonProps {
  choice: Choice;
  onSelect: (choice: Choice) => void;
  disabled: boolean;
  isExamineButton?: boolean;
}

const ChoiceButton: React.FC<ChoiceButtonProps> = ({
  choice,
  onSelect,
  disabled,
  isExamineButton
}) => {
  const baseClasses = `
    w-full text-left p-4 rounded-lg transition-all duration-150 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-opacity-75
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const primaryClasses = `
    border-2 border-purple-500 bg-purple-600 hover:bg-purple-500 text-white
    focus:ring-purple-400
    disabled:bg-gray-600 disabled:border-gray-500
  `;

  const examineClasses = `
    border-2 border-teal-500 bg-teal-600 hover:bg-teal-500 text-white
    focus:ring-teal-400 
    disabled:bg-gray-600 disabled:border-gray-500
  `;

  return (
    <button
      onClick={() => onSelect(choice)}
      disabled={disabled}
      className={`${baseClasses} ${isExamineButton ? examineClasses : primaryClasses}`}
      aria-label={choice.text}
    >
      <span className="font-medium font-['Alegreya_Sans']">{choice.text}</span>
      {isExamineButton && (
        <span className="text-xs block opacity-80 font-['Alegreya_Sans']">
          (Observe more closely)
        </span>
      )}
    </button>
  );
};

export default ChoiceButton;
