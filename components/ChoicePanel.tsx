
import React from 'react';
import { StorySegment, Choice } from '../types';
import ChoiceButton from './ChoiceButton';
import LoadingSpinner from './LoadingSpinner';

interface ChoicePanelProps {
  currentSegment: StorySegment | null;
  isLoadingStory: boolean;
  isLoading: boolean; // Overall loading state for disabling buttons
  isLoadingExamination: boolean;
  handleChoiceSelected: (choice: Choice) => void;
  handleExamineSelected: () => void;
  currentLoadingText: string;
}

const ChoicePanel: React.FC<ChoicePanelProps> = ({
  currentSegment,
  isLoadingStory,
  isLoading,
  isLoadingExamination,
  handleChoiceSelected,
  handleExamineSelected,
  currentLoadingText,
}) => {
  // If actively loading new story content OR examining the current scene, show loader for the whole panel.
  // This takes precedence.
  if (isLoadingStory || isLoadingExamination) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-gray-800 rounded-lg shadow-xl min-h-[200px]">
        <LoadingSpinner />
        <p className="mt-3 text-gray-300">{currentLoadingText || (isLoadingStory ? "The story unfolds..." : "Examining...")}</p>
      </div>
    );
  }

  // If NOT isLoadingStory and NOT isLoadingExamination, proceed to show choices or a fallback.
  // This panel shouldn't typically be rendered if currentSegment is null AND not actively loading.
  if (!currentSegment) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-xl min-h-[200px] flex items-center justify-center">
        <p className="text-gray-400 text-center">Awaiting scenario...</p>
      </div>
    );
  }

  // At this point, !isLoadingStory, !isLoadingExamination and currentSegment is not null.
  // currentSegment.choices should ideally exist.
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-xl">
      <h3 className="font-press-start text-xl mb-3 text-purple-300">Make Your Choice:</h3>
      <div className="grid grid-cols-1 gap-3">
        {currentSegment.choices.map((choice, index) => (
          <ChoiceButton
            key={index}
            choice={choice}
            onSelect={() => handleChoiceSelected(choice)}
            // Disable if ANY general loading is happening (e.g. image)
            // isLoadingExamination will be false here due to the top check,
            // but isLoading composite includes it so buttons get disabled correctly by App.
            disabled={isLoading}
          />
        ))}
        <ChoiceButton
          choice={{ text: "Examine surroundings", outcomePrompt: "", isExamineAction: true }}
          onSelect={handleExamineSelected}
          // Disable if general loading is happening.
          // isLoadingExamination is false here, button disabling is handled by `isLoading` prop
          disabled={isLoading}
          isExamineButton={true}
        />
      </div>
    </div>
  );
};

export default ChoicePanel;