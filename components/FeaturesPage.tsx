import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Sparkles,
  ShoppingCart,
  ArrowLeft,
  Camera,
  Package,
  Upload,
  Apple,
  Users,
  SlidersHorizontal,
  Video,
  Mic,
  Crown,
  Timer,
  Volume2,
  MessageSquare,
  AlertTriangle,
  BookHeart,
  CalendarDays,
  FolderHeart,
  Utensils,
  Settings,
  Globe,
  Smartphone,
  Share2,
  FileText,
  Printer,
  Store,
  GripVertical,
  Star,
  Heart,
  Pencil,
  LayoutGrid,
  Check,
  Infinity,
  ArrowRight,
  Target,
} from 'lucide-react';
import LegalPages from './LegalPages';
import { getSubscriptionConfig, formatPrice } from '../services/subscriptionService';
import type { SubscriptionConfig } from '../types';

type LegalPageType = 'privacy' | 'terms' | 'data' | null;

interface FeaturesPageProps {
  onBack: () => void;
  onGetStarted: () => void;
  onLogin: () => void;
  isAuthenticated?: boolean;
}

interface FeatureCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  details?: string[];
  badge?: string;
  badgeColor?: string;
  isPro?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  iconBg,
  title,
  description,
  details,
  badge,
  badgeColor = 'bg-blue-100 text-blue-700',
  isPro,
}) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex items-start gap-4">
      <div className={`${iconBg} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          {isPro && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 text-xs font-medium rounded-full">
              <Crown size={12} />
              Pro
            </span>
          )}
          {badge && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${badgeColor} text-xs font-medium rounded-full`}>
              <Sparkles size={12} />
              {badge}
            </span>
          )}
        </div>
        <p className="text-slate-600 text-sm mb-2">{description}</p>
        {details && details.length > 0 && (
          <ul className="space-y-1">
            {details.map((detail, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-500">
                <Check size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                {detail}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
);

const FeaturesPage: React.FC<FeaturesPageProps> = ({
  onBack,
  onGetStarted,
  onLogin,
  isAuthenticated,
}) => {
  const [showLegalPage, setShowLegalPage] = useState<LegalPageType>(null);
  const [subscriptionConfig, setSubscriptionConfig] = useState<SubscriptionConfig | null>(null);

  useEffect(() => {
    getSubscriptionConfig().then(setSubscriptionConfig);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-orange-50">
      {/* Header */}
      <header className="px-6 py-4 sticky top-0 bg-white/80 backdrop-blur-sm border-b border-slate-200 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-emerald-600 p-2 rounded-xl text-white">
                <ChefHat size={24} />
              </div>
              <span className="text-xl font-bold text-slate-800">
                Kiwi<span className="text-emerald-600">MealPlanner</span>
              </span>
            </div>
          </div>
          {!isAuthenticated && (
            <button
              onClick={onLogin}
              className="text-slate-600 hover:text-emerald-600 font-medium transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Everything You Need for
            <span className="text-emerald-600"> Effortless Meal Planning</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Discover all the powerful features that make Kiwi Meal Planner your ultimate kitchen companion. From AI-powered meal plans to hands-free cooking assistance.
          </p>
        </div>
      </section>

      {/* AI Meal Planning Section */}
      <section className="px-6 py-12 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Sparkles className="text-emerald-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">AI-Powered Meal Planning</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard
              icon={<CalendarDays className="text-emerald-600" size={24} />}
              iconBg="bg-emerald-100"
              title="Weekly Meal Plans"
              description="Generate complete meal plans for 1-7 days tailored to your household."
              details={[
                'Customizable for 1-12 people',
                'Choose breakfast, lunch, and/or dinner',
                'Respects your dietary preferences',
                'Considers what\'s in your pantry',
              ]}
            />

            <FeatureCard
              icon={<Package className="text-purple-600" size={24} />}
              iconBg="bg-purple-100"
              title="Use What I Have Mode"
              description="Generate recipes that prioritize ingredients you already have to minimize waste and shopping."
              details={[
                'Reduces food waste',
                'Saves money on groceries',
                'AI finds creative combinations',
                'Shorter shopping lists',
              ]}
            />

            <FeatureCard
              icon={<Utensils className="text-amber-600" size={24} />}
              iconBg="bg-amber-100"
              title="Single Recipe Generator"
              description="Need just one recipe? Describe what you're in the mood for and get instant suggestions."
              details={[
                'Natural language requests',
                'Ingredient-based suggestions',
                'Cuisine-specific options',
                'Quick weeknight meals',
              ]}
            />

            <FeatureCard
              icon={<AlertTriangle className="text-red-600" size={24} />}
              iconBg="bg-red-100"
              title="Allergy & Dietary Safety"
              description="Set allergies and dietary restrictions once - AI automatically avoids unsafe ingredients."
              details={[
                'Multiple allergy support',
                'Dietary restrictions (vegan, keto, etc.)',
                'Ingredient exclusions',
                'Never manually check labels again',
              ]}
            />
          </div>
        </div>
      </section>

      {/* Kitchen Scanning Section */}
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Camera className="text-blue-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Kitchen Scanning</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Camera className="text-blue-600" size={24} />}
              iconBg="bg-blue-100"
              title="Photo Scanning"
              description="Snap photos of your fridge, pantry, or countertops. AI identifies all visible ingredients."
              details={[
                'Multi-photo support',
                'Automatic ingredient detection',
                'Add directly to pantry',
              ]}
            />

            <FeatureCard
              icon={<Video className="text-cyan-600" size={24} />}
              iconBg="bg-cyan-100"
              title="Video Walkthrough"
              description="Record a video tour of your kitchen. AI processes the entire walkthrough."
              details={[
                'Pan across shelves',
                'Open fridge and cabinets',
                'Comprehensive inventory',
              ]}
              isPro
            />

            <FeatureCard
              icon={<Mic className="text-violet-600" size={24} />}
              iconBg="bg-violet-100"
              title="Voice Dictation"
              description="Simply talk and list what you have. Perfect for quick updates."
              details={[
                'Natural speech recognition',
                'Live real-time dictation',
                'Audio file upload option',
              ]}
              isPro
            />
          </div>
        </div>
      </section>

      {/* Voice Cook Mode Section */}
      <section className="px-6 py-12 bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Mic className="text-orange-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Voice Cook Mode</h2>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 text-sm font-medium rounded-full">
              <Crown size={14} />
              Pro Feature
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard
              icon={<Volume2 className="text-orange-600" size={24} />}
              iconBg="bg-orange-100"
              title="Read Aloud"
              description="Have recipe steps read aloud while you cook. Keep your hands free and your focus on the food."
              details={[
                'Clear text-to-speech',
                'Step-by-step guidance',
                'Repeat steps as needed',
              ]}
              isPro
            />

            <FeatureCard
              icon={<MessageSquare className="text-rose-600" size={24} />}
              iconBg="bg-rose-100"
              title="Ask Questions"
              description="Stuck on a technique? Ask the AI cooking assistant anything about your recipe."
              details={[
                '"How do I julienne carrots?"',
                '"Can I substitute butter?"',
                'Real-time answers',
              ]}
              isPro
            />

            <FeatureCard
              icon={<Timer className="text-teal-600" size={24} />}
              iconBg="bg-teal-100"
              title="Named Timers"
              description="Set multiple named timers with voice commands. Never lose track of what's cooking."
              details={[
                '"Set a 10-minute pasta timer"',
                'Multiple simultaneous timers',
                'Audio alerts when done',
              ]}
              isPro
            />

            <FeatureCard
              icon={<Mic className="text-indigo-600" size={24} />}
              iconBg="bg-indigo-100"
              title="Voice Control"
              description="Navigate recipes, adjust servings, and control playback entirely hands-free."
              details={[
                '"Next step"',
                '"Go back"',
                '"Double the servings"',
              ]}
              isPro
            />
          </div>
        </div>
      </section>

      {/* Recipe Upload Section */}
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-green-100 p-2 rounded-lg">
              <Upload className="text-green-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Recipe Upload & Import</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Globe className="text-blue-600" size={24} />}
              iconBg="bg-blue-100"
              title="From URL"
              description="Paste any recipe website link. AI extracts the full recipe automatically."
            />

            <FeatureCard
              icon={<Camera className="text-purple-600" size={24} />}
              iconBg="bg-purple-100"
              title="From Image"
              description="Photograph a recipe card, cookbook page, or handwritten notes."
            />

            <FeatureCard
              icon={<FileText className="text-amber-600" size={24} />}
              iconBg="bg-amber-100"
              title="From PDF"
              description="Upload PDF cookbooks or recipe collections. Batch import supported."
            />

            <FeatureCard
              icon={<Pencil className="text-slate-600" size={24} />}
              iconBg="bg-slate-100"
              title="From Text"
              description="Copy and paste recipe text from anywhere - emails, documents, messages."
            />
          </div>
        </div>
      </section>

      {/* My Cookbook Section */}
      <section className="px-6 py-12 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-rose-100 p-2 rounded-lg">
              <BookHeart className="text-rose-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">My Cookbook</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Heart className="text-rose-600" size={24} />}
              iconBg="bg-rose-100"
              title="Save Favorites"
              description="Save any recipe to your personal cookbook for easy access anytime."
              details={[
                'Organize with custom tags',
                'Search your collection',
                'Filter by cuisine, meal type',
              ]}
            />

            <FeatureCard
              icon={<Star className="text-amber-600" size={24} />}
              iconBg="bg-amber-100"
              title="Rate & Review"
              description="Rate recipes and leave personal notes for future reference."
              details={[
                '5-star rating system',
                'Personal cooking notes',
                'Track what you\'ve made',
              ]}
            />

            <FeatureCard
              icon={<Users className="text-purple-600" size={24} />}
              iconBg="bg-purple-100"
              title="Adjust Servings"
              description="Scale any recipe from 2 to 12 servings with automatic ingredient recalculation."
              details={[
                'Instant recalculation',
                'Supports fractions',
                'Metric or imperial units',
              ]}
            />

            <FeatureCard
              icon={<Apple className="text-green-600" size={24} />}
              iconBg="bg-green-100"
              title="Nutritional Info"
              description="View detailed nutritional breakdown for every recipe."
              details={[
                'Calories per serving',
                'Protein, carbs, fat',
                'Works with serving scaling',
              ]}
            />

            <FeatureCard
              icon={<SlidersHorizontal className="text-indigo-600" size={24} />}
              iconBg="bg-indigo-100"
              title="AI Recipe Adjustments"
              description="Let AI modify recipes to fit your dietary goals."
              details={[
                'Increase protein',
                'Reduce carbs',
                'Make it vegetarian',
              ]}
            />

            <FeatureCard
              icon={<Target className="text-teal-600" size={24} />}
              iconBg="bg-teal-100"
              title="Fit My Macros"
              description="Automatically adjust any recipe to match your personal daily macro targets."
              details={[
                'Set custom calorie, protein, carb, fat targets',
                'One-click recipe adjustment',
                'Works with any recipe',
              ]}
              isPro
            />

            <FeatureCard
              icon={<FolderHeart className="text-cyan-600" size={24} />}
              iconBg="bg-cyan-100"
              title="Saved Meal Plans"
              description="Save generated meal plans for quick reuse later."
              details={[
                'Name your plans',
                'Regenerate shopping lists',
                'Perfect for meal prep',
              ]}
            />
          </div>
        </div>
      </section>

      {/* Shopping List Section */}
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-orange-100 p-2 rounded-lg">
              <ShoppingCart className="text-orange-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Smart Shopping Lists</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<ShoppingCart className="text-orange-600" size={24} />}
              iconBg="bg-orange-100"
              title="Auto-Generated Lists"
              description="Shopping lists automatically created from your meal plan or selected recipes."
              details={[
                'Excludes pantry items',
                'Combines duplicate ingredients',
                'Grouped by category',
              ]}
            />

            <FeatureCard
              icon={<Package className="text-emerald-600" size={24} />}
              iconBg="bg-emerald-100"
              title="Pantry Staples"
              description="Mark items as staples and track when they need restocking."
              details={[
                'One-tap restock marking',
                'Automatic list addition',
                'Never run out of basics',
              ]}
            />

            <FeatureCard
              icon={<Store className="text-purple-600" size={24} />}
              iconBg="bg-purple-100"
              title="Supermarket Layouts"
              description="Create custom aisle orderings that match your local store."
              details={[
                'Drag-and-drop ordering',
                'Multiple store layouts',
                'Set a default layout',
              ]}
              badge="New"
            />

            <FeatureCard
              icon={<GripVertical className="text-slate-600" size={24} />}
              iconBg="bg-slate-100"
              title="Multiple Sort Modes"
              description="Sort your list by source, category, or your custom store layout."
              details={[
                'Source view shows recipe origins',
                'Category groups like items',
                'Store layout for efficient shopping',
              ]}
            />

            <FeatureCard
              icon={<Share2 className="text-blue-600" size={24} />}
              iconBg="bg-blue-100"
              title="Export & Share"
              description="Share your shopping list via iOS Reminders, other apps, or messages."
              details={[
                'iOS Reminders integration',
                'Share to any app',
                'Copy as text',
              ]}
            />

            <FeatureCard
              icon={<Printer className="text-rose-600" size={24} />}
              iconBg="bg-rose-100"
              title="Print & PDF"
              description="Print your shopping list or download as a branded PDF."
              details={[
                'Printer-friendly format',
                'PDF with branding',
                'Includes checkboxes',
              ]}
            />
          </div>
        </div>
      </section>

      {/* Settings & Personalization Section */}
      <section className="px-6 py-12 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-slate-100 p-2 rounded-lg">
              <Settings className="text-slate-600" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Settings & Personalization</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Globe className="text-blue-600" size={24} />}
              iconBg="bg-blue-100"
              title="Regional Localization"
              description="Set your country for localized ingredient names and availability."
              details={[
                'US, UK, AU, NZ, CA support',
                'Local ingredient names',
                'Regional alternatives',
              ]}
            />

            <FeatureCard
              icon={<LayoutGrid className="text-amber-600" size={24} />}
              iconBg="bg-amber-100"
              title="Unit System"
              description="Choose between metric (grams, ml) or imperial (oz, cups) measurements."
              details={[
                'Applies to all recipes',
                'Temperature conversion',
                'Consistent throughout app',
              ]}
            />

            <FeatureCard
              icon={<Target className="text-purple-600" size={24} />}
              iconBg="bg-purple-100"
              title="Portion & Macro Targets"
              description="Set default serving sizes and daily macro nutrient goals."
              details={[
                'Daily calorie and macro targets',
                'Protein, carbs, fat goals',
                'Nutrition tracking in recipes',
              ]}
            />

            <FeatureCard
              icon={<Smartphone className="text-slate-600" size={24} />}
              iconBg="bg-slate-100"
              title="Progressive Web App"
              description="Install Kiwi on your phone for a native app-like experience."
              details={[
                'Works offline',
                'Home screen icon',
                'Fast loading',
              ]}
            />

            <FeatureCard
              icon={<Star className="text-emerald-600" size={24} />}
              iconBg="bg-emerald-100"
              title="Likes & Dislikes"
              description="Tell us what you love and hate - AI learns your taste."
              details={[
                'Favorite cuisines',
                'Ingredients you dislike',
                'Cooking style preferences',
              ]}
            />

            <FeatureCard
              icon={<Heart className="text-rose-600" size={24} />}
              iconBg="bg-rose-100"
              title="Dietary Preferences"
              description="Set dietary restrictions that apply to all generated content."
              details={[
                'Vegetarian, vegan, keto',
                'Low sodium, low sugar',
                'Custom restrictions',
              ]}
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-6 py-16" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Simple, Affordable Pricing
            </h2>
            <p className="text-lg text-slate-600">
              Most features are free. Upgrade to Pro for advanced capabilities.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free Tier */}
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Free</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-800">$0</span>
                  <span className="text-slate-500">/forever</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">AI-powered meal plans</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Smart shopping lists</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">
                    {subscriptionConfig?.freeRecipeLimit || 20} saved recipes
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Pantry management</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Photo scanning</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Recipe upload & import</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Supermarket layouts</span>
                </li>
              </ul>

              <button
                onClick={onGetStarted}
                className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold transition-colors"
              >
                Get Started Free
              </button>
            </div>

            {/* Pro Tier */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-8 border-2 border-emerald-400 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-full">
                  <Sparkles size={14} />
                  POPULAR
                </span>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold text-slate-800">Pro</h3>
                  <Crown size={24} className="text-amber-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-emerald-700">
                    {subscriptionConfig ? formatPrice(subscriptionConfig.priceMonthlyCents) : '$9.99'}
                  </span>
                  <span className="text-slate-500">/month</span>
                </div>
                {subscriptionConfig && (
                  <p className="text-sm text-emerald-600 mt-1">
                    Or {formatPrice(subscriptionConfig.priceYearlyCents)}/year (Save {subscriptionConfig.yearlyDiscountPercent}%)
                  </p>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">Everything in Free, plus:</span>
                </li>
                <li className="flex items-start gap-3">
                  <Infinity size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">
                    <span className="font-semibold">Unlimited</span> saved recipes
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Video size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Video pantry scanning</span>
                </li>
                <li className="flex items-start gap-3">
                  <Mic size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Live voice dictation</span>
                </li>
                <li className="flex items-start gap-3">
                  <Upload size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Audio file upload</span>
                </li>
                <li className="flex items-start gap-3">
                  <Volume2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Voice Cook Mode with AI assistant</span>
                </li>
                <li className="flex items-start gap-3">
                  <Target size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Custom macro targets & Fit My Macros</span>
                </li>
              </ul>

              <button
                onClick={onGetStarted}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Crown size={18} />
                Start Free Trial
              </button>
              {subscriptionConfig && (
                <p className="text-center text-sm text-slate-500 mt-3">
                  {subscriptionConfig.trialPeriodDays} days free, cancel anytime
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Meal Planning?
          </h2>
          <p className="text-lg text-emerald-100 mb-8">
            Join thousands of home cooks who've simplified their kitchen routine with Kiwi.
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-emerald-700 px-10 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg"
          >
            Get Started Now
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
                <ChefHat size={18} />
              </div>
              <span className="font-semibold text-slate-700">KiwiMealPlanner</span>
            </div>
            <div className="text-sm text-slate-500 text-center md:text-right">
              <p>&copy; {new Date().getFullYear()} Kiwi Meal Planner.</p>
              <p className="mt-0.5">
                Powered by{' '}
                <a
                  href="https://www.unicloud.co.nz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline"
                >
                  www.unicloud.co.nz
                </a>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
            <button
              onClick={() => setShowLegalPage('privacy')}
              className="hover:text-emerald-600 transition-colors"
            >
              Privacy Policy
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setShowLegalPage('terms')}
              className="hover:text-emerald-600 transition-colors"
            >
              Terms of Service
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setShowLegalPage('data')}
              className="hover:text-emerald-600 transition-colors"
            >
              Data Handling
            </button>
          </div>
        </div>
      </footer>

      {/* Legal Pages Modal */}
      {showLegalPage && (
        <LegalPages page={showLegalPage} onClose={() => setShowLegalPage(null)} />
      )}
    </div>
  );
};

export default FeaturesPage;
