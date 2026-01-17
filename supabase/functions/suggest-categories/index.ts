/**
 * Suggest Categories Edge Function
 *
 * Uses Gemini AI to suggest appropriate pantry categories for grocery items.
 */

import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { categorySuggestionSchema } from '../_shared/schemas.ts';
import { checkRateLimit, RATE_LIMITS, rateLimitExceededResponse, getClientIP } from '../_shared/rateLimit.ts';

interface SuggestCategoriesRequest {
  itemNames: string[];
  categories: string[];
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
    const { itemNames, categories } = await req.json() as SuggestCategoriesRequest;

    // Validate input
    if (!itemNames || !Array.isArray(itemNames) || itemNames.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: itemNames array is required' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: categories array is required' }),
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
        responseSchema: categorySuggestionSchema,
      },
    });

    const prompt = `You are a grocery categorization assistant. For each item below, suggest the most appropriate category from the provided list.

Items to categorize:
${itemNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Available categories (ONLY use categories from this list):
${categories.join(', ')}

For each item, return:
- name: the original item name exactly as provided
- suggestedCategory: the best matching category from the list
- confidence: a score from 0 to 1 indicating how confident you are in the suggestion`;

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

    // Validate that suggested categories are from the provided list
    const validatedItems = parsed.items.map((item: { name: string; suggestedCategory: string; confidence: number }) => {
      const normalizedSuggestion = item.suggestedCategory.toLowerCase();
      const matchedCategory = categories.find(
        cat => cat.toLowerCase() === normalizedSuggestion
      );
      return {
        name: item.name,
        suggestedCategory: matchedCategory || item.suggestedCategory,
        confidence: item.confidence || 0.8,
      };
    });

    return new Response(
      JSON.stringify({ items: validatedItems }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error suggesting categories:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to suggest categories', items: [] }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
