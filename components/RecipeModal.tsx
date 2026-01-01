import React from 'react';
import { Meal } from '../types';
import { X, Clock, ChefHat, Image as ImageIcon, Loader2 } from 'lucide-react';

interface RecipeModalProps {
  meal: Meal;
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  isImageLoading: boolean;
}

const RecipeModal: React.FC<RecipeModalProps> = ({ meal, isOpen, onClose, imageUrl, isImageLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className="relative w-[90%] md:w-[80%] max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fadeIn">
        
        {/* Header / Image Area */}
        <div className="relative h-64 bg-slate-100 flex-shrink-0">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={meal.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              {isImageLoading ? (
                <>
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-2" />
                  <p className="text-sm font-medium text-slate-500">Chefs are plating your dish...</p>
                </>
              ) : (
                <>
                   <ImageIcon size={48} className="opacity-20" />
                   <p className="text-sm mt-2">No image available</p>
                </>
              )}
            </div>
          )}
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-20">
            <h2 className="text-3xl font-bold text-white shadow-sm">{meal.name}</h2>
            <p className="text-slate-200 text-sm mt-1 line-clamp-1">{meal.description}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Ingredients */}
            <div>
              <div className="flex items-center gap-2 mb-4 text-emerald-700 font-bold border-b border-emerald-100 pb-2">
                 <ChefHat size={20} />
                 <h3>Ingredients</h3>
              </div>
              <ul className="space-y-2">
                {meal.ingredients.map((ing, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                    <span className="leading-relaxed">{ing}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions */}
            <div>
              <div className="flex items-center gap-2 mb-4 text-indigo-700 font-bold border-b border-indigo-100 pb-2">
                 <Clock size={20} />
                 <h3>Instructions</h3>
              </div>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap space-y-4">
                {meal.instructions}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default RecipeModal;
