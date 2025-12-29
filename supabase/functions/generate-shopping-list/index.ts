import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { responseSchema } from '../_shared/schemas.ts';

interface Meal {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  instructions: string;
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
    const { meals, peopleCount, pantryItems } = await req.json() as {
      meals: Meal[];
      peopleCount: number;
      pantryItems: PantryItem[];
    };

    // Validate input
    if (!meals || !Array.isArray(meals) || meals.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: meals array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof peopleCount !== 'number' || peopleCount < 1 || peopleCount > 12) {
      return new Response(
        JSON.stringify({ error: 'Invalid peopleCount: must be between 1 and 12' }),
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

    const mealNames = meals.map((m) => m.name).join(', ');
    const pantryListString = pantryItems.map((p) => p.name).join(', ');

    const prompt = `
      I have a list of favorite meals: [${mealNames}].
      Generate a consolidated shopping list for these meals for ${peopleCount} people.
      Pantry (Exclude these): [${pantryListString}].

      Also return a "weeklyPlan" array that just lists these meals assigned to generic days (Day 1, Day 2, etc) so I can view them.
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
        JSON.stringify({ error: 'Invalid response structure: missing weeklyPlan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!parsed.shoppingList || !Array.isArray(parsed.shoppingList)) {
      return new Response(
        JSON.stringify({ error: 'Invalid response structure: missing shoppingList' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating shopping list:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate shopping list' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
