

import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface StoryDisplayProps {
  imageUrl?: string;
  isLoadingImage: boolean;
  isLoadingStory: boolean;
  imageGenerationFeatureEnabled: boolean;
  imageGenerationPermanentlyDisabled: boolean; 
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ 
    imageUrl, 
    isLoadingImage, 
    isLoadingStory, 
    imageGenerationFeatureEnabled, 
    imageGenerationPermanentlyDisabled 
}) => {
  
  if (imageGenerationPermanentlyDisabled) {
    return (
      <div className="bg-gray-700 p-1 rounded-lg shadow-md aspect-video flex flex-col items-center justify-center relative overflow-hidden min-h-[100px]">
        <p className="text-yellow-300 text-center p-2 text-sm italic">
          Image generation disabled due to usage limits. The adventure continues in your mind's eye!
        </p>
      </div>
    );
  }

  if (!imageGenerationFeatureEnabled) { // Disabled by env var, not quota
    return (
      <div className="bg-gray-700 p-1 rounded-lg shadow-md aspect-video flex flex-col items-center justify-center relative overflow-hidden min-h-[100px]">
        <p className="text-gray-500 text-center p-2 text-sm italic">
          Visuals are disabled by configuration.
        </p>
      </div>
    );
  }

  // Image generation is enabled (not by env var, not by quota), proceed with normal rendering logic
  return (
    <div className="bg-gray-800 p-1 rounded-lg shadow-xl aspect-video flex flex-col items-center justify-center relative overflow-hidden min-h-[250px]">
      {isLoadingImage && ( 
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 bg-opacity-75 z-10">
          <LoadingSpinner />
          <p className="mt-2 text-gray-400 text-lg">Conjuring visuals...</p>
        </div>
      )}
      {imageUrl && !isLoadingImage && ( 
        <img 
          src={imageUrl} 
          alt="Scene visual" 
          className="w-full h-full object-cover rounded-md"
        />
      )}
      {!imageUrl && !isLoadingImage && (
         <div className="w-full h-full flex items-center justify-center bg-gray-700 rounded-md">
            <p className="text-gray-400 text-center p-4 text-lg">
              {isLoadingStory ? "Awaiting the story to unfold..." : "No image available or generation failed."}
            </p>
        </div>
      )}
    </div>
  );
};

export default StoryDisplay;