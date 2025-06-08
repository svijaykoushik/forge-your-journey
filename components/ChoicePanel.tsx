import React, { useState } from 'react';
import { StorySegment, Choice } from '../types';
import ChoiceButton from './ChoiceButton';
import LoadingSpinner from './LoadingSpinner';

interface ChoicePanelProps {
  currentSegment: StorySegment | null;
  isLoadingStory: boolean;
  isLoading: boolean;
  isLoadingExamination: boolean;
  handleChoiceSelected: (choice: Choice) => void;
  handleExamineSelected: () => void;
  handleCustomActionSubmit: (actionText: string) => void;
  currentLoadingText: string;
}

const ChoicePanel: React.FC<ChoicePanelProps> = ({
  currentSegment,
  isLoadingStory,
  isLoading,
  isLoadingExamination,
  handleChoiceSelected,
  handleExamineSelected,
  handleCustomActionSubmit,
  currentLoadingText
}) => {
  const [customActionText, setCustomActionText] = useState('');

  const onSubmitCustomAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (customActionText.trim() && !isLoading) {
      handleCustomActionSubmit(customActionText.trim());
      setCustomActionText(''); // Clear after submit
    }
  };

  if (isLoadingStory || isLoadingExamination) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-gray-800 rounded-lg shadow-xl min-h-[200px]">
        <LoadingSpinner />
        <p className="mt-3 text-gray-300">
          {currentLoadingText ||
            (isLoadingStory ? 'The story unfolds...' : 'Examining...')}
        </p>
      </div>
    );
  }

  if (!currentSegment) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-xl min-h-[200px] flex items-center justify-center">
        <p className="text-gray-400 text-center">Awaiting scenario...</p>
      </div>
    );
  }

  const showPredefinedChoices =
    currentSegment.choices &&
    currentSegment.choices.length > 0 &&
    !currentSegment.isUserInputCommandOnly;
  const showExamineButton = !currentSegment.isUserInputCommandOnly;

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-xl space-y-4">
      <div>
        {showPredefinedChoices && (
          <>
            <h3 className="font-press-start text-xl mb-3 text-purple-300">
              Make Your Choice:
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {currentSegment.choices.map((choice, index) => (
                <ChoiceButton
                  key={index}
                  choice={choice}
                  onSelect={() => handleChoiceSelected(choice)}
                  disabled={isLoading}
                />
              ))}
            </div>
          </>
        )}
        {currentSegment.isUserInputCommandOnly && (
          <p className="text-lg text-yellow-300 font-semibold mb-3 text-center p-2 bg-gray-700 rounded-md">
            The path is yours to forge. What do you do?
          </p>
        )}
      </div>

      {showExamineButton && (
        <ChoiceButton
          choice={{
            text: 'Examine surroundings',
            outcomePrompt: '',
            isExamineAction: true
          }}
          onSelect={handleExamineSelected}
          disabled={isLoading}
          isExamineButton={true}
        />
      )}

      <form
        onSubmit={onSubmitCustomAction}
        className="space-y-2 pt-2 border-t border-gray-700"
      >
        <label
          htmlFor="customActionInput"
          className="block font-semibold text-teal-300 text-base"
        >
          Or, take a different path:
        </label>
        <textarea
          id="customActionInput"
          value={customActionText}
          onChange={(e) => setCustomActionText(e.target.value)}
          placeholder="Describe your action (e.g., 'Look under the table', 'Ask the guard about the strange noise', 'Try to pick the lock')"
          rows={3}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-gray-500 disabled:opacity-60"
          disabled={isLoading}
          aria-label="Describe your custom action"
        />
        <button
          type="submit"
          disabled={isLoading || !customActionText.trim()}
          className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          Perform Action
        </button>
      </form>
    </div>
  );
};

export default ChoicePanel;
