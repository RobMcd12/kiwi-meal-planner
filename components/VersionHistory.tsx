import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Sparkles, Tag, Crown, Zap, ShoppingCart, Camera, Apple, Settings, MessageSquare, Heart, Upload, Calendar, Star, Package } from 'lucide-react';
import { version } from '../package.json';

interface VersionHistoryProps {
  onBack: () => void;
}

interface VersionEntry {
  version: string;
  date: string;
  isCurrent?: boolean;
  isPro?: boolean;
  highlights: string[];
  changes: {
    category: 'feature' | 'improvement' | 'fix' | 'pro';
    title: string;
    description: string;
  }[];
}

// Version history data - update this when adding new features
export const VERSION_HISTORY: VersionEntry[] = [
  {
    version: '2.7.0',
    date: 'January 2025',
    isCurrent: true,
    highlights: [
      'Generate sides & dessert with recipes',
      'Regenerate with variations',
      'Full meal PDF export'
    ],
    changes: [
      {
        category: 'feature',
        title: 'Sides & Dessert Generation',
        description: 'Generate complete meals with complementary side dishes and dessert alongside the main dish.'
      },
      {
        category: 'feature',
        title: 'Recipe Tabs',
        description: 'Switch between Main, Sides, and Dessert sections using tabs when viewing generated meals.'
      },
      {
        category: 'feature',
        title: 'Regenerate with Variations',
        description: 'Customize and regenerate recipes with specific variation requests for each component (main, sides, dessert).'
      },
      {
        category: 'feature',
        title: 'Separate Variation Inputs',
        description: 'Specify different preferences for main dish, side dishes, and dessert when regenerating.'
      },
      {
        category: 'feature',
        title: 'Toggle Sides/Dessert',
        description: 'Choose to include or exclude sides and dessert when regenerating recipes.'
      },
      {
        category: 'improvement',
        title: 'Full Meal PDF Export',
        description: 'Print/PDF export now includes all generated sides and desserts with styled sections.'
      }
    ]
  },
  {
    version: '2.6.0',
    date: 'January 2025',
    highlights: [
      'Custom shopping list categories',
      'Smart quantity detection for pantry',
      'Empty pantry/staples buttons'
    ],
    changes: [
      {
        category: 'feature',
        title: 'Custom Shopping Categories',
        description: 'Create your own shopping list categories beyond the 18 defaults. Custom categories appear in purple and can be added to any store layout.'
      },
      {
        category: 'feature',
        title: 'Smart Quantity Detection',
        description: 'AI scanner now estimates remaining quantities for pantry items (e.g., "olive oil (~500ml remaining)", "eggs (6)").'
      },
      {
        category: 'feature',
        title: 'Quantity Editor',
        description: 'Click any pantry item to set or edit its quantity and unit of measurement.'
      },
      {
        category: 'feature',
        title: 'Empty Pantry/Staples',
        description: 'One-click buttons to clear all pantry items or all staples when you need to start fresh.'
      },
      {
        category: 'improvement',
        title: 'App-Styled Confirmations',
        description: 'All confirmation dialogs now use consistent app styling instead of browser defaults.'
      },
      {
        category: 'improvement',
        title: 'Enhanced Pantry Scanning',
        description: 'AI now identifies specific item types (e.g., "balsamic vinegar" instead of just "vinegar").'
      }
    ]
  },
  {
    version: '2.5.0',
    date: 'January 2025',
    highlights: [
      'Recipe categories for cookbook',
      'Category filtering',
      'Improved meal plan flow'
    ],
    changes: [
      {
        category: 'feature',
        title: 'Recipe Categories',
        description: 'Create custom categories to organize your cookbook (e.g., "Weeknight Dinners", "Kid Favorites").'
      },
      {
        category: 'feature',
        title: 'Category Filtering',
        description: 'Filter recipes in your cookbook by your custom categories.'
      },
      {
        category: 'improvement',
        title: 'Improved Meal Plan Flow',
        description: 'Settings, Pantry, and Preferences now shown as a step-by-step flow below navigation.'
      },
      {
        category: 'improvement',
        title: 'UI Improvements',
        description: 'Better navigation and layout consistency throughout the app.'
      }
    ]
  },
  {
    version: '2.3.0',
    date: 'December 2024',
    highlights: [
      'Custom macro targets',
      'Fit My Macros feature',
      'Nutrition comparison'
    ],
    changes: [
      {
        category: 'pro',
        title: 'Custom Macro Targets',
        description: 'Pro users can set personalized daily targets for calories, protein, carbs, fat, fiber, sugar, and sodium.'
      },
      {
        category: 'pro',
        title: 'Fit My Macros',
        description: 'Automatically adjust any recipe to match your saved macro targets with one click.'
      },
      {
        category: 'feature',
        title: 'Nutrition Comparison',
        description: 'See how recipes compare to your daily targets with visual progress bars.'
      },
      {
        category: 'improvement',
        title: 'Preference Sub-tabs',
        description: 'Reorganized preferences into Meal Prefs, Allergies, and Macros tabs.'
      }
    ]
  },
  {
    version: '2.2.0',
    date: 'December 2024',
    highlights: [
      'Master shopping list',
      'Supermarket layouts',
      'Export to PDF/Reminders'
    ],
    changes: [
      {
        category: 'feature',
        title: 'Master Shopping List',
        description: 'Consolidated shopping list from meal plans, recipes, staples, and pantry items.'
      },
      {
        category: 'pro',
        title: 'Supermarket Layouts',
        description: 'Save custom store layouts with drag-and-drop category ordering to match your local store.'
      },
      {
        category: 'feature',
        title: 'Multiple Sort Modes',
        description: 'Sort shopping list by source, category, or store layout.'
      },
      {
        category: 'feature',
        title: 'Export to iOS Reminders',
        description: 'Share your shopping list to the Reminders app for easy checking off while shopping.'
      },
      {
        category: 'feature',
        title: 'Export to PDF',
        description: 'Generate branded PDF shopping lists to print or save.'
      }
    ]
  },
  {
    version: '2.1.0',
    date: 'November 2024',
    highlights: [
      'Shopping list persistence',
      'Checked items sync',
      'Cloud integration'
    ],
    changes: [
      {
        category: 'feature',
        title: 'Shopping List Selections',
        description: 'Your selected meal plans and recipes for shopping lists are now saved and persist across sessions.'
      },
      {
        category: 'feature',
        title: 'Checked Items Sync',
        description: 'Items you check off in your shopping list are remembered across sessions and devices.'
      },
      {
        category: 'improvement',
        title: 'Database Integration',
        description: 'Shopping list selections saved to cloud for cross-device access.'
      }
    ]
  },
  {
    version: '2.0.0',
    date: 'November 2024',
    highlights: [
      'Video pantry scanning',
      'Voice dictation',
      'Audio upload support'
    ],
    changes: [
      {
        category: 'pro',
        title: 'Video Pantry Scanning',
        description: 'Record or upload videos to scan your entire kitchen - walk through fridge, pantry, and freezer.'
      },
      {
        category: 'pro',
        title: 'Voice Dictation',
        description: 'Talk to the app to add pantry items in real-time. Just say what you have!'
      },
      {
        category: 'pro',
        title: 'Audio Upload',
        description: 'Upload pre-recorded audio files for AI transcription of pantry items.'
      },
      {
        category: 'feature',
        title: 'Upload Mode Options',
        description: 'Choose to replace all pantry items or add only new ones when scanning.'
      },
      {
        category: 'feature',
        title: 'Media File Management',
        description: 'View and manage uploaded video/audio with automatic 10-day cleanup.'
      }
    ]
  },
  {
    version: '1.0.9',
    date: 'October 2024',
    highlights: [
      'Pantry staples',
      'Restock tracking',
      'Shopping integration'
    ],
    changes: [
      {
        category: 'feature',
        title: 'Pantry Staples',
        description: 'Mark items as staples - things you always want to keep in stock.'
      },
      {
        category: 'feature',
        title: 'Restock Checkbox System',
        description: 'Check staples that need restocking to add them to your shopping list.'
      },
      {
        category: 'feature',
        title: 'Shopping Completed Button',
        description: 'Clear your restock list with one click after shopping.'
      },
      {
        category: 'improvement',
        title: 'Badge Notifications',
        description: 'See at a glance how many staples need restocking.'
      }
    ]
  },
  {
    version: '1.0.8',
    date: 'October 2024',
    highlights: [
      'Use What I Have mode',
      'Smart pantry integration',
      'Minimal shopping lists'
    ],
    changes: [
      {
        category: 'pro',
        title: 'Use What I Have Mode',
        description: 'AI prioritizes your pantry ingredients to create recipes that minimize shopping.'
      },
      {
        category: 'feature',
        title: 'Smart Mode Toggle',
        description: 'Enable "Use What I Have" in meal plan configuration or single recipe generator.'
      },
      {
        category: 'improvement',
        title: 'Welcome Screen Integration',
        description: 'Featured "Use What I Have" button on welcome screen for quick access.'
      }
    ]
  },
  {
    version: '1.0.7',
    date: 'September 2024',
    highlights: [
      'Voice cook mode',
      'Smart timers',
      'Hands-free cooking'
    ],
    changes: [
      {
        category: 'feature',
        title: 'Voice Cook Mode',
        description: 'Get hands-free help while cooking with voice commands.'
      },
      {
        category: 'feature',
        title: 'Smart Timers',
        description: 'Set up to 5 timers by voice. AI can extract times from recipe steps.'
      },
      {
        category: 'feature',
        title: 'Recipe Read-Aloud',
        description: 'Say "read the recipe" or "what\'s step 3?" to hear instructions.'
      },
      {
        category: 'improvement',
        title: 'Timer Alerts',
        description: 'Visual and audio alerts when timers expire.'
      }
    ]
  },
  {
    version: '1.0.6',
    date: 'September 2024',
    highlights: [
      'Side dish suggestions',
      'AI pairings',
      'Cookbook integration'
    ],
    changes: [
      {
        category: 'feature',
        title: 'Suggest Side Dishes',
        description: 'Get AI-powered side dish recommendations for any recipe.'
      },
      {
        category: 'feature',
        title: 'Smart Pairing',
        description: 'AI considers flavor profiles and cuisine when suggesting sides.'
      },
      {
        category: 'feature',
        title: 'Save Sides to Recipes',
        description: 'Add suggested sides directly to your recipe.'
      }
    ]
  },
  {
    version: '1.0.5',
    date: 'August 2024',
    highlights: [
      'Photo pantry scanning',
      'AI ingredient detection',
      'Quick setup'
    ],
    changes: [
      {
        category: 'pro',
        title: 'AI Pantry Scanner',
        description: 'Take photos of your fridge, freezer, or pantry to automatically detect ingredients.'
      },
      {
        category: 'feature',
        title: 'Category Organization',
        description: 'Scanned items are automatically organized by category.'
      },
      {
        category: 'improvement',
        title: 'Quick Pantry Setup',
        description: 'No more manual typing - just snap and scan!'
      }
    ]
  },
  {
    version: '1.0.4',
    date: 'August 2024',
    highlights: [
      'Recipe adjustments',
      'Serving scaling',
      'Custom modifications'
    ],
    changes: [
      {
        category: 'pro',
        title: 'AI Recipe Adjustments',
        description: 'Modify any recipe with AI - change servings, protein, macros, or make custom changes.'
      },
      {
        category: 'feature',
        title: 'Serving Scaling',
        description: 'Scale recipes up or down with automatic ingredient adjustment.'
      },
      {
        category: 'feature',
        title: 'Custom Modifications',
        description: 'Tell AI how to modify: "make it spicier" or "substitute chicken for tofu".'
      }
    ]
  },
  {
    version: '1.0.3',
    date: 'July 2024',
    highlights: [
      'User feedback system',
      'Admin dashboard',
      'PWA improvements'
    ],
    changes: [
      {
        category: 'feature',
        title: 'Feedback System',
        description: 'Send suggestions or report issues directly from the app.'
      },
      {
        category: 'feature',
        title: 'Admin Dashboard',
        description: 'Admin tools for managing users, content, and settings.'
      },
      {
        category: 'improvement',
        title: 'PWA Improvements',
        description: 'Better offline support and app-like experience.'
      }
    ]
  },
  {
    version: '1.0.2',
    date: 'July 2024',
    highlights: [
      'Recipe images',
      'Image editing',
      'Visual enhancements'
    ],
    changes: [
      {
        category: 'feature',
        title: 'AI Recipe Images',
        description: 'All recipes now display AI-generated images.'
      },
      {
        category: 'feature',
        title: 'Image Editing',
        description: 'Edit recipe images with AI - describe changes like "add fresh herbs".'
      },
      {
        category: 'feature',
        title: 'Regenerate Images',
        description: 'Generate a completely new image for any recipe.'
      }
    ]
  },
  {
    version: '1.0.1',
    date: 'June 2024',
    highlights: [
      'Recipe uploading',
      'URL/image/PDF import',
      'Cookbook building'
    ],
    changes: [
      {
        category: 'pro',
        title: 'Recipe Upload',
        description: 'Add your own recipes from URLs, images, PDFs, or text.'
      },
      {
        category: 'feature',
        title: 'AI Extraction',
        description: 'AI reads and extracts recipes from any source.'
      },
      {
        category: 'feature',
        title: 'Recipe Sharing',
        description: 'Make uploaded recipes public to share with the community.'
      }
    ]
  },
  {
    version: '1.0.0',
    date: 'June 2024',
    highlights: [
      'Initial release',
      'AI meal planning',
      'Personal cookbook'
    ],
    changes: [
      {
        category: 'feature',
        title: 'AI Meal Planning',
        description: 'Generate personalized weekly meal plans based on your preferences.'
      },
      {
        category: 'feature',
        title: 'Personal Cookbook',
        description: 'Save your favorite recipes to your personal cookbook.'
      },
      {
        category: 'feature',
        title: 'Shopping Lists',
        description: 'Automatic shopping list generation from meal plans.'
      },
      {
        category: 'feature',
        title: 'Dietary Preferences',
        description: 'Set dietary restrictions, likes, and dislikes.'
      }
    ]
  }
];

const VersionHistory: React.FC<VersionHistoryProps> = ({ onBack }) => {
  // Default all versions to expanded so users can see all changes
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(
    new Set(VERSION_HISTORY.map(v => v.version))
  );

  const toggleVersion = (ver: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      if (next.has(ver)) {
        next.delete(ver);
      } else {
        next.add(ver);
      }
      return next;
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pro':
        return <Crown size={14} className="text-amber-500" />;
      case 'feature':
        return <Sparkles size={14} className="text-emerald-500" />;
      case 'improvement':
        return <Zap size={14} className="text-blue-500" />;
      case 'fix':
        return <Settings size={14} className="text-slate-500" />;
      default:
        return <Tag size={14} className="text-slate-400" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'pro':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'feature':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'improvement':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'fix':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-br from-emerald-50 via-white to-orange-50 pb-4 -mx-4 px-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft size={24} className="text-slate-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-3 rounded-xl">
                <Sparkles className="text-purple-600" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">What's New</h1>
                <p className="text-slate-500 text-sm">Version history & updates</p>
              </div>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
            v{version}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 space-y-4">
        {VERSION_HISTORY.map((entry) => {
          const isExpanded = expandedVersions.has(entry.version);

          return (
            <div
              key={entry.version}
              className={`bg-white rounded-xl border overflow-hidden transition-all ${
                entry.isCurrent
                  ? 'border-emerald-200 ring-2 ring-emerald-100'
                  : 'border-slate-200'
              }`}
            >
              {/* Version Header */}
              <button
                onClick={() => toggleVersion(entry.version)}
                className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
              >
                <div className={`p-2 rounded-lg ${entry.isCurrent ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  {isExpanded ? (
                    <ChevronDown size={20} className={entry.isCurrent ? 'text-emerald-600' : 'text-slate-500'} />
                  ) : (
                    <ChevronRight size={20} className={entry.isCurrent ? 'text-emerald-600' : 'text-slate-500'} />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">v{entry.version}</span>
                    {entry.isCurrent && (
                      <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded-full">
                        Current
                      </span>
                    )}
                    {entry.isPro && (
                      <Crown size={14} className="text-amber-500" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{entry.date}</p>
                </div>

                <div className="hidden sm:flex flex-wrap gap-1 max-w-[200px]">
                  {entry.highlights.slice(0, 2).map((highlight, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full truncate"
                    >
                      {highlight}
                    </span>
                  ))}
                  {entry.highlights.length > 2 && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">
                      +{entry.highlights.length - 2}
                    </span>
                  )}
                </div>
              </button>

              {/* Version Details */}
              {isExpanded && (
                <div className="border-t border-slate-100 p-4 space-y-3">
                  {/* Highlights */}
                  <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-100">
                    {entry.highlights.map((highlight, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm rounded-full border border-emerald-200"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>

                  {/* Changes */}
                  <div className="space-y-3">
                    {entry.changes.map((change, i) => (
                      <div key={i} className="flex gap-3">
                        <div className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border ${getCategoryBadge(change.category)}`}>
                          {getCategoryIcon(change.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-slate-800">{change.title}</h4>
                            {change.category === 'pro' && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                                PRO
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">{change.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Footer */}
        <div className="text-center py-8 text-slate-400">
          <p className="text-sm">Thank you for using Kiwi Meal Planner!</p>
          <p className="text-xs mt-1">We're constantly working to improve your experience.</p>
        </div>
      </div>
    </div>
  );
};

export default VersionHistory;
