/**
 * Auto Tag Recipe Edge Function
 *
 * Automatically assigns relevant tags to a recipe using Gemini AI.
 */

import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { autoTagSchema } from '../_shared/schemas.ts';
import { checkRateLimit, RATE_LIMITS, rateLimitExceededResponse, getClientIP } from '../_shared/rateLimit.ts';

// Predefined tag categories
const TAG_CATEGORIES = {
  cuisine: ['Italian', 'Mexican', 'Asian', 'Indian', 'Mediterranean', 'American', 'French', 'Thai', 'Japanese', 'Chinese', 'Greek', 'Middle Eastern', 'Korean', 'Vietnamese', 'Spanish'],
  dietary: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Carb', 'Paleo', 'Whole30', 'Nut-Free', 'Low-Sodium', 'High-Protein', 'Low-Fat'],
  mealType: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Appetizer', 'Side Dish', 'Main Course', 'Brunch'],
  other: ['Quick & Easy', 'One-Pot', 'Meal Prep', 'Budget-Friendly', 'Kid-Friendly', 'Comfort Food', 'Healthy', 'Spicy', 'Sweet', 'Savory', 'Grilled', 'Baked', 'Raw', 'Fermented', 'Slow Cooker', 'Instant Pot', 'Air Fryer']
};

const ALL_TAGS = [...TAG_CATEGORIES.cuisine, ...TAG_CATEGORIES.dietary, ...TAG_CATEGORIES.mealType, ...TAG_CATEGORIES.other];

interface AutoTagRequest {
  recipe: {
    name: string;
    description: string;
    ingredients: string[];
  };
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
    const { recipe } = await req.json() as AutoTagRequest;

    // Validate input
    if (!recipe || !recipe.name) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: recipe with name is required' }),
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
        responseSchema: autoTagSchema,
      },
    });

    const prompt = `Analyze this recipe and assign relevant tags from the predefined list.

Recipe Name: ${recipe.name}
Description: ${recipe.description || 'No description provided'}
Ingredients: ${recipe.ingredients?.join(", ") || 'No ingredients listed'}

Available tags (ONLY use tags from this list):
- Cuisine: ${TAG_CATEGORIES.cuisine.join(", ")}
- Dietary: ${TAG_CATEGORIES.dietary.join(", ")}
- Meal Type: ${TAG_CATEGORIES.mealType.join(", ")}
- Other: ${TAG_CATEGORIES.other.join(", ")}

Select 3-6 most relevant tags. Determine the primary cuisine type and difficulty level (Easy, Medium, or Hard).`;

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

    // Filter to only include valid tags from our predefined list
    const validTags = parsed.tags.filter((tag: string) =>
      ALL_TAGS.some(t => t.toLowerCase() === tag.toLowerCase())
    );

    return new Response(
      JSON.stringify({
        tags: validTags,
        cuisineType: parsed.cuisineType || 'Other',
        difficulty: parsed.difficulty || 'Medium'
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error auto-tagging recipe:', error);
    // Return empty tags on error - don't block the save
    return new Response(
      JSON.stringify({ tags: [], cuisineType: 'Other', difficulty: 'Medium' }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
