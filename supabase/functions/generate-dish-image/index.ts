/**
 * Generate Dish Image Edge Function
 *
 * Generates a food photograph for a meal using Gemini AI image generation.
 */

import { GoogleGenAI } from 'https://esm.sh/@google/genai@0.14.1';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { checkRateLimit, RATE_LIMITS, rateLimitExceededResponse, getClientIP } from '../_shared/rateLimit.ts';

interface GenerateImageRequest {
  mealName: string;
  description: string;
  editInstructions?: string;
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
    const { mealName, description, editInstructions } = await req.json() as GenerateImageRequest;

    // Validate input
    if (!mealName || typeof mealName !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid input: mealName is required' }),
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

    const ai = new GoogleGenAI({ apiKey });

    // Build the prompt based on whether this is an edit or new generation
    let prompt: string;
    if (editInstructions) {
      prompt = `A high-end food magazine photo of: ${mealName}.
Description: ${description}

Special instructions for this image: ${editInstructions}

Create an appetizing, professional food photograph following these instructions.

IMPORTANT: Only show ingredients and components that are explicitly part of this specific recipe as described above. Do NOT add garnishes, sides, or ingredients that are not mentioned in the description. The image must accurately represent ONLY what is in the actual recipe - no extra vegetables, sauces, or toppings that weren't specified.`;
    } else {
      prompt = `A high-end food magazine photo of a complete meal: ${mealName}. The image should show the main dish alongside its side dishes as described: ${description}. Warm, appetizing lighting, table setting.

IMPORTANT: Only show ingredients and components that are explicitly part of this specific recipe. Do NOT add garnishes, sides, or ingredients that are not mentioned in the description. The image must accurately represent ONLY what is in the actual recipe - no extra vegetables, sauces, or toppings that weren't specified.`;
    }

    // Generate the image using Gemini 2.5 Flash image model
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        responseModalities: ['image', 'text'],
        imageSafety: 'block_low_and_above',
      }
    });

    // Extract image data from response
    let imageData: string | null = null;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'No image generated' }),
        { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ imageData }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating dish image:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate image' }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
