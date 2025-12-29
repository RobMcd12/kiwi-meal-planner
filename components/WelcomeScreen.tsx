import React from 'react';
import { BookHeart, CalendarPlus, Settings, Sparkles, FolderHeart, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onStartNew: () => void;
  onViewFavorites: () => void;
  onOpenSettings: () => void;
  onViewSavedPlans?: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onStartNew,
  onViewFavorites,
  onOpenSettings,
  onViewSavedPlans
}) => {
  const foodImages = [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  ];

  return (
    <div className="animate-fadeIn">
      {/* Settings Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
        >
          <Settings size={18} />
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>

      {/* Hero Section */}
      <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles size={16} />
            AI-Powered Meal Planning
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 leading-tight">
            What would you like to do today?
          </h1>

          <p className="text-slate-600 leading-relaxed">
            Create personalized meal plans, browse your saved recipes, or revisit your favorite meal plans.
          </p>
        </div>

        {/* Food Image Grid - Hidden on mobile */}
        <div className="hidden md:block">
          <div className="grid grid-cols-3 gap-3">
            {foodImages.map((img, idx) => (
              <div
                key={idx}
                className="rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
              >
                <img
                  src={img}
                  alt="Delicious meal"
                  className="w-full h-24 object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Create New Plan */}
        <button
          onClick={onStartNew}
          className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition-all text-left"
        >
          <div className="bg-emerald-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <CalendarPlus className="text-emerald-600" size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Create New Plan</h3>
          <p className="text-sm text-slate-500 mb-4">
            Generate a personalized weekly meal plan based on your preferences.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 group-hover:gap-2 transition-all">
            Get started <ArrowRight size={16} />
          </span>
        </button>

        {/* My Cookbook */}
        <button
          onClick={onViewFavorites}
          className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-rose-200 transition-all text-left"
        >
          <div className="bg-rose-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <BookHeart className="text-rose-600" size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">My Cookbook</h3>
          <p className="text-sm text-slate-500 mb-4">
            Browse saved recipes, upload your own, and discover new favorites.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 group-hover:gap-2 transition-all">
            View recipes <ArrowRight size={16} />
          </span>
        </button>

        {/* Saved Plans */}
        <button
          onClick={onViewSavedPlans || onViewFavorites}
          className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition-all text-left"
        >
          <div className="bg-indigo-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FolderHeart className="text-indigo-600" size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Saved Plans</h3>
          <p className="text-sm text-slate-500 mb-4">
            Access your saved meal plans with shopping lists ready to go.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 group-hover:gap-2 transition-all">
            View plans <ArrowRight size={16} />
          </span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">500+</div>
            <div className="text-sm text-slate-500">Recipes Generated</div>
          </div>
          <div className="hidden md:block w-px h-12 bg-slate-200" />
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">NZ</div>
            <div className="text-sm text-slate-500">Local Ingredients</div>
          </div>
          <div className="hidden md:block w-px h-12 bg-slate-200" />
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">AI</div>
            <div className="text-sm text-slate-500">Powered by Gemini</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
