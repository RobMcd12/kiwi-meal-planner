/**
 * Scan Pantry Edge Function
 *
 * Analyzes images, video, or audio to identify pantry ingredients using Gemini AI.
 * Supports multiple input types: images (base64), video (base64), audio (base64), or text dictation.
 */

import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0';
import { corsHeaders, handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { checkRateLimit, RATE_LIMITS, rateLimitExceededResponse, getClientIP } from '../_shared/rateLimit.ts';

// Schema for pantry item extraction
const pantryItemsSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of identified food items and ingredients',
    },
    categories: {
      type: 'object',
      properties: {
        produce: { type: 'array', items: { type: 'string' } },
        dairy: { type: 'array', items: { type: 'string' } },
        meat: { type: 'array', items: { type: 'string' } },
        pantryStaples: { type: 'array', items: { type: 'string' } },
        frozen: { type: 'array', items: { type: 'string' } },
        beverages: { type: 'array', items: { type: 'string' } },
        condiments: { type: 'array', items: { type: 'string' } },
        other: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  required: ['items'],
};

interface ScanRequest {
  type: 'images' | 'video' | 'audio' | 'dictation';
  images?: { base64: string; mimeType: string }[];
  video?: { base64: string; mimeType: string };
  audio?: { base64: string; mimeType: string };
  dictationText?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const responseHeaders = getCorsHeaders(origin);

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: responseHeaders,
    });
  }

  try {
    console.log('scan-pantry: Starting request processing');

    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      console.error('scan-pantry: Auth verification failed');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('scan-pantry: Auth verified for user:', auth.userId);

    // Check rate limit for AI generation endpoints
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(auth.userId, clientIP, RATE_LIMITS.AI_GENERATION);

    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(rateLimitResult, responseHeaders);
    }

    // Parse request body
    const body: ScanRequest = await req.json();
    console.log('scan-pantry: Request type:', body.type);

    // Validate input
    if (!body.type) {
      console.error('scan-pantry: Missing type field');
      return new Response(
        JSON.stringify({ error: 'Missing type field (images, video, audio, or dictation)' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from environment
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      console.error('scan-pantry: GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('scan-pantry: GEMINI_API_KEY found');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: pantryItemsSchema,
      },
    });

    let contents: any[] = [];
    let prompt = '';

    switch (body.type) {
      case 'images':
        if (!body.images || body.images.length === 0) {
          return new Response(
            JSON.stringify({ error: 'No images provided' }),
            { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Add images to content
        for (const img of body.images) {
          contents.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.base64,
            },
          });
        }

        prompt = `Analyze these images of a pantry, refrigerator, freezer, or kitchen counter with ingredients.

Identify ALL visible food items, ingredients, and cooking supplies. Be thorough and SPECIFIC about item types.

CRITICAL RULES:

1. BE SPECIFIC ABOUT ITEM TYPES - Never use generic names:
   - Vinegar: Identify the TYPE (e.g., "balsamic vinegar", "white wine vinegar", "apple cider vinegar", "rice vinegar", "red wine vinegar", "distilled white vinegar")
   - Oil: Identify the TYPE (e.g., "olive oil", "vegetable oil", "coconut oil", "sesame oil", "avocado oil")
   - Flour: Identify the TYPE (e.g., "all-purpose flour", "bread flour", "whole wheat flour", "almond flour")
   - Sugar: Identify the TYPE (e.g., "white sugar", "brown sugar", "powdered sugar", "coconut sugar")
   - Cheese: Identify the TYPE (e.g., "cheddar cheese", "parmesan cheese", "mozzarella cheese", "cream cheese")
   - Milk: Identify the TYPE (e.g., "whole milk", "skim milk", "oat milk", "almond milk")
   - Read labels carefully to identify specific product types

2. ESTIMATE REMAINING QUANTITY for EVERY item:
   - Count individual items: "eggs (6)", "apples (3)", "onions (2)"
   - For containers/bottles: estimate how much is LEFT (not original size)
     - Half-full 1L milk: "whole milk (~500ml remaining)"
     - Mostly empty sauce jar: "marinara sauce (~100ml remaining)"
     - Partially used butter: "butter (~200g remaining)"
   - For packaged items: estimate remaining contents visually
   - For bulk items: estimate visible amounts ("basmati rice (~500g)", "potatoes (~1kg)")
   - Include the quantity in parentheses after the item name

3. For each item:
   - ALWAYS include the specific type + remaining quantity
   - Read labels to identify exact product names/types
   - Be realistic about partially used items

Group items into categories:
- Produce (fruits, vegetables)
- Dairy (milk, cheese, yogurt, butter)
- Meat & Seafood (fresh or frozen)
- Pantry Staples (flour, sugar, rice, pasta, canned goods, spices)
- Frozen items
- Beverages
- Condiments & Sauces
- Other

Return all identified items as a flat list in "items" and categorized in "categories". Every item MUST be specific about type AND include a remaining quantity estimate.`;
        break;

      case 'video':
        if (!body.video) {
          return new Response(
            JSON.stringify({ error: 'No video provided' }),
            { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
          );
        }

        contents.push({
          inlineData: {
            mimeType: body.video.mimeType,
            data: body.video.base64,
          },
        });

        prompt = `Analyze this video of a pantry, refrigerator, freezer, or kitchen counter with ingredients.

Identify ALL visible food items, ingredients, and cooking supplies throughout the video. Be thorough and SPECIFIC about item types.

CRITICAL RULES:

1. BE SPECIFIC ABOUT ITEM TYPES - Never use generic names:
   - Vinegar: Identify the TYPE (e.g., "balsamic vinegar", "white wine vinegar", "apple cider vinegar", "rice vinegar", "red wine vinegar", "distilled white vinegar")
   - Oil: Identify the TYPE (e.g., "olive oil", "vegetable oil", "coconut oil", "sesame oil", "avocado oil")
   - Flour: Identify the TYPE (e.g., "all-purpose flour", "bread flour", "whole wheat flour", "almond flour")
   - Sugar: Identify the TYPE (e.g., "white sugar", "brown sugar", "powdered sugar", "coconut sugar")
   - Cheese: Identify the TYPE (e.g., "cheddar cheese", "parmesan cheese", "mozzarella cheese", "cream cheese")
   - Milk: Identify the TYPE (e.g., "whole milk", "skim milk", "oat milk", "almond milk")
   - Read labels carefully to identify specific product types

2. ESTIMATE REMAINING QUANTITY for EVERY item:
   - Count individual items: "eggs (6)", "apples (3)", "onions (2)"
   - For containers/bottles: estimate how much is LEFT (not original size)
     - Half-full 1L milk: "whole milk (~500ml remaining)"
     - Mostly empty sauce jar: "marinara sauce (~100ml remaining)"
     - Partially used butter: "butter (~200g remaining)"
   - For packaged items: estimate remaining contents visually
   - For bulk items: estimate visible amounts ("basmati rice (~500g)", "potatoes (~1kg)")
   - Include the quantity in parentheses after the item name

3. For each item:
   - ALWAYS include the specific type + remaining quantity
   - Read labels to identify exact product names/types
   - Be realistic about partially used items

Group items into categories:
- Produce (fruits, vegetables)
- Dairy (milk, cheese, yogurt, butter)
- Meat & Seafood (fresh or frozen)
- Pantry Staples (flour, sugar, rice, pasta, canned goods, spices)
- Frozen items
- Beverages
- Condiments & Sauces
- Other

Return all identified items as a flat list in "items" and categorized in "categories". Every item MUST be specific about type AND include a remaining quantity estimate.`;
        break;

      case 'audio':
        if (!body.audio) {
          return new Response(
            JSON.stringify({ error: 'No audio provided' }),
            { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
          );
        }

        contents.push({
          inlineData: {
            mimeType: body.audio.mimeType,
            data: body.audio.base64,
          },
        });

        prompt = `Listen to this audio recording of someone listing items in their pantry, refrigerator, or kitchen.

Transcribe and identify ALL food items, ingredients, and cooking supplies mentioned.

For each item:
- Use common names
- Include quantities if mentioned (e.g., "two bottles of milk")
- Handle casual speech patterns (e.g., "I've got some eggs and milk")

Group items into categories:
- Produce (fruits, vegetables)
- Dairy (milk, cheese, yogurt, butter)
- Meat & Seafood
- Pantry Staples (flour, sugar, rice, pasta, canned goods, spices)
- Frozen items
- Beverages
- Condiments & Sauces
- Other

Return all identified items as a flat list in "items" and categorized in "categories".`;
        break;

      case 'dictation':
        if (!body.dictationText) {
          return new Response(
            JSON.stringify({ error: 'No dictation text provided' }),
            { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
          );
        }

        prompt = `Parse this transcription of someone listing items in their pantry, refrigerator, or kitchen:

"${body.dictationText}"

Identify ALL food items, ingredients, and cooking supplies mentioned.

For each item:
- Use common names
- Include quantities if mentioned
- Clean up any speech recognition errors (e.g., "bread" not "bred")
- Handle casual speech patterns

Group items into categories:
- Produce (fruits, vegetables)
- Dairy (milk, cheese, yogurt, butter)
- Meat & Seafood
- Pantry Staples (flour, sugar, rice, pasta, canned goods, spices)
- Frozen items
- Beverages
- Condiments & Sauces
- Other

Return all identified items as a flat list in "items" and categorized in "categories".`;
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid type. Must be images, video, audio, or dictation' }),
          { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Add prompt to content
    contents.push({ text: prompt });

    // Call Gemini
    const result = await model.generateContent(contents);
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
      { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scan pantry error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to scan pantry' }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
