
import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface StoryDisplayProps {
  sceneDescription: string; // Even if story is loading, we might have old description
  imageUrl?: string;
  isLoadingImage: boolean;
  isLoadingStory: boolean;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({ imageUrl, isLoadingImage, isLoadingStory }) => {
  return (
    <div className="bg-gray-800 p-1 rounded-lg shadow-xl aspect-video flex flex-col items-center justify-center relative overflow-hidden min-h-[250px]">
      {isLoadingImage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 bg-opacity-75 z-10">
          <LoadingSpinner />
          <p className="mt-2 text-gray-400 text-lg">Conjuring visuals...</p> {/* Increased font size */}
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
            <p className="text-gray-400 text-center p-4 text-lg"> {/* Increased font size */}
              {isLoadingStory ? "Awaiting the story to unfold..." : "No image available or generation failed."}
            </p>
        </div>
      )}
       {/* Show a placeholder or message if story is loading and there's no image yet */}
       {!imageUrl && isLoadingStory && (
         <div className="w-full h-full flex items-center justify-center bg-gray-700 rounded-md">
            <p className="text-gray-400 text-center p-4 text-lg">Loading scene details...</p> {/* Increased font size */}
        </div>
      )}
    </div>
  );
};

export default StoryDisplay;
