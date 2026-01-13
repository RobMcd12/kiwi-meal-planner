import React, { useState, useEffect } from 'react';
import { ChefHat, Sparkles, ShoppingCart, ArrowRight, Camera, Package, Upload, Apple, Users, SlidersHorizontal, Video, Mic, Crown, Check, Infinity, Timer, Volume2, MessageSquare, AlertTriangle } from 'lucide-react';
import LegalPages from './LegalPages';
import { getSubscriptionConfig, formatPrice } from '../services/subscriptionService';
import type { SubscriptionConfig } from '../types';

type LegalPageType = 'privacy' | 'terms' | 'data' | null;

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onViewFeatures: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin, onViewFeatures }) => {
  const [showLegalPage, setShowLegalPage] = useState<LegalPageType>(null);
  const [subscriptionConfig, setSubscriptionConfig] = useState<SubscriptionConfig | null>(null);

  useEffect(() => {
    getSubscriptionConfig().then(setSubscriptionConfig);
  }, []);

  const foodImages = [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-orange-50">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="bg-emerald-600 p-2 rounded-xl text-white">
              <ChefHat size={24} />
            </div>
            <span className="text-xl font-bold text-slate-800">
              Kiwi<span className="text-emerald-600">MealPlanner</span>
            </span>
          </button>
          <div className="flex items-center gap-6">
            <button
              onClick={onViewFeatures}
              className="hidden md:block text-slate-600 hover:text-emerald-600 font-medium transition-colors"
            >
              Features
            </button>
            <button
              onClick={onLogin}
              className="text-slate-600 hover:text-emerald-600 font-medium transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 leading-tight">
              Plan Your Meals,
              <span className="text-emerald-600"> Simplify Your Life</span>
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed">
              Let AI create personalized weekly meal plans tailored to your taste.
              Generate shopping lists instantly and save hours of planning every week.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onGetStarted}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300"
              >
                Get Started Free
                <ArrowRight size={20} />
              </button>
              <button
                onClick={onLogin}
                className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-8 py-4 rounded-xl font-semibold text-lg transition-all border-2 border-slate-200"
              >
                I have an account
              </button>
            </div>

            <button
              onClick={onViewFeatures}
              className="flex items-center justify-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              View All Features
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Food Image Grid */}
          <div className="relative hidden md:block">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden shadow-xl transform hover:scale-105 transition-transform">
                  <img
                    src={foodImages[0]}
                    alt="Delicious meal"
                    className="w-full h-48 object-cover"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden shadow-xl transform hover:scale-105 transition-transform">
                  <img
                    src={foodImages[1]}
                    alt="Healthy food"
                    className="w-full h-32 object-cover"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="rounded-2xl overflow-hidden shadow-xl transform hover:scale-105 transition-transform">
                  <img
                    src={foodImages[2]}
                    alt="Fresh ingredients"
                    className="w-full h-32 object-cover"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden shadow-xl transform hover:scale-105 transition-transform">
                  <img
                    src={foodImages[3]}
                    alt="Home cooking"
                    className="w-full h-48 object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Floating Card */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl p-4 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <ShoppingCart className="text-emerald-600" size={20} />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">Smart Lists</div>
                  <div className="text-sm text-slate-500">Auto-generated</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">
            Everything you need for meal planning
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pantry Scanning - Featured */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-2xl shadow-sm border border-blue-100 hover:shadow-md transition-shadow md:col-span-2 lg:col-span-2">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Camera className="text-blue-600" size={28} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium mb-2">
                    <Sparkles size={12} />
                    New Feature
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Scan Your Kitchen</h3>
                  <p className="text-slate-600 mb-3">
                    Snap photos, record a video walkthrough, or just talk to the app and tell us what you have. Our AI identifies your ingredients and creates recipes using them first - minimizing waste and shopping trips.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Camera size={14} className="text-blue-500" />
                      Photos
                    </span>
                    <span className="flex items-center gap-1">
                      <Video size={14} className="text-blue-500" />
                      Video
                    </span>
                    <span className="flex items-center gap-1">
                      <Mic size={14} className="text-blue-500" />
                      Voice
                    </span>
                    <span className="flex items-center gap-1">
                      <Package size={14} className="text-blue-500" />
                      Use what you have
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="bg-emerald-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="text-emerald-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">AI-Powered Plans</h3>
              <p className="text-slate-600 text-sm">
                Personalized meal plans based on your preferences and dietary needs.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="bg-orange-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <ShoppingCart className="text-orange-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Smart Shopping</h3>
              <p className="text-slate-600 text-sm">
                Auto-generated lists that exclude what you already have.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="bg-purple-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Package className="text-purple-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Use What I Have</h3>
              <p className="text-slate-600 text-sm">
                Generate recipes that prioritize your existing ingredients.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="bg-red-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Allergy Safe</h3>
              <p className="text-slate-600 text-sm">
                Set dietary restrictions and allergies. AI automatically avoids unsafe ingredients.
              </p>
            </div>

            {/* Voice Cook Mode - Featured */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-2xl shadow-sm border border-orange-100 hover:shadow-md transition-shadow md:col-span-2 lg:col-span-2">
              <div className="flex items-start gap-4">
                <div className="bg-orange-100 w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mic className="text-orange-600" size={28} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium mb-2">
                    <Sparkles size={12} />
                    Hands-Free Cooking
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Voice Cook Mode</h3>
                  <p className="text-slate-600 mb-3">
                    Talk to your recipes while you cook. Ask questions, get step-by-step guidance read aloud, and set named timers - all hands-free with voice commands.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Volume2 size={14} className="text-orange-500" />
                      Read Aloud
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={14} className="text-orange-500" />
                      Ask Questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Timer size={14} className="text-orange-500" />
                      Named Timers
                    </span>
                    <span className="flex items-center gap-1">
                      <Mic size={14} className="text-orange-500" />
                      Voice Control
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-8">
              <button
                onClick={onViewFeatures}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
              >
                View All Features
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Recipe Upload & Nutrition Section */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                <Upload size={16} />
                Your Recipes, Supercharged
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800">
                Upload any recipe, let AI do the rest
              </h2>
              <p className="text-lg text-slate-600">
                Scan a recipe card, paste text from a website, or upload a PDF. Our AI extracts the details and adds powerful features to your personal cookbook.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Users className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">Smart Serving Adjustments</h4>
                    <p className="text-sm text-slate-600">Scale any recipe from 2 to 12 servings with automatically recalculated ingredients.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Apple className="text-green-600" size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">Nutritional Breakdown</h4>
                    <p className="text-sm text-slate-600">Get instant calories, protein, carbs, and fat per serving for any recipe.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-amber-100 p-2 rounded-lg">
                    <SlidersHorizontal className="text-amber-600" size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">AI Recipe Adjustments</h4>
                    <p className="text-sm text-slate-600">Increase protein, reduce carbs, or adapt recipes to your dietary needs.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-8 shadow-lg">
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Your Recipe</span>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Uploaded</span>
                </div>
                <div className="h-32 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg flex items-center justify-center">
                  <ChefHat size={48} className="text-orange-300" />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-orange-600">450</div>
                    <div className="text-xs text-slate-500">kcal</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-red-600">32g</div>
                    <div className="text-xs text-slate-500">protein</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-amber-600">45g</div>
                    <div className="text-xs text-slate-500">carbs</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-yellow-600">18g</div>
                    <div className="text-xs text-slate-500">fat</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                    <Users size={14} /> Adjust Servings
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
                    <SlidersHorizontal size={14} /> Modify
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-6 py-16 bg-white" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Simple, Affordable Pricing
            </h2>
            <p className="text-lg text-slate-600">
              Start free, upgrade when you're ready for Pro features
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
                  <span className="text-slate-700">Basic pantry management</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Scan pantry with photos</span>
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
                  <Mic size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Voice Cook Mode with AI assistant</span>
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
            Ready to simplify your meal planning?
          </h2>
          <p className="text-lg text-emerald-100 mb-8">
            Join Kiwi Meal Planner today and start creating delicious weekly meal plans in minutes.
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-emerald-700 px-10 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg"
          >
            Start Planning Now
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
                <ChefHat size={18} />
              </div>
              <span className="font-semibold text-slate-700">KiwiMealPlanner</span>
            </div>
            <div className="text-sm text-slate-500 text-center md:text-right">
              <p>© {new Date().getFullYear()} Kiwi Meal Planner.</p>
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

export default LandingPage;
