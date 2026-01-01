import React, { useState, useMemo } from 'react';
import {
  X, ChefHat, Calendar, ShoppingCart, Heart, Upload, Search,
  Tag, Globe, Lock, Settings, Image, Link, FileText, FileType,
  Sparkles, Bell, MessageSquare, User, ChevronRight, ChevronDown,
  Star, ImagePlus, Edit2, Camera, Apple, Utensils, SlidersHorizontal,
  Beef, Flame, Printer, Mic, Timer, Volume2, Play, Pause, UtensilsCrossed
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpSectionData {
  id: string;
  title: string;
  icon: React.ReactNode;
  keywords: string[];
  content: React.ReactNode;
}

interface HelpSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  highlight?: boolean;
}

const HelpSection: React.FC<HelpSectionProps> = ({ title, icon, children, isOpen, onToggle, highlight = false }) => {
  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${highlight ? 'border-amber-400 ring-2 ring-amber-200' : 'border-slate-200'}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors text-left ${highlight ? 'bg-amber-50' : 'bg-slate-50'}`}
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
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const sections: HelpSectionData[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Sparkles size={20} />,
      keywords: ['start', 'begin', 'new', 'signup', 'sign in', 'login', 'account', 'first time', 'how to use'],
      content: (
        <>
          <p>
            <strong>Kiwi Meal Planner</strong> uses AI to generate personalized weekly meal plans based on your preferences, dietary restrictions, and what you have in your pantry.
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li><strong>Sign in</strong> with Google or email to save your data across devices</li>
            <li><strong>Configure your plan</strong> - choose number of days, people, and which meals to include</li>
            <li><strong>Add pantry items</strong> - tell us what ingredients you already have</li>
            <li><strong>Set preferences</strong> - dietary restrictions, likes, dislikes, portion sizes</li>
            <li><strong>Generate!</strong> - AI creates a custom meal plan with shopping list</li>
          </ol>
        </>
      )
    },
    {
      id: 'meal-plan',
      title: 'Generating Meal Plans',
      icon: <Calendar size={20} />,
      keywords: ['meal plan', 'weekly', 'generate', 'create', 'ai', 'automatic', 'plan'],
      content: (
        <>
          <p>When you click "Generate Meal Plan", the AI considers:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Your dietary restrictions and preferences</li>
            <li>Ingredients you already have in your pantry</li>
            <li>Number of servings needed</li>
            <li>Your preferred measurement system (metric/imperial)</li>
            <li>Your meat serving size and calorie targets</li>
          </ul>
          <p className="mt-3">
            <strong>Tip:</strong> Be specific in your preferences! Instead of "healthy food", try "high protein, low carb meals with vegetables".
          </p>
        </>
      )
    },
    {
      id: 'single-recipe',
      title: 'Single Recipe Generator',
      icon: <Utensils size={20} />,
      keywords: ['single', 'recipe', 'one', 'generate', 'create', 'quick', 'individual'],
      content: (
        <>
          <p>Generate individual recipes on demand without creating a full meal plan:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
            <li>From the <strong>Home screen</strong>, click "Generate a Recipe"</li>
            <li>Or from <strong>My Cookbook</strong>, click "Generate" in the header</li>
            <li><strong>Describe what you want</strong> - e.g., "A quick weeknight pasta dish"</li>
            <li>Adjust servings and click <strong>Generate Recipe</strong></li>
          </ol>
          <p className="mt-3">
            The AI uses your saved preferences and pantry items automatically. You can save the result to your cookbook, generate an image, view nutrition info, or adjust the recipe.
          </p>
        </>
      )
    },
    {
      id: 'adjust-recipe',
      title: 'Adjusting Recipes',
      icon: <SlidersHorizontal size={20} />,
      keywords: ['adjust', 'modify', 'change', 'servings', 'protein', 'macros', 'calories', 'scale', 'customize', 'nutrition'],
      content: (
        <>
          <p>Modify any recipe to fit your needs with the <strong>Adjust</strong> button:</p>
          <div className="space-y-3 mt-2">
            <div className="flex items-start gap-2">
              <User size={16} className="text-emerald-600 mt-0.5" />
              <div>
                <strong>Servings</strong> - Scale recipes up or down (e.g., 4 servings → 8). Ingredient quantities and cooking times adjust automatically.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Beef size={16} className="text-red-600 mt-0.5" />
              <div>
                <strong>Protein</strong> - Increase or decrease protein content. Optionally set a specific target (e.g., 40g per serving).
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Flame size={16} className="text-orange-600 mt-0.5" />
              <div>
                <strong>Macros</strong> - Set targets for calories, protein, carbs, and fat per serving. AI reformulates the recipe to hit your goals.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles size={16} className="text-purple-600 mt-0.5" />
              <div>
                <strong>Custom</strong> - Tell the AI how to modify the recipe: "Make it spicier", "Substitute chicken for tofu", "Make it lower in sodium", etc.
              </div>
            </div>
          </div>
          <p className="mt-3 text-slate-500">
            Preview changes before applying. Save the adjusted recipe to your cookbook if you like it.
          </p>
        </>
      )
    },
    {
      id: 'portion-settings',
      title: 'Portion & Nutrition Settings',
      icon: <Beef size={20} />,
      keywords: ['portion', 'serving', 'meat', 'protein', 'calorie', 'target', 'settings', 'preferences', 'grams'],
      content: (
        <>
          <p>Customize portion sizes and nutrition targets in your preferences:</p>
          <div className="space-y-3 mt-2">
            <div className="flex items-start gap-2">
              <Beef size={16} className="text-red-500 mt-0.5" />
              <div>
                <strong>Meat per Person</strong> - Set your preferred meat/protein serving size in grams (default: 150-200g). This guides the AI when generating recipes.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Flame size={16} className="text-orange-500 mt-0.5" />
              <div>
                <strong>Calorie Target</strong> - Set your daily calorie goal (e.g., 2000 kcal). The AI distributes this across your meals.
              </div>
            </div>
          </div>
          <p className="mt-3">
            Find these settings in <strong>Preferences</strong> under "Portion & Nutrition".
          </p>
        </>
      )
    },
    {
      id: 'pantry-scanner',
      title: 'AI Pantry Scanner',
      icon: <Camera size={20} />,
      keywords: ['pantry', 'scanner', 'photo', 'camera', 'fridge', 'ingredients', 'scan', 'detect', 'image'],
      content: (
        <>
          <p>Quickly add ingredients by photographing your fridge, freezer, or pantry:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
            <li>Go to <strong>Pantry Settings</strong></li>
            <li>Click the purple <strong>"Scan Pantry with AI"</strong> button</li>
            <li>Take photos or upload images of your pantry/fridge</li>
            <li>Click <strong>Analyze Images</strong></li>
            <li>Review detected items and select which to add</li>
          </ol>
          <p className="mt-3 text-slate-500">
            <strong>Tips:</strong> Take clear, well-lit photos. Multiple images help detect more items. The AI recognizes both packaged products and fresh ingredients.
          </p>
        </>
      )
    },
    {
      id: 'nutrition',
      title: 'Nutritional Information',
      icon: <Apple size={20} />,
      keywords: ['nutrition', 'calories', 'protein', 'carbs', 'fat', 'macros', 'health', 'diet'],
      content: (
        <>
          <p>View AI-calculated nutrition for any recipe:</p>
          <div className="space-y-3 mt-2">
            <div className="flex items-start gap-2">
              <Sparkles size={16} className="text-emerald-600 mt-0.5" />
              <div>
                <strong>Access</strong> - Click the green "Nutrition" button on any recipe
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Apple size={16} className="text-green-600 mt-0.5" />
              <div>
                <strong>Per Serving</strong> - Calories, protein, carbs, fat, fiber, and sugar
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ChefHat size={16} className="text-slate-600 mt-0.5" />
              <div>
                <strong>Health Notes</strong> - AI insights about the nutritional profile
              </div>
            </div>
          </div>
          <p className="mt-3 text-slate-500">
            Nutrition is AI-estimated based on typical ingredient values. Use as a guide, not medical advice.
          </p>
        </>
      )
    },
    {
      id: 'cook-mode',
      title: 'Voice Cook Mode',
      icon: <Mic size={20} />,
      keywords: ['voice', 'cook', 'mode', 'hands-free', 'timer', 'timers', 'speak', 'talk', 'microphone', 'assistant', 'read', 'recipe', 'step'],
      content: (
        <>
          <p>Use voice commands to get hands-free help while cooking:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
            <li>Open any recipe from your cookbook</li>
            <li>Click the <strong>"Cook Mode"</strong> button (microphone icon)</li>
            <li>Grant microphone permission when prompted</li>
            <li>Start talking to get help!</li>
          </ol>
          <div className="space-y-3 mt-4">
            <div className="flex items-start gap-2">
              <Volume2 size={16} className="text-emerald-600 mt-0.5" />
              <div>
                <strong>Read Recipe</strong> - Say "read the recipe", "what's step 3?", "read the ingredients", or "next step" to hear instructions read aloud.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MessageSquare size={16} className="text-blue-600 mt-0.5" />
              <div>
                <strong>Ask Questions</strong> - Ask anything about the recipe: "Can I substitute butter for oil?", "What temperature should the oven be?", "How do I know when it's done?"
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Timer size={16} className="text-orange-600 mt-0.5" />
              <div>
                <strong>Smart Timers</strong> - Set up to 5 timers. The assistant can extract times from the recipe:
                <ul className="list-disc list-inside ml-4 mt-1 text-slate-500">
                  <li>"Start a timer for step 2" - uses time from that step</li>
                  <li>"Set a timer for the lamb" - finds cook time in recipe</li>
                  <li>"Set a 10 minute timer for the pasta"</li>
                  <li>"How much time on the pasta?" / "Stop the sauce timer"</li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Play size={16} className="text-purple-600 mt-0.5" />
              <div>
                <strong>Timer Alerts</strong> - When a timer expires, it flashes red and announces the name repeatedly until you dismiss it. Say "ok", "stop", "done", or click the flashing timer to dismiss. Timer bar shows all active timers with pause/resume controls.
              </div>
            </div>
          </div>
          <p className="mt-3 text-slate-500">
            <strong>Tip:</strong> Enable "Auto-speak responses" to hear answers without looking at your screen. Toggle the microphone on/off as needed.
          </p>
        </>
      )
    },
    {
      id: 'print-export',
      title: 'Print & Export',
      icon: <Printer size={20} />,
      keywords: ['print', 'export', 'pdf', 'download', 'save', 'paper', 'document'],
      content: (
        <>
          <p>Print recipes or export them as PDFs:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
            <li>Open any recipe from your cookbook or generated results</li>
            <li>Click the <strong>"Print"</strong> or <strong>"Print / PDF"</strong> button</li>
            <li>A print-friendly view opens with recipe details and image</li>
            <li>Use your browser's print dialog (Ctrl/Cmd+P) to print or save as PDF</li>
          </ol>
          <p className="mt-3 text-slate-500">
            The print view includes an AI disclaimer and is formatted for A4 paper.
          </p>
        </>
      )
    },
    {
      id: 'cookbook',
      title: 'My Cookbook',
      icon: <Heart size={20} />,
      keywords: ['cookbook', 'favorites', 'saved', 'recipes', 'collection', 'library'],
      content: (
        <>
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
        </>
      )
    },
    {
      id: 'suggest-sides',
      title: 'Suggest Side Dishes',
      icon: <UtensilsCrossed size={20} />,
      keywords: ['sides', 'side dish', 'accompaniment', 'pairing', 'vegetable', 'salad', 'suggest', 'ai'],
      content: (
        <>
          <p>Get AI-powered side dish suggestions for any recipe in your cookbook:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
            <li>Open any recipe from your cookbook</li>
            <li>Click the <strong>"Sides"</strong> button (fork and knife icon)</li>
            <li>Click <strong>"Suggest Side Dishes"</strong> to get 4 AI recommendations</li>
            <li>Review each suggestion - click to expand for ingredients and instructions</li>
            <li>Select the sides you want by clicking the + button</li>
            <li>Click <strong>"Save"</strong> to add them to your recipe</li>
          </ol>
          <div className="space-y-3 mt-4">
            <div className="flex items-start gap-2">
              <Sparkles size={16} className="text-amber-600 mt-0.5" />
              <div>
                <strong>Smart Pairing</strong> - The AI considers your main dish's flavor profile, cuisine, and cooking style to suggest complementary sides.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ShoppingCart size={16} className="text-indigo-600 mt-0.5" />
              <div>
                <strong>Shopping Integration</strong> - When you generate a shopping list, ingredients from your saved sides are automatically included.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Edit2 size={16} className="text-purple-600 mt-0.5" />
              <div>
                <strong>Edit Anytime</strong> - Return to the Sides modal to add, remove, or get new suggestions.
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      id: 'upload',
      title: 'Uploading Recipes',
      icon: <Upload size={20} />,
      keywords: ['upload', 'import', 'add', 'url', 'website', 'image', 'pdf', 'text', 'paste'],
      content: (
        <>
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
        </>
      )
    },
    {
      id: 'images',
      title: 'Recipe Images',
      icon: <ImagePlus size={20} />,
      keywords: ['image', 'photo', 'picture', 'generate', 'edit', 'regenerate', 'visual'],
      content: (
        <>
          <p>All recipes display AI-generated images to help you visualize each dish.</p>
          <div className="space-y-3 mt-2">
            <div className="flex items-start gap-2">
              <Sparkles size={16} className="text-emerald-600 mt-0.5" />
              <div>
                <strong>Auto-Generation</strong> - Images are automatically created when generating recipes and meal plans.
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
        </>
      )
    },
    {
      id: 'tags-search',
      title: 'Tags & Search',
      icon: <Tag size={20} />,
      keywords: ['tags', 'search', 'filter', 'find', 'organize', 'category', 'cuisine', 'dietary'],
      content: (
        <>
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
        </>
      )
    },
    {
      id: 'sharing',
      title: 'Sharing Recipes',
      icon: <Globe size={20} />,
      keywords: ['share', 'public', 'private', 'community', 'other users'],
      content: (
        <>
          <p>Share your uploaded recipes with the community:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
            <li>Open any recipe from "My Uploads"</li>
            <li>Click the <Lock size={12} className="inline" /> <strong>Private</strong> button to toggle to <Globe size={12} className="inline" /> <strong>Public</strong></li>
            <li>Public recipes appear in the "Public Recipes" tab for all users</li>
          </ol>
          <p className="mt-3 text-slate-500">
            Only your uploaded recipes can be shared. AI-generated recipes remain private.
          </p>
        </>
      )
    },
    {
      id: 'notes',
      title: 'Notes & Comments',
      icon: <MessageSquare size={20} />,
      keywords: ['notes', 'comments', 'rating', 'review', 'feedback', 'community'],
      content: (
        <>
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
        </>
      )
    },
    {
      id: 'shopping',
      title: 'Shopping Lists',
      icon: <ShoppingCart size={20} />,
      keywords: ['shopping', 'list', 'groceries', 'buy', 'ingredients', 'store'],
      content: (
        <>
          <p>Generate smart shopping lists from your recipes:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
            <li>Select recipes by clicking the circle on each recipe card</li>
            <li>Click "Create List" button in the header</li>
            <li>AI generates a consolidated shopping list, accounting for your pantry items</li>
          </ol>
          <p className="mt-3">
            The shopping list is organized by category and adjusts quantities based on the number of servings.
          </p>
        </>
      )
    },
    {
      id: 'settings',
      title: 'Settings & Preferences',
      icon: <Settings size={20} />,
      keywords: ['settings', 'preferences', 'configuration', 'options', 'customize', 'units', 'metric', 'imperial'],
      content: (
        <>
          <p>Access settings from the gear icon or welcome screen:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li><strong>Plan Configuration</strong> - Days, people, which meals to include</li>
            <li><strong>Pantry</strong> - Manage ingredients you have on hand</li>
            <li><strong>Preferences</strong> - Dietary restrictions, likes, dislikes</li>
            <li><strong>Portion & Nutrition</strong> - Meat serving size, calorie targets</li>
            <li><strong>Units</strong> - Metric or Imperial measurements</li>
            <li><strong>Temperature</strong> - Celsius or Fahrenheit</li>
          </ul>
          <p className="mt-3">
            Settings are saved automatically and sync across devices when signed in.
          </p>
        </>
      )
    },
    {
      id: 'feedback',
      title: 'Feedback & Support',
      icon: <MessageSquare size={20} />,
      keywords: ['feedback', 'support', 'help', 'bug', 'issue', 'suggestion', 'contact'],
      content: (
        <>
          <p>We'd love to hear from you!</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li>Click <strong>Feedback</strong> in the header to send suggestions or report issues</li>
            <li>When admins respond, you'll see a notification <Bell size={12} className="inline" /> badge</li>
            <li>Click the bell to view your feedback history and responses</li>
          </ul>
        </>
      )
    },
    {
      id: 'install',
      title: 'Install as App',
      icon: <ChefHat size={20} />,
      keywords: ['install', 'app', 'pwa', 'download', 'home screen', 'mobile', 'offline'],
      content: (
        <>
          <p>Kiwi Meal Planner can be installed as an app on your device:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li><strong>Desktop</strong> - Look for the install icon in your browser's address bar</li>
            <li><strong>iOS</strong> - Tap Share → "Add to Home Screen"</li>
            <li><strong>Android</strong> - Tap the menu → "Install app" or "Add to Home Screen"</li>
          </ul>
          <p className="mt-3 text-slate-500">
            The app works offline for viewing saved recipes!
          </p>
        </>
      )
    }
  ];

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      return sections;
    }
    const query = searchQuery.toLowerCase();
    return sections.filter(section =>
      section.title.toLowerCase().includes(query) ||
      section.keywords.some(keyword => keyword.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  // Check if a section should be highlighted (matches search)
  const isSectionHighlighted = (section: HelpSectionData) => {
    if (!searchQuery.trim() || searchQuery.length < 2) return false;
    const query = searchQuery.toLowerCase();
    return section.title.toLowerCase().includes(query) ||
      section.keywords.some(keyword => keyword.toLowerCase().includes(query));
  };

  // Clear search and close all sections
  const handleClose = () => {
    setSearchQuery('');
    setOpenSections(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
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
            onClick={handleClose}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics... (e.g., nutrition, upload, macros)"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-slate-50 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {searchQuery.length >= 2 && (
            <p className="text-xs text-slate-500 mt-2">
              {filteredSections.length === sections.length
                ? `${sections.length} topics`
                : `${filteredSections.length} of ${sections.length} topics match "${searchQuery}"`}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredSections.length === 0 ? (
            <div className="text-center py-12">
              <Search size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">No topics found</h3>
              <p className="text-slate-400">Try a different search term</p>
            </div>
          ) : (
            filteredSections.map(section => (
              <HelpSection
                key={section.id}
                title={section.title}
                icon={section.icon}
                isOpen={openSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
                highlight={isSectionHighlighted(section)}
              >
                {section.content}
              </HelpSection>
            ))
          )}

          {/* Version Info */}
          <div className="text-center text-xs text-slate-400 pt-4 border-t border-slate-100">
            <p>Kiwi Meal Planner v1.0.8</p>
            <p className="mt-1">Powered by Google Gemini AI</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleClose}
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
