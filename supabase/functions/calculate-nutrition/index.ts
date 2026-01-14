/**
 * Calculate Nutrition Edge Function
 *
 * Calculates nutritional information for a recipe using Gemini AI.
 */

import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { nutritionSchema } from '../_shared/schemas.ts';
import { checkRateLimit, RATE_LIMITS, rateLimitExceededResponse, getClientIP } from '../_shared/rateLimit.ts';

interface CalculateNutritionRequest {
  recipeName: string;
  ingredients: string[];
  servings: number;
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
    const { recipeName, ingredients, servings } = await req.json() as CalculateNutritionRequest;

    // Validate input
    if (!recipeName || typeof recipeName !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid input: recipeName is required' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: ingredients array is required' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const servingCount = servings || 1;

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
        responseSchema: nutritionSchema,
      },
    });

    const prompt = `Calculate the nutritional information for this recipe:

Recipe: ${recipeName}
Total servings the recipe makes: ${servingCount}

Ingredients (quantities are for the ENTIRE recipe, not per serving):
${ingredients.map(i => `- ${i}`).join('\n')}

IMPORTANT: The ingredient quantities above are for the COMPLETE recipe (${servingCount} servings total).
Calculate and return nutritional values PER SINGLE SERVING by dividing the total by ${servingCount}.

Include:
- Calories per serving
- Macronutrients per serving (protein, carbs, fat, fiber, sugar, saturated fat in grams)
- Key micronutrients per serving (sodium, cholesterol, potassium in mg; vitamins A & C, calcium, iron as % daily value)
- 2-3 brief health notes about this dish
- Set servingsPerRecipe to ${servingCount}

Use standard nutritional databases as reference. All values MUST be per single serving, not for the whole recipe.`;

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

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error calculating nutrition:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to calculate nutrition' }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
