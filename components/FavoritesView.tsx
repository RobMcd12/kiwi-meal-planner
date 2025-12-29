import React, { useState } from 'react';
import { Meal, PantryItem } from '../types';
import { getFavoriteMeals, removeFavoriteMeal } from '../services/storageService';
import { Trash2, Heart, ShoppingCart, ArrowLeft } from 'lucide-react';
import { generateShoppingListFromFavorites } from '../services/geminiService';

interface FavoritesViewProps {
  onBack: () => void;
  onGenerateList: (meals: Meal[]) => void;
  isLoading: boolean;
}

const FavoritesView: React.FC<FavoritesViewProps> = ({ onBack, onGenerateList, isLoading }) => {
  const [favorites, setFavorites] = useState<Meal[]>(getFavoriteMeals());
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);

  const handleDelete = (name: string) => {
    removeFavoriteMeal(name);
    setFavorites(getFavoriteMeals());
    setSelectedMeals(prev => prev.filter(n => n !== name));
  };

  const toggleSelect = (name: string) => {
    if (selectedMeals.includes(name)) {
      setSelectedMeals(prev => prev.filter(n => n !== name));
    } else {
      setSelectedMeals(prev => [...prev, name]);
    }
  };

  const handleGenerate = () => {
    const mealsToProcess = favorites.filter(f => selectedMeals.includes(f.name));
    onGenerateList(mealsToProcess);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20 animate-fadeIn">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800">My Cookbook</h2>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
            <Heart size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-lg font-medium text-slate-600">No favorites yet</h3>
            <p className="text-slate-400">Rate meals in your weekly plan to save them here.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mb-24">
          {favorites.map((meal) => (
            <div 
                key={meal.name} 
                className={`border rounded-xl p-4 transition-all cursor-pointer ${
                    selectedMeals.includes(meal.name) 
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm' 
                    : 'border-slate-200 bg-white hover:border-indigo-200'
                }`}
                onClick={() => toggleSelect(meal.name)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedMeals.includes(meal.name) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                        {selectedMeals.includes(meal.name) && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <h3 className="font-bold text-slate-800">{meal.name}</h3>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(meal.name); }}
                  className="text-slate-400 hover:text-red-500 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-sm text-slate-600 line-clamp-2 pl-7">{meal.description}</p>
            </div>
          ))}
        </div>
      )}

      {favorites.length > 0 && (
          <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-20">
            <button
                onClick={handleGenerate}
                disabled={selectedMeals.length === 0 || isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-8 py-4 rounded-full shadow-xl font-bold text-lg flex items-center gap-3 transition-transform active:scale-95"
            >
                {isLoading ? (
                    <>Generating...</>
                ) : (
                    <>
                        <ShoppingCart size={20} />
                        Create List ({selectedMeals.length})
                    </>
                )}
            </button>
          </div>
      )}
    </div>
  );
};

export default FavoritesView;
