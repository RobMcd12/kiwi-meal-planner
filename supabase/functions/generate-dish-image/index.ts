/**
 * Generate Dish Image Edge Function
 *
 * Generates a food photograph for a meal using Imagen 3 via Gemini API.
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
      prompt = `A high-end food magazine photo of: ${mealName}. ${description}. ${editInstructions}. Professional food photography, appetizing, warm lighting. Only show the exact ingredients described - no extra garnishes.`;
    } else {
      prompt = `A high-end food magazine photo of: ${mealName}. ${description}. Professional food photography, appetizing, warm lighting, table setting. Only show the exact ingredients described - no extra garnishes.`;
    }

    // Use Imagen 3 for image generation
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '16:9',
      },
    });

    // Extract image data from response
    const generatedImages = response.generatedImages;
    if (!generatedImages || generatedImages.length === 0 || !generatedImages[0].image?.imageBytes) {
      return new Response(
        JSON.stringify({ error: 'No image generated' }),
        { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to base64 data URL
    const imageBytes = generatedImages[0].image.imageBytes;
    const imageData = `data:image/png;base64,${imageBytes}`;

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
