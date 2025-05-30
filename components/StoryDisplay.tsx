
import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface StoryDisplayProps {
  imageUrl?: string;
  isLoadingImage: boolean;
  isLoadingStory: boolean;
  imageGenerationFeatureEnabled: boolean;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ imageUrl, isLoadingImage, isLoadingStory, imageGenerationFeatureEnabled }) => {
  if (!imageGenerationFeatureEnabled) {
    return (
      <div className="bg-gray-700 p-1 rounded-lg shadow-md aspect-video flex flex-col items-center justify-center relative overflow-hidden min-h-[100px]"> {/* Reduced height */}
        <p className="text-gray-500 text-center p-2 text-sm italic"> {/* Simpler styling */}
          Visuals are disabled.
        </p>
      </div>
    );
  }

  // Image generation is enabled, proceed with normal rendering logic
  return (
    <div className="bg-gray-800 p-1 rounded-lg shadow-xl aspect-video flex flex-col items-center justify-center relative overflow-hidden min-h-[250px]">
      {isLoadingImage && ( // This isLoadingImage is true only if feature enabled and image is actively loading
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 bg-opacity-75 z-10">
          <LoadingSpinner />
          <p className="mt-2 text-gray-400 text-lg">Conjuring visuals...</p>
        </div>
      )}
      {imageUrl && !isLoadingImage && ( // Display image if URL exists and we're not trying to load a new one
        <img 
          src={imageUrl} 
          alt="Scene visual" 
          className="w-full h-full object-cover rounded-md"
        />
      )}
      {/* Placeholder for when no image is available AND not currently loading one (e.g., failed, no prompt) */}
      {!imageUrl && !isLoadingImage && (
         <div className="w-full h-full flex items-center justify-center bg-gray-700 rounded-md">
            <p className="text-gray-400 text-center p-4 text-lg">
              {isLoadingStory ? "Awaiting the story to unfold..." : "No image available or generation failed."}
            </p>
        </div>
      )}
      {/* The above placeholder covers the isLoadingStory case as well, so no need for the separate !imageUrl && isLoadingStory block from before. */}
    </div>
  );
};

export default StoryDisplay;
