import React from 'react';
import { ChefHat, Sparkles, ShoppingCart, Heart, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
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
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-xl text-white">
              <ChefHat size={24} />
            </div>
            <span className="text-xl font-bold text-slate-800">
              Kiwi<span className="text-emerald-600">MealPlanner</span>
            </span>
          </div>
          <button
            onClick={onLogin}
            className="text-slate-600 hover:text-emerald-600 font-medium transition-colors"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles size={16} />
              AI-Powered Meal Planning
            </div>

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

            {/* Stats */}
            <div className="flex gap-8 pt-4">
              <div>
                <div className="text-2xl font-bold text-slate-800">500+</div>
                <div className="text-sm text-slate-500">Recipes Generated</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">100%</div>
                <div className="text-sm text-slate-500">NZ Focused</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">Free</div>
                <div className="text-sm text-slate-500">To Get Started</div>
              </div>
            </div>
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

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="bg-emerald-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <Sparkles className="text-emerald-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">AI-Powered Plans</h3>
              <p className="text-slate-600">
                Our AI creates personalized meal plans based on your preferences, dietary needs, and what's in your pantry.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="bg-orange-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <ShoppingCart className="text-orange-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Smart Shopping</h3>
              <p className="text-slate-600">
                Automatically generate shopping lists from your meal plan. Export to your favorite store or reminders app.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="bg-rose-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <Heart className="text-rose-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Save Favorites</h3>
              <p className="text-slate-600">
                Love a meal? Save it to your cookbook and quickly generate shopping lists from your favorite recipes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6">
            Ready to simplify your meal planning?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Join Kiwi Meal Planner today and start creating delicious weekly meal plans in minutes.
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-emerald-200"
          >
            Start Planning Now
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-slate-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
              <ChefHat size={18} />
            </div>
            <span className="font-semibold text-slate-700">KiwiMealPlanner</span>
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Kiwi Meal Planner. An app by{' '}
            <a
              href="https://www.unicloud.co.nz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:underline"
            >
              Unicloud.co.nz
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
