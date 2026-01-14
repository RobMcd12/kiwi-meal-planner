/**
 * Generate Dish Image Edge Function
 *
 * Generates a food photograph for a meal using Gemini 2.0 Flash with image output.
 */

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

    // Build the prompt based on whether this is an edit or new generation
    let prompt: string;
    if (editInstructions) {
      prompt = `Generate a high-end food magazine photo of: ${mealName}. ${description}. ${editInstructions}. Professional food photography, appetizing, warm lighting. Only show the exact ingredients described - no extra garnishes.`;
    } else {
      prompt = `Generate a high-end food magazine photo of: ${mealName}. ${description}. Professional food photography, appetizing, warm lighting, table setting. Only show the exact ingredients described - no extra garnishes.`;
    }

    // Use Gemini REST API directly for image generation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();

    // Extract image data from response
    let imageData: string | null = null;
    const parts = result.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageData) {
      console.error('No image in response:', JSON.stringify(result, null, 2));
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
