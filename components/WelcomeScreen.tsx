import React from 'react';
import { ChefHat, BookHeart, CalendarPlus, Settings, Sparkles, Clock, Leaf, ShoppingCart, Star, Users } from 'lucide-react';

interface WelcomeScreenProps {
  onStartNew: () => void;
  onViewFavorites: () => void;
  onOpenSettings: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartNew, onViewFavorites, onOpenSettings }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 animate-fadeIn relative">
      {/* Settings Button */}
      <button
        onClick={onOpenSettings}
        className="absolute top-0 right-4 p-2 text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-2 bg-white rounded-full shadow-sm border border-slate-200"
      >
        <Settings size={20} />
        <span className="text-sm font-medium">Settings</span>
      </button>

      {/* Hero Section with Animated Icon */}
      <div className="relative mb-8">
        <div className="absolute -inset-4 bg-gradient-to-r from-emerald-400 via-teal-400 to-green-400 rounded-full opacity-20 blur-xl animate-pulse" />
        <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-full shadow-xl">
          <ChefHat size={64} className="text-white" />
        </div>
        <div className="absolute -top-1 -right-1 bg-amber-400 p-1.5 rounded-full shadow-md">
          <Sparkles size={16} className="text-white" />
        </div>
      </div>

      {/* Main Title */}
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-3">
        <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Kiwi Meal Planner
        </span>
      </h1>
      <p className="text-lg text-slate-500 text-center max-w-xl mb-8">
        AI-powered weekly meal planning for New Zealand families.
        Save time, reduce waste, and eat better.
      </p>

      {/* Feature Pills */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
          <Sparkles size={14} />
          AI Generated
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
          <Clock size={14} />
          Quick Plans
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
          <Leaf size={14} />
          NZ Local
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
          <ShoppingCart size={14} />
          Smart Lists
        </div>
      </div>

      {/* Main Action Cards */}
      <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl mb-10">
        {/* Create New Plan Card */}
        <button
          onClick={onStartNew}
          className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all text-left"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-32 h-32 border-4 border-white rounded-full" />
            <div className="absolute -bottom-8 -left-8 w-48 h-48 border-4 border-white rounded-full" />
          </div>

          <div className="relative z-10">
            <div className="bg-white/20 backdrop-blur-sm w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CalendarPlus className="text-white" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Create New Plan</h3>
            <p className="text-emerald-100 mb-4">
              Generate a personalized weekly meal plan based on your preferences and pantry items.
            </p>
            <div className="flex items-center gap-4 text-sm text-emerald-100">
              <span className="flex items-center gap-1">
                <Users size={14} />
                1-10 people
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                1-7 days
              </span>
            </div>
          </div>

          {/* Hover Arrow */}
          <div className="absolute bottom-6 right-6 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-xl">→</span>
          </div>
        </button>

        {/* Cookbook Card */}
        <button
          onClick={onViewFavorites}
          className="group relative overflow-hidden bg-gradient-to-br from-rose-500 to-pink-600 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all text-left"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-32 h-32 border-4 border-white rounded-full" />
            <div className="absolute -bottom-8 -left-8 w-48 h-48 border-4 border-white rounded-full" />
          </div>

          <div className="relative z-10">
            <div className="bg-white/20 backdrop-blur-sm w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BookHeart className="text-white" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">My Cookbook</h3>
            <p className="text-rose-100 mb-4">
              Browse saved recipes, upload your own, and discover community favorites.
            </p>
            <div className="flex items-center gap-4 text-sm text-rose-100">
              <span className="flex items-center gap-1">
                <Star size={14} />
                Rate recipes
              </span>
              <span className="flex items-center gap-1">
                <ShoppingCart size={14} />
                Quick lists
              </span>
            </div>
          </div>

          {/* Hover Arrow */}
          <div className="absolute bottom-6 right-6 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-xl">→</span>
          </div>
        </button>
      </div>

      {/* Food Illustration Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 w-full max-w-3xl">
        {[
          { emoji: '🥗', label: 'Salads', color: 'bg-green-50' },
          { emoji: '🍝', label: 'Pasta', color: 'bg-amber-50' },
          { emoji: '🍛', label: 'Curry', color: 'bg-orange-50' },
          { emoji: '🥘', label: 'Stews', color: 'bg-red-50' },
          { emoji: '🍲', label: 'Soups', color: 'bg-yellow-50' },
          { emoji: '🥩', label: 'Mains', color: 'bg-rose-50' },
        ].map((item) => (
          <div
            key={item.label}
            className={`${item.color} rounded-xl p-3 text-center hover:scale-105 transition-transform cursor-default`}
          >
            <span className="text-2xl md:text-3xl">{item.emoji}</span>
            <p className="text-xs font-medium text-slate-600 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Stats/Trust Indicators */}
      <div className="flex flex-wrap justify-center gap-6 mt-10 text-center">
        <div>
          <p className="text-2xl font-bold text-emerald-600">500+</p>
          <p className="text-xs text-slate-500">Recipes Generated</p>
        </div>
        <div className="w-px h-10 bg-slate-200" />
        <div>
          <p className="text-2xl font-bold text-emerald-600">NZ</p>
          <p className="text-xs text-slate-500">Local Ingredients</p>
        </div>
        <div className="w-px h-10 bg-slate-200" />
        <div>
          <p className="text-2xl font-bold text-emerald-600">AI</p>
          <p className="text-xs text-slate-500">Powered by Gemini</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
