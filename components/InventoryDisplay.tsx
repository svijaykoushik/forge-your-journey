
import React, { useState } from 'react';
import { InventoryItem } from '../types';

interface InventoryDisplayProps {
  inventory: InventoryItem[];
  className?: string;
}

const InventoryDisplay: React.FC<InventoryDisplayProps> = ({ inventory, className }) => {
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null); // Stores ID of item for tooltip

  if (!inventory || inventory.length === 0) {
    // This case is handled by App.tsx for desktop to show a styled empty state.
    // For mobile, this direct component usage might still occur if App.tsx logic doesn't cover it.
    // However, App.tsx now provides a specific empty state for desktop sidebar.
    return null; // Or a minimal version if absolutely needed outside App.tsx context
  }

  const defaultClasses = "bg-gray-800 p-4 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar";

  return (
    <div className={className || defaultClasses}>
      <h3 className="font-press-start text-lg mb-3 text-teal-300 border-b border-gray-700 pb-2 sticky top-0 bg-gray-800 z-10">
        Inventory
      </h3>
      <ul className="space-y-2">
        {inventory.map((item) => (
          <li 
            key={item.id} 
            className="text-base text-gray-300 border-b border-gray-700 pb-1 mb-1 relative" /* Increased from text-sm */
            onMouseEnter={() => setTooltipVisible(item.id)}
            onMouseLeave={() => setTooltipVisible(null)}
            onTouchStart={() => setTooltipVisible(tooltipVisible === item.id ? null : item.id)} // Toggle on touch
          >
            <span className="font-medium text-teal-400">{item.name}</span>
            {tooltipVisible === item.id && (
              <div 
                className="absolute left-0 -top-1 transform -translate-y-full w-full sm:w-auto sm:min-w-[200px] p-2 bg-gray-900 border border-teal-500 text-sm text-gray-200 rounded-md shadow-lg z-20 pointer-events-none" /* Increased from text-xs */
                role="tooltip"
              >
                {item.description}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InventoryDisplay;
