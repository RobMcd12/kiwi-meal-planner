import React from 'react';
import { CalendarPlus, Sparkles, BookHeart, FolderHeart, Apple, ShoppingCart } from 'lucide-react';
import { AppStep } from '../types';

interface NavBarProps {
  currentStep: AppStep;
  onNavigate: (step: AppStep) => void;
}

const NavBar: React.FC<NavBarProps> = ({ currentStep, onNavigate }) => {
  const navItems = [
    { step: AppStep.CONFIG, label: 'Meal Plan', icon: CalendarPlus, color: 'emerald' },
    { step: AppStep.SINGLE_RECIPE, label: 'Recipe', icon: Sparkles, color: 'amber' },
    { step: AppStep.FAVORITES, label: 'Cookbook', icon: BookHeart, color: 'rose' },
    { step: AppStep.SAVED_PLANS, label: 'Saved Plans', icon: FolderHeart, color: 'indigo' },
    { step: AppStep.SHOPPING_LIST, label: 'Shopping', icon: ShoppingCart, color: 'teal' },
    { step: AppStep.SETTINGS, label: 'Pantry', icon: Apple, color: 'orange' },
  ];

  const getColorClasses = (color: string, isActive: boolean) => {
    if (isActive) {
      switch (color) {
        case 'emerald': return 'bg-emerald-100 text-emerald-700 border-emerald-400';
        case 'amber': return 'bg-amber-100 text-amber-700 border-amber-400';
        case 'rose': return 'bg-rose-100 text-rose-700 border-rose-400';
        case 'indigo': return 'bg-indigo-100 text-indigo-700 border-indigo-400';
        case 'teal': return 'bg-teal-100 text-teal-700 border-teal-400';
        case 'orange': return 'bg-orange-100 text-orange-700 border-orange-400';
        default: return 'bg-slate-100 text-slate-700 border-slate-400';
      }
    }
    // Non-active: white background with colored border matching the icon
    switch (color) {
      case 'emerald': return 'bg-white text-slate-600 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400';
      case 'amber': return 'bg-white text-slate-600 border-amber-300 hover:bg-amber-50 hover:border-amber-400';
      case 'rose': return 'bg-white text-slate-600 border-rose-300 hover:bg-rose-50 hover:border-rose-400';
      case 'indigo': return 'bg-white text-slate-600 border-indigo-300 hover:bg-indigo-50 hover:border-indigo-400';
      case 'teal': return 'bg-white text-slate-600 border-teal-300 hover:bg-teal-50 hover:border-teal-400';
      case 'orange': return 'bg-white text-slate-600 border-orange-300 hover:bg-orange-50 hover:border-orange-400';
      default: return 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:border-slate-400';
    }
  };

  const getIconColor = (color: string, isActive: boolean) => {
    if (isActive) {
      switch (color) {
        case 'emerald': return 'text-emerald-600';
        case 'amber': return 'text-amber-600';
        case 'rose': return 'text-rose-600';
        case 'indigo': return 'text-indigo-600';
        case 'teal': return 'text-teal-600';
        case 'orange': return 'text-orange-600';
        default: return 'text-slate-600';
      }
    }
    return 'text-slate-400';
  };

  // Check if current step matches or is a sub-step
  const isActiveStep = (itemStep: AppStep): boolean => {
    // For Pantry, it's under settings with pantry tab - we'll highlight it when in settings
    if (itemStep === AppStep.SETTINGS && currentStep === AppStep.SETTINGS) {
      return true;
    }
    // For meal plan creation flow
    if (itemStep === AppStep.CONFIG && (currentStep === AppStep.CONFIG || currentStep === AppStep.PANTRY || currentStep === AppStep.PREFERENCES)) {
      return true;
    }
    // For shopping list
    if (itemStep === AppStep.SHOPPING_LIST && currentStep === AppStep.SHOPPING_LIST) {
      return true;
    }
    return currentStep === itemStep;
  };

  return (
    <nav className="hidden md:block bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-[64px] z-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-center gap-2 py-2 overflow-x-auto scrollbar-hide">
          {navItems.map(({ step, label, icon: Icon, color }) => {
            const isActive = isActiveStep(step);
            return (
              <button
                key={step}
                onClick={() => onNavigate(step)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all whitespace-nowrap ${getColorClasses(color, isActive)}`}
              >
                <Icon size={16} className={getIconColor(color, isActive)} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
