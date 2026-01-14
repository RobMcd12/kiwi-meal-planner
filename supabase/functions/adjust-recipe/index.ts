/**
 * Adjust Recipe Edge Function
 *
 * Adjusts a recipe based on user requirements (servings, protein, macros, custom instructions).
 */

import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { adjustedRecipeSchema } from '../_shared/schemas.ts';
import { checkRateLimit, RATE_LIMITS, rateLimitExceededResponse, getClientIP } from '../_shared/rateLimit.ts';

interface Meal {
  name: string;
  description: string;
  ingredients: string[];
  instructions: string;
  servings?: number;
}

interface RecipeAdjustment {
  type: 'servings' | 'protein' | 'macros' | 'custom';
  targetServings?: number;
  adjustment?: 'increase' | 'decrease';
  targetGrams?: number;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  instructions?: string;
}

interface UserPreferences {
  unitSystem?: 'metric' | 'imperial';
  temperatureScale?: 'celsius' | 'fahrenheit';
}

interface AdjustRecipeRequest {
  recipe: Meal;
  adjustment: RecipeAdjustment;
  preferences?: UserPreferences;
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

    // Check rate limit
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(auth.userId, clientIP, RATE_LIMITS.AI_GENERATION);

    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(rateLimitResult, responseHeaders);
    }

    // Parse request body
    const { recipe, adjustment, preferences } = await req.json() as AdjustRecipeRequest;

    // Validate input
    if (!recipe || !recipe.name || !recipe.ingredients) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: recipe with name and ingredients is required' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!adjustment || !adjustment.type) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: adjustment with type is required' }),
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
        responseSchema: adjustedRecipeSchema,
      },
    });

    let adjustmentPrompt = '';

    switch (adjustment.type) {
      case 'servings':
        adjustmentPrompt = `Adjust this recipe from ${recipe.servings || 4} servings to ${adjustment.targetServings} servings.
Scale ALL ingredient quantities proportionally.
Adjust cooking times if necessary (e.g., larger batches may need more time).
Keep the same cooking method and techniques.`;
        break;

      case 'protein':
        if (adjustment.targetGrams) {
          adjustmentPrompt = `Adjust this recipe to have approximately ${adjustment.targetGrams}g of protein per serving.
${adjustment.adjustment === 'increase' ? 'Add more protein sources or increase existing protein ingredients.' : 'Reduce protein ingredients.'}
Maintain the overall flavor profile and dish concept.
Adjust other ingredients as needed for balance.`;
        } else {
          adjustmentPrompt = `${adjustment.adjustment === 'increase' ? 'Increase' : 'Decrease'} the protein content of this recipe significantly.
${adjustment.adjustment === 'increase' ? 'Add more protein sources (meat, legumes, eggs, dairy, etc.) or increase existing protein ingredients.' : 'Reduce protein-heavy ingredients while maintaining flavor.'}
Adjust cooking times and other ingredients as needed.`;
        }
        break;

      case 'macros':
        const targets = [];
        if (adjustment.targetCalories) targets.push(`~${adjustment.targetCalories} calories per serving`);
        if (adjustment.targetProtein) targets.push(`~${adjustment.targetProtein}g protein per serving`);
        if (adjustment.targetCarbs) targets.push(`~${adjustment.targetCarbs}g carbohydrates per serving`);
        if (adjustment.targetFat) targets.push(`~${adjustment.targetFat}g fat per serving`);

        adjustmentPrompt = `Adjust this recipe to meet these nutritional targets per serving:
${targets.join('\n')}

Modify ingredients and portions to achieve these targets while:
- Maintaining the dish's core concept and flavor profile
- Keeping it practical and delicious
- Using substitutions where beneficial (e.g., lean meat, low-fat alternatives, more vegetables)`;
        break;

      case 'custom':
        adjustmentPrompt = adjustment.instructions || 'Make general improvements to the recipe.';
        break;
    }

    const unitSystem = preferences?.unitSystem || 'metric';
    const tempScale = preferences?.temperatureScale || 'celsius';

    const prompt = `Adjust this recipe according to the instructions below.

ORIGINAL RECIPE:
Name: ${recipe.name}
Description: ${recipe.description}
Current servings: ${recipe.servings || 4}
Ingredients:
${recipe.ingredients.map(i => `- ${i}`).join('\n')}

Instructions:
${recipe.instructions}

ADJUSTMENT REQUEST:
${adjustmentPrompt}

REQUIREMENTS:
- Use ${unitSystem} units for measurements
- Use ${tempScale} for temperatures
- Keep instructions clear and practical
- Adjust cooking times appropriately
- Provide a brief note explaining the main changes made

Return the fully adjusted recipe.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Empty response from AI model' }),
        { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adjusted = JSON.parse(text);

    return new Response(
      JSON.stringify(adjusted),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error adjusting recipe:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to adjust recipe' }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
