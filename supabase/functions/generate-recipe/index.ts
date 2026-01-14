/**
 * Generate Recipe Edge Function
 *
 * Generates a single recipe based on user description using Gemini AI.
 */

import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { mealSchema, fullRecipeSchema } from '../_shared/schemas.ts';
import { checkRateLimit, RATE_LIMITS, rateLimitExceededResponse, getClientIP } from '../_shared/rateLimit.ts';

interface UserPreferences {
  dietaryRestrictions: string;
  likes: string;
  dislikes: string;
  unitSystem: 'metric' | 'imperial';
  temperatureScale: 'celsius' | 'fahrenheit';
  excludedIngredients?: { name: string; reason?: string }[];
}

interface PantryItem {
  id: string;
  name: string;
}

interface MacroTargets {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

interface GenerateRecipeRequest {
  recipeDescription: string;
  preferences: UserPreferences;
  pantryItems: PantryItem[];
  peopleCount: number;
  useWhatIHave: boolean;
  macroTargets?: MacroTargets;
  meatServingGrams?: number;
  includeSidesAndDessert?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const responseHeaders = getCorsHeaders(origin);

  // Check for POST method
  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: responseHeaders,
    });
  }

  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit for AI generation endpoints
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(auth.userId, clientIP, RATE_LIMITS.AI_GENERATION);

    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(rateLimitResult, responseHeaders);
    }

    // Parse request body
    const {
      recipeDescription,
      preferences,
      pantryItems,
      peopleCount,
      useWhatIHave,
      macroTargets,
      meatServingGrams,
      includeSidesAndDessert
    } = await req.json() as GenerateRecipeRequest;

    // Validate input
    if (!recipeDescription || typeof recipeDescription !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid input: recipeDescription is required' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof peopleCount !== 'number' || peopleCount < 1 || peopleCount > 12) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: peopleCount must be between 1 and 12' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from environment
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const pantryListString = pantryItems?.map((p) => p.name).join(', ') || '';

    // Build mode-specific instructions
    const useWhatIHaveMode = useWhatIHave && pantryItems && pantryItems.length > 0;
    const pantryInstructions = useWhatIHaveMode
      ? `PRIORITY MODE - USE WHAT I HAVE:
You MUST create this recipe using primarily these available ingredients: ${pantryListString}.
The recipe should maximize use of these items while still matching the user's request.
Only include additional ingredients that are absolutely necessary to complete the dish.
Goal: minimize extra shopping and reduce food waste.`
      : `Available pantry items to use: ${pantryListString || "none specified"}`;

    // Build excluded ingredients instruction
    const excludedIngredients = preferences?.excludedIngredients || [];
    const exclusionsInstruction = excludedIngredients.length > 0
      ? `\nCRITICAL - NEVER USE THESE INGREDIENTS (allergies/exclusions): ${excludedIngredients.map(e => e.name).join(', ')}.`
      : '';

    // Build meat portion instruction
    const meatPortionInstruction = meatServingGrams
      ? `\nMeat portion size: approximately ${meatServingGrams}g per person (total ${meatServingGrams * peopleCount}g for ${peopleCount} people).`
      : '';

    // Build macro targets instruction
    const macroInstruction = macroTargets
      ? `\nNUTRITION TARGETS (per serving): Aim for approximately ${macroTargets.calories} calories, ${macroTargets.protein}g protein, ${macroTargets.carbohydrates}g carbs, ${macroTargets.fat}g fat. Design the recipe to meet these nutritional goals.`
      : '';

    // Choose schema based on whether sides and dessert are requested
    const schema = includeSidesAndDessert ? fullRecipeSchema : mealSchema;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const baseInstructions = `
For ${peopleCount} people.
Dietary requirements: ${preferences?.dietaryRestrictions || "None"}
Likes: ${preferences?.likes || "Any"}
Dislikes: ${preferences?.dislikes || "None"}
Unit System: ${preferences?.unitSystem?.toUpperCase() || 'METRIC'}
Temperature Scale: ${preferences?.temperatureScale?.toUpperCase() || 'CELSIUS'}

${pantryInstructions}
${exclusionsInstruction}
${meatPortionInstruction}
${macroInstruction}

CRITICAL INSTRUCTIONS:
1. STAY TRUE TO THE REQUEST: Create exactly what the user asked for. If they ask for "cheese on toast", make cheese on toast - do NOT add unrelated proteins, meats, or entirely different dishes.
2. You MAY enhance the dish with complementary toppings, seasonings, or simple accompaniments that fit the dish.
3. Do NOT add major protein sources (meat, fish, eggs) unless the user specifically requested them or they are a natural part of the dish.
4. The recipe name, description, ingredients, and instructions must ALL be consistent with each other.
5. Use ${preferences?.unitSystem || 'metric'} units for ALL ingredient quantities.
6. Use ${preferences?.temperatureScale || 'celsius'} for ALL cooking temperatures.`;

    let prompt: string;

    if (includeSidesAndDessert) {
      prompt = `Create a complete meal based on this request: "${recipeDescription}"

${baseInstructions}

Return a complete meal with:
1. MAIN DISH: The primary dish as requested
2. SIDE DISHES: 1-2 complementary side dishes that pair well with the main dish (e.g., salad, vegetables, rice, bread)
3. DESSERT: A complementary dessert that rounds out the meal nicely

For each item (main, sides, dessert), provide:
- name: A descriptive name
- description: What makes this dish special
- ingredients: Array of ingredient strings with quantities
- instructions: Step-by-step cooking instructions
- prepTime: Estimated preparation time (for sides and dessert)

The sides and dessert should:
- Complement the main dish's flavor profile
- Be relatively simple and practical to prepare
- Match the same dietary requirements and preferences
- Use the same unit system and temperature scale`;
    } else {
      prompt = `Create a detailed recipe based on this request: "${recipeDescription}"

${baseInstructions}

Return a single recipe object with:
- name: A descriptive name for the dish
- description: What makes this dish delicious
- ingredients: Array of ingredient strings (with quantities) - ONLY ingredients actually used in the recipe
- instructions: Step-by-step cooking instructions - ONLY for the actual dish being made`;
    }

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Empty response from AI model' }),
        { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(text);
    const timestamp = Date.now();

    if (includeSidesAndDessert) {
      // Validate full recipe structure
      if (!parsed.main || !parsed.main.name || !parsed.sides || !parsed.dessert) {
        return new Response(
          JSON.stringify({ error: 'Invalid full recipe structure from AI' }),
          { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add IDs to all parts
      const mainId = `recipe-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
      const formattedResponse = {
        id: mainId,
        name: parsed.main.name,
        description: parsed.main.description,
        ingredients: parsed.main.ingredients,
        instructions: parsed.main.instructions,
        servings: peopleCount,
        sides: parsed.sides.map((side: any, idx: number) => ({
          id: `side-${timestamp}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
          name: side.name,
          description: side.description,
          ingredients: side.ingredients,
          instructions: side.instructions,
          prepTime: side.prepTime,
          servings: peopleCount,
        })),
        desserts: [{
          id: `dessert-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
          name: parsed.dessert.name,
          description: parsed.dessert.description,
          ingredients: parsed.dessert.ingredients,
          instructions: parsed.dessert.instructions,
          prepTime: parsed.dessert.prepTime,
          servings: peopleCount,
        }],
      };

      return new Response(
        JSON.stringify(formattedResponse),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Validate simple recipe structure
      if (!parsed.name || !parsed.description || !parsed.ingredients || !parsed.instructions) {
        return new Response(
          JSON.stringify({ error: 'Invalid recipe structure from AI' }),
          { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add ID for database compatibility
      parsed.id = `recipe-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
      parsed.servings = peopleCount;

      return new Response(
        JSON.stringify(parsed),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error generating recipe:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate recipe' }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
