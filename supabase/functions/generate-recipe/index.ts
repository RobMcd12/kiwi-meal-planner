/**
 * Generate Recipe Edge Function
 *
 * Generates a single recipe based on user description using Gemini AI.
 */

import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { mealSchema } from '../_shared/schemas.ts';
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
      meatServingGrams
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
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: mealSchema,
      },
    });

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

    const prompt = `Create a detailed recipe based on this request: "${recipeDescription}"

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

CRITICAL INSTRUCTION:
- Create a COMPLETE meal, not just a main dish. Include appropriate side dishes.
- For example, instead of just "Steak", create "Grilled Ribeye with Garlic Mashed Potatoes and Asparagus".
- The name should describe the full meal.
- The description should explain what makes this meal special.
- Include ALL ingredients for ALL components of the meal.
- Instructions must cover preparing all parts of the meal.
- Use ${preferences?.unitSystem || 'metric'} units for ALL ingredient quantities.
- Use ${preferences?.temperatureScale || 'celsius'} for ALL cooking temperatures.

Return a single recipe object with:
- name: The full meal name
- description: What makes this meal delicious
- ingredients: Array of ingredient strings (with quantities)
- instructions: Step-by-step cooking instructions`;

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

    // Validate response structure
    if (!parsed.name || !parsed.description || !parsed.ingredients || !parsed.instructions) {
      return new Response(
        JSON.stringify({ error: 'Invalid recipe structure from AI' }),
        { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add ID for database compatibility
    const timestamp = Date.now();
    parsed.id = `recipe-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    parsed.servings = peopleCount;

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating recipe:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate recipe' }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
