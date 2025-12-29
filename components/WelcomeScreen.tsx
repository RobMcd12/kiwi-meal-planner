import React from 'react';
import { ChefHat, BookHeart, CalendarPlus, Settings } from 'lucide-react';

interface WelcomeScreenProps {
  onStartNew: () => void;
  onViewFavorites: () => void;
  onOpenSettings: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartNew, onViewFavorites, onOpenSettings }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-fadeIn relative">
      <button 
        onClick={onOpenSettings}
        className="absolute top-0 right-4 p-2 text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-2 bg-white rounded-full shadow-sm border border-slate-200"
      >
        <Settings size={20} />
        <span className="text-sm font-medium">Settings</span>
      </button>

      <div className="bg-emerald-100 p-6 rounded-full mb-8">
        <ChefHat size={64} className="text-emerald-600" />
      </div>
      <h1 className="text-4xl md:text-5xl font-bold text-slate-800 text-center mb-4">
        Kiwi Meal Planner
      </h1>
      <p className="text-xl text-slate-500 text-center max-w-2xl mb-12">
        Your smart assistant for weekly meal planning in New Zealand.
        Create shopping lists, save money, and reduce waste.
      </p>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl">
        <button
          onClick={onStartNew}
          className="group relative overflow-hidden bg-white p-8 rounded-2xl shadow-md border-2 border-transparent hover:border-emerald-500 transition-all text-left"
        >
          <div className="bg-emerald-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <CalendarPlus className="text-emerald-600" size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Create New Plan</h3>
          <p className="text-slate-500">
            Generate a fresh meal plan based on your current cravings and pantry items.
          </p>
        </button>

        <button
          onClick={onViewFavorites}
          className="group relative overflow-hidden bg-white p-8 rounded-2xl shadow-md border-2 border-transparent hover:border-rose-500 transition-all text-left"
        >
          <div className="bg-rose-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <BookHeart className="text-rose-600" size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">My Cookbook</h3>
          <p className="text-slate-500">
            View your top-rated meals and create a shopping list from your favorites.
          </p>
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
