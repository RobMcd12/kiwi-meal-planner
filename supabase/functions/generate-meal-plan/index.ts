import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { responseSchema } from '../_shared/schemas.ts';

interface MealConfig {
  days: number;
  peopleCount: number;
  includeBreakfast: boolean;
  includeLunch: boolean;
  includeDinner: boolean;
}

interface UserPreferences {
  dietaryRestrictions: string;
  likes: string;
  dislikes: string;
  unitSystem: 'metric' | 'imperial';
  temperatureScale: 'celsius' | 'fahrenheit';
}

interface PantryItem {
  id: string;
  name: string;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { config, preferences, pantryItems } = await req.json() as {
      config: MealConfig;
      preferences: UserPreferences;
      pantryItems: PantryItem[];
    };

    // Validate input
    if (!config || typeof config.days !== 'number' || config.days < 1 || config.days > 7) {
      return new Response(
        JSON.stringify({ error: 'Invalid config: days must be between 1 and 7' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof config.peopleCount !== 'number' || config.peopleCount < 1 || config.peopleCount > 12) {
      return new Response(
        JSON.stringify({ error: 'Invalid config: peopleCount must be between 1 and 12' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from environment
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const pantryListString = pantryItems.map((p) => p.name).join(', ');

    const requestedMeals = [];
    if (config.includeBreakfast) requestedMeals.push('Breakfast');
    if (config.includeLunch) requestedMeals.push('Lunch');
    if (config.includeDinner) requestedMeals.push('Dinner');

    const prompt = `
      Create a ${config.days}-day meal plan for ${config.peopleCount} people.

      IMPORTANT: You must ONLY generate plans for the following meal types: ${requestedMeals.join(', ')}.
      Do not generate meals for types not listed.

      Preferences:
      - Diet: ${preferences.dietaryRestrictions || 'None'}
      - Likes: ${preferences.likes || 'Anything'}
      - Dislikes: ${preferences.dislikes || 'None'}
      - Unit System: ${preferences.unitSystem.toUpperCase()}
      - Temperature Scale: ${preferences.temperatureScale.toUpperCase()}

      Pantry (Exclude these from shopping list):
      [${pantryListString}]

      CRITICAL INSTRUCTION FOR MEALS:
      - Each "Meal" must be a COMPLETE meal, not just a single dish.
      - For example, instead of just "Steak", generate "Grilled Ribeye with Garlic Mashed Potatoes and Asparagus".
      - Instructions must cover preparing all components of the meal.
      - Ingredients must cover all components (main + sides).
      - Use ${preferences.unitSystem} units for ALL ingredient quantities (e.g., ${preferences.unitSystem === 'metric' ? 'grams (g), milliliters (ml)' : 'ounces (oz), pounds (lb), cups'}).
      - Use ${preferences.temperatureScale} for ALL cooking temperatures in instructions.

      Tasks:
      1. Generate plan for ${config.days} days.
      2. Consolidated shopping list sorted by aisle.
      3. Exclude pantry items from shopping list.
      4. Quantities adjusted for ${config.peopleCount} people.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Empty response from AI model' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(text);

    // Validate response structure
    if (!parsed.weeklyPlan || !Array.isArray(parsed.weeklyPlan)) {
      return new Response(
        JSON.stringify({ error: 'Invalid meal plan structure: missing weeklyPlan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!parsed.shoppingList || !Array.isArray(parsed.shoppingList)) {
      return new Response(
        JSON.stringify({ error: 'Invalid meal plan structure: missing shoppingList' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add IDs to meals for database compatibility
    const timestamp = Date.now();
    parsed.weeklyPlan = parsed.weeklyPlan.map((day: any, dayIdx: number) => ({
      ...day,
      meals: {
        breakfast: day.meals?.breakfast
          ? { ...day.meals.breakfast, id: `${dayIdx}-breakfast-${timestamp}` }
          : undefined,
        lunch: day.meals?.lunch
          ? { ...day.meals.lunch, id: `${dayIdx}-lunch-${timestamp}` }
          : undefined,
        dinner: day.meals?.dinner
          ? { ...day.meals.dinner, id: `${dayIdx}-dinner-${timestamp}` }
          : undefined,
      },
    }));

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating meal plan:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate meal plan' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
