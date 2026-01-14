/**
 * Extract Recipe Edge Function
 *
 * Extracts recipe information from various sources (text, image, PDF, URL) using Gemini AI.
 */

import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { extractedRecipeSchema } from '../_shared/schemas.ts';
import { checkRateLimit, RATE_LIMITS, rateLimitExceededResponse, getClientIP } from '../_shared/rateLimit.ts';

const ALL_TAGS = [
  'Italian', 'Mexican', 'Asian', 'Indian', 'Mediterranean', 'American', 'French', 'Thai', 'Japanese', 'Chinese', 'Greek', 'Middle Eastern', 'Korean', 'Vietnamese', 'Spanish',
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Carb', 'Paleo', 'Whole30', 'Nut-Free', 'Low-Sodium', 'High-Protein', 'Low-Fat',
  'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Appetizer', 'Side Dish', 'Main Course', 'Brunch',
  'Quick & Easy', 'One-Pot', 'Meal Prep', 'Budget-Friendly', 'Kid-Friendly', 'Comfort Food', 'Healthy', 'Spicy', 'Sweet', 'Savory', 'Grilled', 'Baked', 'Raw', 'Fermented', 'Slow Cooker', 'Instant Pot', 'Air Fryer'
];

interface ExtractRecipeRequest {
  type: 'text' | 'image' | 'pdf' | 'url';
  textContent?: string;
  images?: { base64: string; mimeType: string }[];
  pdfBase64?: string;
  url?: string;
  adminInstructions?: string[];
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
    const { type, textContent, images, pdfBase64, url, adminInstructions } = await req.json() as ExtractRecipeRequest;

    // Validate input
    if (!type) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: type is required' }),
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
        responseSchema: extractedRecipeSchema,
      },
    });

    const adminInstructionsText = adminInstructions && adminInstructions.length > 0
      ? `\n\nADDITIONAL INSTRUCTIONS:\n${adminInstructions.join('\n')}`
      : '';

    let result;

    switch (type) {
      case 'text': {
        if (!textContent) {
          return new Response(
            JSON.stringify({ error: 'Invalid input: textContent is required for text extraction' }),
            { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const prompt = `Extract the recipe information from the following text. If the text contains multiple recipes, extract only the first/main one.

Text:
${textContent}

Extract the recipe name, a brief description, ingredients (with quantities), and step-by-step instructions. Also suggest relevant tags from: ${ALL_TAGS.join(", ")}${adminInstructionsText}`;

        result = await model.generateContent(prompt);
        break;
      }

      case 'image': {
        if (!images || images.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Invalid input: images array is required for image extraction' }),
            { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const contents: any[] = images.map(img => ({
          inlineData: {
            mimeType: img.mimeType,
            data: img.base64,
          },
        }));

        const isMultiPage = images.length > 1;
        contents.push({
          text: `Extract the recipe from ${isMultiPage ? 'these images (they form a multi-page recipe - combine all content into a single recipe)' : 'this image'}. Return the recipe name, a brief description, ingredients list (with quantities), and step-by-step instructions. Also suggest relevant tags from: ${ALL_TAGS.join(", ")}
${isMultiPage ? '\nIMPORTANT: These images show different pages of the SAME recipe. Combine all ingredients and instructions into a single complete recipe.' : ''}
Return as JSON with fields: name, description, ingredients (array of strings), instructions (string), suggestedTags (array of strings).${adminInstructionsText}`
        });

        result = await model.generateContent(contents);
        break;
      }

      case 'pdf': {
        if (!pdfBase64) {
          return new Response(
            JSON.stringify({ error: 'Invalid input: pdfBase64 is required for PDF extraction' }),
            { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const contents = [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            text: `Extract the recipe from this PDF document. Return the recipe name, a brief description, ingredients list (with quantities), and step-by-step instructions. Also suggest relevant tags from: ${ALL_TAGS.join(", ")}

If the PDF contains multiple recipes, extract only the main/first one.
Return as JSON with fields: name, description, ingredients (array of strings), instructions (string), suggestedTags (array of strings).${adminInstructionsText}`
          }
        ];

        result = await model.generateContent(contents);
        break;
      }

      case 'url': {
        if (!url) {
          return new Response(
            JSON.stringify({ error: 'Invalid input: url is required for URL extraction' }),
            { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate URL
        try {
          new URL(url);
        } catch {
          return new Response(
            JSON.stringify({ error: 'Invalid URL provided' }),
            { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fetch the webpage content using a CORS proxy
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

        let htmlContent: string;
        try {
          const response = await fetch(proxyUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status}`);
          }
          htmlContent = await response.text();
        } catch (fetchError) {
          console.error("URL fetch error:", fetchError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch the webpage. The site may be blocking access.' }),
            { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const prompt = `Extract the recipe from the following webpage HTML content.
Ignore all navigation, ads, comments, related recipes, and other non-recipe content.
Focus ONLY on the main recipe on the page.

If there is no recipe found, return an error message in the name field.

HTML Content:
${htmlContent.substring(0, 50000)}

Extract and return:
- name: The recipe title
- description: A brief description of the dish
- ingredients: Array of ingredients with quantities (e.g., "2 cups flour", "1 tsp salt")
- instructions: Step-by-step cooking instructions as a single string
- suggestedTags: Relevant tags from this list: ${ALL_TAGS.join(", ")}${adminInstructionsText}`;

        result = await model.generateContent(prompt);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid extraction type' }),
          { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const response = result.response;
    const text = response.text();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Empty response from AI model' }),
        { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extracted = JSON.parse(text);

    // Check if extraction failed (for URL type)
    if (type === 'url' && (
      extracted.name.toLowerCase().includes('error') ||
      extracted.name.toLowerCase().includes('no recipe') ||
      extracted.ingredients.length === 0
    )) {
      return new Response(
        JSON.stringify({ error: 'No recipe found on this page. Try a different URL or paste the recipe text directly.' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(extracted),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error extracting recipe:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to extract recipe' }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
