import React, { useState } from 'react';
import {
  X, ChefHat, Calendar, ShoppingCart, Heart, Upload, Search,
  Tag, Globe, Lock, Settings, Image, Link, FileText, FileType,
  Sparkles, Bell, MessageSquare, User, ChevronRight, ChevronDown,
  Star, ImagePlus, Edit2
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const HelpSection: React.FC<HelpSectionProps> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-emerald-600">{icon}</span>
          <span className="font-medium text-slate-800">{title}</span>
        </div>
        {isOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
      </button>
      {isOpen && (
        <div className="p-4 bg-white text-sm text-slate-600 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
};

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg text-white">
              <ChefHat size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Kiwi Meal Planner Guide</h2>
              <p className="text-sm text-slate-500">Everything you need to know</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Getting Started */}
          <HelpSection title="Getting Started" icon={<Sparkles size={20} />} defaultOpen={true}>
            <p>
              <strong>Kiwi Meal Planner</strong> uses AI to generate personalized weekly meal plans based on your preferences, dietary restrictions, and what you have in your pantry.
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li><strong>Sign in</strong> with Google or email to save your data across devices</li>
              <li><strong>Configure your plan</strong> - choose number of days, people, and which meals to include</li>
              <li><strong>Add pantry items</strong> - tell us what ingredients you already have</li>
              <li><strong>Set preferences</strong> - dietary restrictions, likes, and dislikes</li>
              <li><strong>Generate!</strong> - AI creates a custom meal plan with shopping list</li>
            </ol>
          </HelpSection>

          {/* Meal Plan Generation */}
          <HelpSection title="Generating Meal Plans" icon={<Calendar size={20} />}>
            <p>When you click "Generate Meal Plan", the AI considers:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Your dietary restrictions and preferences</li>
              <li>Ingredients you already have in your pantry</li>
              <li>Number of servings needed</li>
              <li>Your preferred measurement system (metric/imperial)</li>
            </ul>
            <p className="mt-3">
              <strong>Tip:</strong> Be specific in your preferences! Instead of "healthy food", try "high protein, low carb meals with vegetables".
            </p>
          </HelpSection>

          {/* My Cookbook */}
          <HelpSection title="My Cookbook" icon={<Heart size={20} />}>
            <p>Your cookbook stores all your favorite recipes. It has three tabs:</p>
            <div className="space-y-3 mt-2">
              <div className="flex items-start gap-2">
                <Sparkles size={16} className="text-emerald-600 mt-0.5" />
                <div>
                  <strong>AI Generated</strong> - Recipes from your meal plans that you've favorited by rating them highly
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Upload size={16} className="text-purple-600 mt-0.5" />
                <div>
                  <strong>My Uploads</strong> - Recipes you've uploaded from URLs, images, PDFs, or text
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Globe size={16} className="text-blue-600 mt-0.5" />
                <div>
                  <strong>Public Recipes</strong> - Recipes shared by other users
                </div>
              </div>
            </div>
          </HelpSection>

          {/* Uploading Recipes */}
          <HelpSection title="Uploading Recipes" icon={<Upload size={20} />}>
            <p>Add your own recipes to the cookbook using four methods:</p>
            <div className="space-y-3 mt-2">
              <div className="flex items-start gap-2">
                <Link size={16} className="text-slate-600 mt-0.5" />
                <div>
                  <strong>URL</strong> - Paste a link to any recipe website. AI extracts just the recipe, ignoring ads and navigation.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Image size={16} className="text-slate-600 mt-0.5" />
                <div>
                  <strong>Image</strong> - Upload a photo of a recipe card, cookbook page, or screenshot. AI reads and extracts the recipe.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileType size={16} className="text-slate-600 mt-0.5" />
                <div>
                  <strong>PDF</strong> - Upload PDF recipe files. AI processes and extracts recipe details.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText size={16} className="text-slate-600 mt-0.5" />
                <div>
                  <strong>Text</strong> - Paste recipe text directly. AI formats it into a structured recipe.
                </div>
              </div>
            </div>
            <p className="mt-3 text-slate-500">
              <strong>Background Processing:</strong> Uploads are processed in the background - you can navigate away while AI extracts the recipe.
            </p>
          </HelpSection>

          {/* Recipe Images */}
          <HelpSection title="Recipe Images" icon={<ImagePlus size={20} />}>
            <p>All recipes display AI-generated images to help you visualize each dish.</p>
            <div className="space-y-3 mt-2">
              <div className="flex items-start gap-2">
                <Sparkles size={16} className="text-emerald-600 mt-0.5" />
                <div>
                  <strong>Auto-Generation</strong> - Images are automatically created for recipes without one when you view your cookbook.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Edit2 size={16} className="text-purple-600 mt-0.5" />
                <div>
                  <strong>Edit Images</strong> - Hover over any recipe image and click "Edit" to customize it with AI. Describe changes like "add fresh herbs" or "rustic table setting".
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Image size={16} className="text-blue-600 mt-0.5" />
                <div>
                  <strong>Regenerate</strong> - Click "Regenerate" to create an entirely new image from scratch.
                </div>
              </div>
            </div>
          </HelpSection>

          {/* Tags & Search */}
          <HelpSection title="Tags & Search" icon={<Tag size={20} />}>
            <p>All recipes are automatically tagged by AI for easy organization:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li><strong>Cuisine</strong> - Italian, Asian, Mexican, Indian, etc.</li>
              <li><strong>Dietary</strong> - Vegan, Vegetarian, Gluten-Free, Keto, etc.</li>
              <li><strong>Meal Type</strong> - Breakfast, Lunch, Dinner, Snack, Dessert</li>
              <li><strong>Other</strong> - Quick, Easy, Budget-Friendly, One-Pot, etc.</li>
            </ul>
            <p className="mt-3">
              <strong>Search:</strong> Type 3+ characters to search recipes by name, description, or ingredients. Use tag filters to narrow results.
            </p>
            <p className="mt-2">
              <strong>Editing Tags:</strong> You can edit tags on your uploaded recipes. Admins can edit tags on any recipe.
            </p>
          </HelpSection>

          {/* Sharing Recipes */}
          <HelpSection title="Sharing Recipes" icon={<Globe size={20} />}>
            <p>Share your uploaded recipes with the community:</p>
            <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
              <li>Open any recipe from "My Uploads"</li>
              <li>Click the <Lock size={12} className="inline" /> <strong>Private</strong> button to toggle to <Globe size={12} className="inline" /> <strong>Public</strong></li>
              <li>Public recipes appear in the "Public Recipes" tab for all users</li>
            </ol>
            <p className="mt-3 text-slate-500">
              Only your uploaded recipes can be shared. AI-generated recipes remain private.
            </p>
          </HelpSection>

          {/* Notes & Comments */}
          <HelpSection title="Notes & Comments" icon={<MessageSquare size={20} />}>
            <p>Add personal notes and interact with the community:</p>
            <div className="space-y-3 mt-2">
              <div className="flex items-start gap-2">
                <Lock size={16} className="text-slate-600 mt-0.5" />
                <div>
                  <strong>Private Notes</strong> - Keep personal notes that only you can see. Perfect for your own tips and modifications.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Globe size={16} className="text-blue-600 mt-0.5" />
                <div>
                  <strong>Shared Notes</strong> - On public recipes, share notes with the community. You can have both private and public notes.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Star size={16} className="text-amber-500 mt-0.5" />
                <div>
                  <strong>Comments & Ratings</strong> - Rate public recipes with 1-5 stars and leave comments. Click the expandable section to view all community feedback.
                </div>
              </div>
            </div>
          </HelpSection>

          {/* Shopping Lists */}
          <HelpSection title="Shopping Lists" icon={<ShoppingCart size={20} />}>
            <p>Generate smart shopping lists from your recipes:</p>
            <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
              <li>Select recipes by clicking the circle on each recipe card</li>
              <li>Click "Create List" button in the header</li>
              <li>AI generates a consolidated shopping list, accounting for your pantry items</li>
            </ol>
            <p className="mt-3">
              The shopping list is organized by category and adjusts quantities based on the number of servings.
            </p>
          </HelpSection>

          {/* Settings */}
          <HelpSection title="Settings & Preferences" icon={<Settings size={20} />}>
            <p>Access settings from the gear icon or welcome screen:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li><strong>Plan Configuration</strong> - Days, people, which meals to include</li>
              <li><strong>Pantry</strong> - Manage ingredients you have on hand</li>
              <li><strong>Preferences</strong> - Dietary restrictions, likes, dislikes</li>
              <li><strong>Units</strong> - Metric or Imperial measurements</li>
              <li><strong>Temperature</strong> - Celsius or Fahrenheit</li>
            </ul>
            <p className="mt-3">
              Settings are saved automatically and sync across devices when signed in.
            </p>
          </HelpSection>

          {/* Feedback */}
          <HelpSection title="Feedback & Support" icon={<MessageSquare size={20} />}>
            <p>We'd love to hear from you!</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Click <strong>Feedback</strong> in the header to send suggestions or report issues</li>
              <li>When admins respond, you'll see a notification <Bell size={12} className="inline" /> badge</li>
              <li>Click the bell to view your feedback history and responses</li>
            </ul>
          </HelpSection>

          {/* PWA */}
          <HelpSection title="Install as App" icon={<ChefHat size={20} />}>
            <p>Kiwi Meal Planner can be installed as an app on your device:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li><strong>Desktop</strong> - Look for the install icon in your browser's address bar</li>
              <li><strong>iOS</strong> - Tap Share → "Add to Home Screen"</li>
              <li><strong>Android</strong> - Tap the menu → "Install app" or "Add to Home Screen"</li>
            </ul>
            <p className="mt-3 text-slate-500">
              The app works offline for viewing saved recipes!
            </p>
          </HelpSection>

          {/* Version Info */}
          <div className="text-center text-xs text-slate-400 pt-4 border-t border-slate-100">
            <p>Kiwi Meal Planner v1.0.6</p>
            <p className="mt-1">Powered by Google Gemini AI</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
