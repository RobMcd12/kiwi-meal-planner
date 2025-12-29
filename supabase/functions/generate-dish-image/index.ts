import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';

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
    const { mealName, description } = await req.json() as {
      mealName: string;
      description: string;
    };

    // Validate input
    if (!mealName || typeof mealName !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid input: mealName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache first
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: cachedImage } = await supabase
      .from('meal_image_cache')
      .select('image_data')
      .eq('meal_name', mealName)
      .single();

    if (cachedImage?.image_data) {
      return new Response(
        JSON.stringify({ imageData: cachedImage.image_data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Use Gemini's image generation model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Generate a detailed description for a professional food photograph of: ${mealName}. ${description}.
    Describe the plating, lighting, and presentation as if for a high-end food magazine.`;

    // Note: As of current Gemini API, direct image generation isn't available via the standard API
    // This function returns a placeholder or could be adapted when image generation is available
    // For now, we'll return null to indicate no image was generated

    const result = await model.generateContent(prompt);
    const response = result.response;
    const imageDescription = response.text();

    // Store the description in cache (or actual image when available)
    // For now, we return null as actual image generation requires different API
    return new Response(
      JSON.stringify({
        imageData: null,
        description: imageDescription,
        message: 'Image generation not available - using client-side generation'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating dish image:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate image' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
