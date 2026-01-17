import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, ChevronDown, ChevronUp, Sparkles, X, Settings, Apple, CalendarPlus, BookHeart } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
  isComplete: boolean;
}

interface OnboardingChecklistProps {
  hasPreferences: boolean;
  hasPantryItems: boolean;
  hasGeneratedPlan: boolean;
  hasSavedRecipe: boolean;
  onSetPreferences: () => void;
  onManagePantry: () => void;
  onCreatePlan: () => void;
  onViewCookbook: () => void;
}

const STORAGE_KEY = 'kiwi_onboarding_dismissed';

const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  hasPreferences,
  hasPantryItems,
  hasGeneratedPlan,
  hasSavedRecipe,
  onSetPreferences,
  onManagePantry,
  onCreatePlan,
  onViewCookbook,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if user dismissed the checklist
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const steps: OnboardingStep[] = [
    {
      id: 'preferences',
      title: 'Set your preferences',
      description: 'Tell us about your dietary needs, likes, and dislikes',
      icon: <Settings size={18} />,
      action: onSetPreferences,
      actionLabel: 'Set Preferences',
      isComplete: hasPreferences,
    },
    {
      id: 'pantry',
      title: 'Add pantry items',
      description: 'Add ingredients you have on hand for smarter meal plans',
      icon: <Apple size={18} />,
      action: onManagePantry,
      actionLabel: 'Manage Pantry',
      isComplete: hasPantryItems,
    },
    {
      id: 'plan',
      title: 'Generate your first meal plan',
      description: 'Create a personalized meal plan with AI',
      icon: <CalendarPlus size={18} />,
      action: onCreatePlan,
      actionLabel: 'Create Plan',
      isComplete: hasGeneratedPlan,
    },
    {
      id: 'recipe',
      title: 'Save a recipe',
      description: 'Build your cookbook by saving recipes you love',
      icon: <BookHeart size={18} />,
      action: onViewCookbook,
      actionLabel: 'View Cookbook',
      isComplete: hasSavedRecipe,
    },
  ];

  const completedCount = steps.filter(s => s.isComplete).length;
  const allComplete = completedCount === steps.length;
  const progress = (completedCount / steps.length) * 100;

  // Don't show if dismissed or all complete
  if (isDismissed || allComplete) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsDismissed(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg text-white">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Getting Started</h3>
            <p className="text-sm text-slate-500">
              {completedCount} of {steps.length} steps complete
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>
          <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-100">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                step.isComplete
                  ? 'bg-emerald-50 border border-emerald-100'
                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-100'
              }`}
            >
              <div className={`mt-0.5 ${step.isComplete ? 'text-emerald-600' : 'text-slate-400'}`}>
                {step.isComplete ? (
                  <CheckCircle size={20} />
                ) : (
                  <Circle size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`font-medium ${step.isComplete ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {step.title}
                  </h4>
                  {!step.isComplete && step.action && (
                    <button
                      onClick={step.action}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors whitespace-nowrap min-h-[36px]"
                    >
                      {step.icon}
                      <span className="hidden sm:inline">{step.actionLabel}</span>
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OnboardingChecklist;
