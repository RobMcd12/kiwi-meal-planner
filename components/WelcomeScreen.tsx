import React from 'react';
import { BookHeart, CalendarPlus, FolderHeart, ArrowRight, ChefHat, Package, Sparkles, Archive, Star, ShoppingCart } from 'lucide-react';

interface WelcomeScreenProps {
  onStartNew: () => void;
  onViewFavorites: () => void;
  onViewSavedPlans?: () => void;
  onGenerateSingleRecipe?: () => void;
  onUseWhatIHave?: () => void;
  onManagePantry?: () => void;
  onViewShoppingList?: () => void;
  hasPantryItems?: boolean;
  hasShoppingListItems?: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onStartNew,
  onViewFavorites,
  onViewSavedPlans,
  onGenerateSingleRecipe,
  onUseWhatIHave,
  onManagePantry,
  onViewShoppingList,
  hasPantryItems = false,
  hasShoppingListItems = false
}) => {
  const foodImages = [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  ];

  return (
    <div className="animate-fadeIn">
      {/* Hero Section */}
      <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
        <div className="space-y-6">
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

      {/* Featured: Use What I Have */}
      {onUseWhatIHave && (
        <div className="w-full bg-gradient-to-r from-blue-50 to-cyan-50 p-5 rounded-2xl shadow-sm border border-blue-200 mb-6">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package className="text-blue-600" size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-slate-800">Use What I Have</h3>
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                  <Sparkles size={10} />
                  Smart
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-2">
                Create meals prioritizing ingredients from your pantry, fridge, and freezer - minimizing shopping and reducing waste.
              </p>
              {hasPantryItems ? (
                <button
                  onClick={onUseWhatIHave}
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:gap-2 transition-all"
                >
                  Start cooking <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={onManagePantry}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Package size={16} />
                  Add Items to Pantry
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Create New Plan */}
        <button
          onClick={onStartNew}
          className="group bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition-all text-left"
        >
          <div className="bg-emerald-100 w-11 h-11 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <CalendarPlus className="text-emerald-600" size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Create Meal Plan</h3>
          <p className="text-sm text-slate-500 mb-3">
            Generate a weekly meal plan with shopping list.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 group-hover:gap-2 transition-all">
            Get started <ArrowRight size={14} />
          </span>
        </button>

        {/* Generate Single Recipe */}
        <button
          onClick={onGenerateSingleRecipe}
          className="group bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-amber-200 transition-all text-left"
        >
          <div className="bg-amber-100 w-11 h-11 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <ChefHat className="text-amber-600" size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Single Recipe</h3>
          <p className="text-sm text-slate-500 mb-3">
            Generate one recipe based on what you're craving.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 group-hover:gap-2 transition-all">
            Create recipe <ArrowRight size={14} />
          </span>
        </button>

        {/* My Cookbook */}
        <button
          onClick={onViewFavorites}
          className="group bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-rose-200 transition-all text-left"
        >
          <div className="bg-rose-100 w-11 h-11 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <BookHeart className="text-rose-600" size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">My Cookbook</h3>
          <p className="text-sm text-slate-500 mb-3">
            Browse saved recipes and discover favorites.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 group-hover:gap-2 transition-all">
            View recipes <ArrowRight size={14} />
          </span>
        </button>

        {/* Saved Plans */}
        <button
          onClick={onViewSavedPlans || onViewFavorites}
          className="group bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition-all text-left"
        >
          <div className="bg-indigo-100 w-11 h-11 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <FolderHeart className="text-indigo-600" size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Saved Plans</h3>
          <p className="text-sm text-slate-500 mb-3">
            Access meal plans with shopping lists.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 group-hover:gap-2 transition-all">
            View plans <ArrowRight size={14} />
          </span>
        </button>
      </div>

      {/* Shopping List Card */}
      {onViewShoppingList && (
        <div className="mb-6">
          <button
            onClick={onViewShoppingList}
            className={`w-full group p-5 rounded-2xl shadow-sm border transition-all text-left ${
              hasShoppingListItems
                ? 'bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200 hover:shadow-md hover:border-teal-300'
                : 'bg-white border-slate-100 hover:shadow-md hover:border-teal-200'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform ${
                hasShoppingListItems ? 'bg-teal-100' : 'bg-slate-100'
              }`}>
                <ShoppingCart className={hasShoppingListItems ? 'text-teal-600' : 'text-slate-500'} size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-slate-800">Shopping List</h3>
                  {hasShoppingListItems && (
                    <span className="inline-flex items-center gap-1 bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-xs font-medium">
                      Items to buy
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-2">
                  Combine ingredients from meal plans and recipes with staples that need restocking.
                </p>
                <span className={`inline-flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all ${
                  hasShoppingListItems ? 'text-teal-600' : 'text-slate-600'
                }`}>
                  {hasShoppingListItems ? 'View list' : 'Build your list'} <ArrowRight size={14} />
                </span>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Manage Pantry & Staples Section */}
      {onManagePantry && (
        <div className="mt-6">
          <button
            onClick={onManagePantry}
            className="w-full group bg-gradient-to-r from-emerald-50 to-teal-50 p-5 rounded-2xl shadow-sm border border-emerald-200 hover:shadow-md hover:border-emerald-300 transition-all text-left"
          >
            <div className="flex items-start gap-4">
              <div className="bg-emerald-100 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Archive className="text-emerald-600" size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-slate-800">Manage Pantry & Staples</h3>
                  <Star size={14} className="text-amber-500" fill="currentColor" />
                </div>
                <p className="text-sm text-slate-600 mb-2">
                  Keep track of what you have on hand. Add items, set quantities, and organize into categories. We'll exclude these from your shopping lists.
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 group-hover:gap-2 transition-all">
                  Open pantry <ArrowRight size={14} />
                </span>
              </div>
            </div>
          </button>
        </div>
      )}

    </div>
  );
};

export default WelcomeScreen;
