import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserPreferences, PantryItem, MealPlanResponse, MealConfig, Meal, ExtractedRecipe, ScannedPantryResult, SideDish, CountryCode, MacroTargets, DEFAULT_MACRO_TARGETS } from "../types";
import { supabase, isSupabaseConfigured, getSession } from "./authService";
import { getInstructionsByTag, buildPromptWithInstructions } from "./adminInstructionsService";
import { getLocalizationInstruction } from "./profileService";
import { formatMacroTargetsForPrompt } from "./macroTargetService";

// Predefined tag categories for AI to choose from
export const TAG_CATEGORIES = {
  cuisine: ['Italian', 'Asian', 'Mexican', 'Indian', 'Mediterranean', 'American', 'French', 'Thai', 'Japanese', 'Chinese', 'Greek', 'Middle Eastern', 'Korean', 'Vietnamese', 'Spanish'],
  dietary: ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Carb', 'Paleo', 'Nut-Free', 'Halal', 'Kosher', 'Low-Sodium', 'Sugar-Free'],
  mealType: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Appetizer', 'Side Dish', 'Beverage'],
  other: ['Quick', 'Easy', 'Budget-Friendly', 'Healthy', 'Comfort Food', 'Spicy', 'Kid-Friendly', 'Meal Prep', 'One-Pot', 'BBQ', 'Slow Cooker', 'Air Fryer']
};

const ALL_TAGS = [...TAG_CATEGORIES.cuisine, ...TAG_CATEGORIES.dietary, ...TAG_CATEGORIES.mealType, ...TAG_CATEGORIES.other];

// Feature flag: Set to true to use Edge Functions (production), false for client-side (development)
const USE_EDGE_FUNCTIONS = true; // SECURITY: Enabled to protect API key from browser exposure

// --- Schema Definitions ---
const ingredientSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    quantity: { type: Type.STRING },
    unit: { type: Type.STRING },
  },
  required: ["name", "quantity", "unit"],
};

const mealSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Full name of the complete meal (Main + Sides)" },
    description: { type: Type.STRING, description: "Description of the full meal composition" },
    ingredients: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING } 
    },
    instructions: { type: Type.STRING, description: "Combined cooking instructions for all parts of the meal" },
  },
  required: ["name", "description", "ingredients", "instructions"],
};

const dayPlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    day: { type: Type.STRING },
    meals: {
      type: Type.OBJECT,
      properties: {
        breakfast: mealSchema,
        lunch: mealSchema,
        dinner: mealSchema,
      },
      // Removed required array here to allow flexibility based on config
    },
  },
  required: ["day", "meals"],
};

const shoppingCategorySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    categoryName: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: ingredientSchema,
    },
  },
  required: ["categoryName", "items"],
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    weeklyPlan: {
      type: Type.ARRAY,
      items: dayPlanSchema,
    },
    shoppingList: {
      type: Type.ARRAY,
      items: shoppingCategorySchema,
    },
  },
  required: ["weeklyPlan", "shoppingList"],
};

// --- Edge Function Calls (Production) ---

/**
 * Helper to invoke Edge Function with explicit auth header
 * This ensures the access token is properly passed
 */
const invokeWithAuth = async (functionName: string, body: Record<string, unknown>) => {
  const session = await getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  return supabase.functions.invoke(functionName, {
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

const generateMealPlanViaEdge = async (
  config: MealConfig,
  preferences: UserPreferences,
  pantryItems: PantryItem[]
): Promise<MealPlanResponse> => {
  const { data, error } = await invokeWithAuth('generate-meal-plan', { config, preferences, pantryItems });

  if (error) throw error;
  if (!data) throw new Error('No data returned from Edge Function');

  return data as MealPlanResponse;
};

const generateShoppingListViaEdge = async (
  meals: Meal[],
  peopleCount: number,
  pantryItems: PantryItem[]
): Promise<MealPlanResponse> => {
  const { data, error } = await invokeWithAuth('generate-shopping-list', { meals, peopleCount, pantryItems });

  if (error) throw error;
  if (!data) throw new Error('No data returned from Edge Function');

  return data as MealPlanResponse;
};

// Edge Function for dish image generation
const generateDishImageViaEdge = async (
  mealName: string,
  description: string,
  editInstructions?: string
): Promise<string | null> => {
  const { data, error } = await invokeWithAuth('generate-dish-image', {
    mealName,
    description,
    editInstructions,
  });

  if (error) {
    console.error('Edge Function error:', error);
    throw new Error(error.message || 'Failed to generate image');
  }

  if (!data) {
    throw new Error('No data returned from Edge Function');
  }

  return data.imageData || null;
};

// Edge Function for pantry scanning (images, video, audio, dictation)
const scanPantryViaEdge = async (
  type: 'images' | 'video' | 'audio' | 'dictation',
  payload: {
    images?: { base64: string; mimeType: string }[];
    video?: { base64: string; mimeType: string };
    audio?: { base64: string; mimeType: string };
    dictationText?: string;
  }
): Promise<ScannedPantryResult> => {
  const { data, error } = await invokeWithAuth('scan-pantry', { type, ...payload });

  if (error) throw error;
  if (!data) throw new Error('No data returned from Edge Function');

  return data as ScannedPantryResult;
};

// --- Client-Side API Calls (Development) ---

export const generateMealPlan = async (
  config: MealConfig,
  preferences: UserPreferences,
  pantryItems: PantryItem[],
  userCountry?: CountryCode | null,
  macroTargets?: MacroTargets | null
): Promise<MealPlanResponse> => {
  // Use Edge Functions in production when configured
  if (USE_EDGE_FUNCTIONS && isSupabaseConfigured()) {
    return generateMealPlanViaEdge(config, preferences, pantryItems);
  }

  // Fall back to client-side API call
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  const pantryListString = pantryItems.map((p) => p.name).join(", ");

  const requestedMeals = [];
  if (config.includeBreakfast) requestedMeals.push("Breakfast");
  if (config.includeLunch) requestedMeals.push("Lunch");
  if (config.includeDinner) requestedMeals.push("Dinner");

  // Build portion/nutrition guidance
  const meatServing = preferences.meatServingGrams || 175;
  const effectiveTargets = macroTargets || DEFAULT_MACRO_TARGETS;
  const macroTargetsText = formatMacroTargetsForPrompt(effectiveTargets);

  // Build mode-specific instructions
  const useWhatIHaveMode = config.useWhatIHave && pantryItems.length > 0;
  const modeInstructions = useWhatIHaveMode
    ? `PRIORITY MODE - USE WHAT I HAVE: You MUST prioritize using these pantry/fridge/freezer items as PRIMARY ingredients: ${pantryListString}.
Design meals that use as many of these items as possible. Minimize shopping list by building recipes around available ingredients.
Only add items to shopping list if absolutely necessary to complete recipes. Goal: reduce food waste and shopping.`
    : `Pantry (exclude from list): ${pantryListString || "none"}.`;

  // Get admin instructions for meal planning
  const adminInstructions = await getInstructionsByTag('meal_planner');
  const adminInstructionsText = adminInstructions.length > 0
    ? `\n\nADDITIONAL INSTRUCTIONS:\n${adminInstructions.join('\n')}`
    : '';

  // Build localization instruction based on user's country
  const localizationText = getLocalizationInstruction(userCountry || null);
  const localizationInstruction = localizationText ? `\n${localizationText}` : '';

  // Build excluded ingredients instruction
  const excludedIngredients = preferences.excludedIngredients || [];
  const exclusionsInstruction = excludedIngredients.length > 0
    ? `\nCRITICAL - NEVER USE THESE INGREDIENTS (allergies/exclusions): ${excludedIngredients.map(e => e.name).join(', ')}.`
    : '';

  // Concise prompt for faster generation
  const prompt = `${config.days}-day meal plan, ${config.peopleCount} people. Meals: ${requestedMeals.join(", ")} only.
Diet: ${preferences.dietaryRestrictions || "None"}. Likes: ${preferences.likes || "Any"}. Dislikes: ${preferences.dislikes || "None"}.${exclusionsInstruction}
Units: ${preferences.unitSystem}. Temps: ${preferences.temperatureScale}.${localizationInstruction}
Portions: Meat/protein ${meatServing}g per person.
DAILY NUTRITION TARGETS (per person): ${macroTargetsText}
Design meals to help achieve these daily targets when all meals are combined.
${modeInstructions}
Each meal = complete dish with sides (e.g. "Grilled Salmon with Rice and Vegetables"). Include all ingredients/instructions for full meal.
IMPORTANT: Shopping list MUST include ingredients from ALL ${config.days * requestedMeals.length} meals. Combine quantities, organize by aisle, scale for ${config.peopleCount} people.${adminInstructionsText}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from AI model');
    }

    const parsed = JSON.parse(response.text);

    // Validate response structure
    if (!parsed.weeklyPlan || !Array.isArray(parsed.weeklyPlan)) {
      throw new Error('Invalid meal plan structure: missing weeklyPlan');
    }
    if (!parsed.shoppingList || !Array.isArray(parsed.shoppingList)) {
      throw new Error('Invalid meal plan structure: missing shoppingList');
    }

    // Add IDs and servings to meals for database compatibility
    const timestamp = Date.now();
    parsed.weeklyPlan = parsed.weeklyPlan.map((day: any, dayIdx: number) => ({
      ...day,
      meals: {
        breakfast: day.meals?.breakfast
          ? { ...day.meals.breakfast, id: `${dayIdx}-breakfast-${timestamp}`, servings: config.peopleCount }
          : undefined,
        lunch: day.meals?.lunch
          ? { ...day.meals.lunch, id: `${dayIdx}-lunch-${timestamp}`, servings: config.peopleCount }
          : undefined,
        dinner: day.meals?.dinner
          ? { ...day.meals.dinner, id: `${dayIdx}-dinner-${timestamp}`, servings: config.peopleCount }
          : undefined,
      }
    }));

    return parsed as MealPlanResponse;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export interface MealWithSidesForShopping extends Meal {
  sides?: SideDish[];
}

export const generateShoppingListFromFavorites = async (
  meals: MealWithSidesForShopping[],
  peopleCount: number,
  pantryItems: PantryItem[]
): Promise<MealPlanResponse> => {
    // Use Edge Functions in production when configured
    if (USE_EDGE_FUNCTIONS && isSupabaseConfigured()) {
      return generateShoppingListViaEdge(meals, peopleCount, pantryItems);
    }

    // Fall back to client-side API call
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key is missing.");

    const ai = new GoogleGenAI({ apiKey });

    // Build detailed meal info including side dishes
    const mealDescriptions = meals.map(m => {
      let desc = `${m.name}`;
      if (m.sides && m.sides.length > 0) {
        const sideNames = m.sides.map(s => s.name).join(', ');
        desc += ` (with sides: ${sideNames})`;
      }
      return desc;
    }).join("; ");

    // Collect all ingredients from both main meals and sides
    const allIngredients: string[] = [];
    meals.forEach(m => {
      allIngredients.push(...m.ingredients);
      if (m.sides) {
        m.sides.forEach(side => {
          allIngredients.push(...side.ingredients);
        });
      }
    });

    const pantryListString = pantryItems.map((p) => p.name).join(", ");

    const prompt = `Generate a shopping list for these meals: ${mealDescriptions}.
${peopleCount} people.
Known ingredients needed: ${allIngredients.slice(0, 50).join(", ")}${allIngredients.length > 50 ? '...' : ''}.
Exclude pantry items: ${pantryListString || "none"}.
IMPORTANT: Include all ingredients from both main dishes AND their side dishes.
Return weeklyPlan with meals on Day 1, Day 2, etc.`;

    try {
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          },
        });

        if (!response.text) {
          throw new Error('Empty response from AI model');
        }

        const parsed = JSON.parse(response.text);

        // Validate response structure
        if (!parsed.weeklyPlan || !Array.isArray(parsed.weeklyPlan)) {
          throw new Error('Invalid response structure: missing weeklyPlan');
        }
        if (!parsed.shoppingList || !Array.isArray(parsed.shoppingList)) {
          throw new Error('Invalid response structure: missing shoppingList');
        }

        return parsed as MealPlanResponse;
      } catch (error) {
        console.error("Gemini Error:", error);
        throw error;
      }
};

export const generateDishImage = async (mealName: string, description: string): Promise<string | null> => {
  // Use Edge Functions in production when configured
  if (USE_EDGE_FUNCTIONS && isSupabaseConfigured()) {
    try {
      return await generateDishImageViaEdge(mealName, description);
    } catch (e) {
      console.error("Failed to generate image via Edge Function", e);
      return null;
    }
  }

  // Fall back to client-side API call (development only)
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A high-end food magazine photo of a complete meal: ${mealName}. The image should show the main dish alongside its side dishes as described: ${description}. Warm, appetizing lighting, table setting.

IMPORTANT: Only show ingredients and components that are explicitly part of this specific recipe. Do NOT add garnishes, sides, or ingredients that are not mentioned in the description. The image must accurately represent ONLY what is in the actual recipe - no extra vegetables, sauces, or toppings that weren't specified.` }],
      },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Failed to generate image", e);
    return null;
  }
};

/**
 * Edit/regenerate a dish image with custom instructions
 * Allows users to specify changes like "make it more colorful" or "show it plated on a white dish"
 */
export const editDishImage = async (
  mealName: string,
  description: string,
  editInstructions: string
): Promise<string | null> => {
  // Use Edge Functions in production when configured
  if (USE_EDGE_FUNCTIONS && isSupabaseConfigured()) {
    try {
      return await generateDishImageViaEdge(mealName, description, editInstructions);
    } catch (e) {
      console.error("Failed to edit image via Edge Function", e);
      return null;
    }
  }

  // Fall back to client-side API call (development only)
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{
          text: `A high-end food magazine photo of: ${mealName}.
Description: ${description}

Special instructions for this image: ${editInstructions}

Create an appetizing, professional food photograph following these instructions.

IMPORTANT: Only show ingredients and components that are explicitly part of this specific recipe as described above. Do NOT add garnishes, sides, or ingredients that are not mentioned in the description. The image must accurately represent ONLY what is in the actual recipe - no extra vegetables, sauces, or toppings that weren't specified.`
        }],
      },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Failed to edit image", e);
    return null;
  }
};

// ============================================
// RECIPE EXTRACTION & TAGGING FUNCTIONS
// ============================================

// Schema for auto-tagging response
const autoTagSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Relevant tags from the predefined list"
    },
    cuisineType: { type: Type.STRING, description: "Primary cuisine type" },
    difficulty: {
      type: Type.STRING,
      description: "Recipe difficulty level"
    }
  },
  required: ["tags", "cuisineType", "difficulty"]
};

// Schema for recipe extraction
const extractedRecipeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Name of the dish" },
    description: { type: Type.STRING, description: "Brief description of the dish" },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of ingredients with quantities"
    },
    instructions: { type: Type.STRING, description: "Step-by-step cooking instructions" },
    suggestedTags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Suggested tags for this recipe"
    }
  },
  required: ["name", "description", "ingredients", "instructions"]
};

/**
 * Auto-tag a recipe using AI via Edge Function
 */
const autoTagRecipeViaEdge = async (recipe: { name: string; description: string; ingredients: string[] }): Promise<{
  tags: string[];
  cuisineType: string;
  difficulty: string;
}> => {
  const { data, error } = await invokeWithAuth('auto-tag-recipe', { recipe });

  if (error) {
    console.error('Edge Function error:', error);
    // Return empty tags on error - don't block the save
    return { tags: [], cuisineType: 'Other', difficulty: 'Medium' };
  }

  return data as { tags: string[]; cuisineType: string; difficulty: string };
};

/**
 * Auto-tag a recipe using AI
 * Called for ALL recipes (both generated and uploaded)
 */
export const autoTagRecipe = async (recipe: { name: string; description: string; ingredients: string[] }): Promise<{
  tags: string[];
  cuisineType: string;
  difficulty: string;
}> => {
  // Use Edge Function in production
  if (USE_EDGE_FUNCTIONS && isSupabaseConfigured()) {
    return await autoTagRecipeViaEdge(recipe);
  }

  // Fall back to client-side for development only
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Analyze this recipe and assign relevant tags from the predefined list.

Recipe Name: ${recipe.name}
Description: ${recipe.description}
Ingredients: ${recipe.ingredients.join(", ")}

Available tags (ONLY use tags from this list):
- Cuisine: ${TAG_CATEGORIES.cuisine.join(", ")}
- Dietary: ${TAG_CATEGORIES.dietary.join(", ")}
- Meal Type: ${TAG_CATEGORIES.mealType.join(", ")}
- Other: ${TAG_CATEGORIES.other.join(", ")}

Select 3-6 most relevant tags. Determine the primary cuisine type and difficulty level (Easy, Medium, or Hard).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: autoTagSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from AI model');
    }

    const parsed = JSON.parse(response.text);

    // Filter to only include valid tags from our predefined list
    const validTags = parsed.tags.filter((tag: string) =>
      ALL_TAGS.some(t => t.toLowerCase() === tag.toLowerCase())
    );

    return {
      tags: validTags,
      cuisineType: parsed.cuisineType || 'Other',
      difficulty: parsed.difficulty || 'Medium'
    };
  } catch (error) {
    console.error("Auto-tag error:", error);
    // Return empty tags on error - don't block the save
    return { tags: [], cuisineType: 'Other', difficulty: 'Medium' };
  }
};

/**
 * Extract recipe via Edge Function - handles text, image, PDF, and URL
 */
const extractRecipeViaEdge = async (
  type: 'text' | 'image' | 'pdf' | 'url',
  payload: {
    textContent?: string;
    images?: { base64: string; mimeType: string }[];
    pdfBase64?: string;
    url?: string;
  }
): Promise<ExtractedRecipe> => {
  // Get admin instructions to pass to Edge Function
  const adminInstructions = await getInstructionsByTag('recipe_generation');

  const { data, error } = await invokeWithAuth('extract-recipe', {
    type,
    ...payload,
    adminInstructions,
  });

  if (error) {
    console.error('Edge Function error:', error);
    throw new Error(error.message || 'Failed to extract recipe');
  }

  if (!data) {
    throw new Error('No data returned from Edge Function');
  }

  return data as ExtractedRecipe;
};

/**
 * Extract recipe from pasted text using AI
 */
export const extractRecipeFromText = async (textContent: string): Promise<ExtractedRecipe> => {
  // Use Edge Function in production
  if (USE_EDGE_FUNCTIONS && isSupabaseConfigured()) {
    return await extractRecipeViaEdge('text', { textContent });
  }

  // Fall back to client-side for development only
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  // Get admin instructions for recipe generation
  const adminInstructions = await getInstructionsByTag('recipe_generation');
  const adminInstructionsText = adminInstructions.length > 0
    ? `\n\nADDITIONAL INSTRUCTIONS:\n${adminInstructions.join('\n')}`
    : '';

  const prompt = `Extract the recipe information from the following text. If the text contains multiple recipes, extract only the first/main one.

Text:
${textContent}

Extract the recipe name, a brief description, ingredients (with quantities), and step-by-step instructions. Also suggest relevant tags from: ${ALL_TAGS.join(", ")}${adminInstructionsText}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: extractedRecipeSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from AI model');
    }

    return JSON.parse(response.text) as ExtractedRecipe;
  } catch (error) {
    console.error("Recipe extraction error:", error);
    throw new Error("Failed to extract recipe from text");
  }
};

/**
 * Extract recipe from one or more images (photo of recipe card, cookbook page, screenshot)
 * Supports multi-page recipes by accepting an array of images
 */
export const extractRecipeFromImage = async (
  images: { base64: string; mimeType: string }[]
): Promise<ExtractedRecipe> => {
  // Use Edge Function in production
  if (USE_EDGE_FUNCTIONS && isSupabaseConfigured()) {
    return await extractRecipeViaEdge('image', { images });
  }

  // Fall back to client-side for development only
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  // Get admin instructions for recipe generation
  const adminInstructions = await getInstructionsByTag('recipe_generation');
  const adminInstructionsText = adminInstructions.length > 0
    ? `\n\nADDITIONAL INSTRUCTIONS:\n${adminInstructions.join('\n')}`
    : '';

  // Build content array with all images
  const contents: any[] = images.map((img, index) => ({
    inlineData: {
      mimeType: img.mimeType,
      data: img.base64,
    },
  }));

  // Add the extraction prompt at the end
  const isMultiPage = images.length > 1;
  contents.push({
    text: `Extract the recipe from ${isMultiPage ? 'these images (they form a multi-page recipe - combine all content into a single recipe)' : 'this image'}. Return the recipe name, a brief description, ingredients list (with quantities), and step-by-step instructions. Also suggest relevant tags from: ${ALL_TAGS.join(", ")}
${isMultiPage ? '\nIMPORTANT: These images show different pages of the SAME recipe. Combine all ingredients and instructions into a single complete recipe.' : ''}
Return as JSON with fields: name, description, ingredients (array of strings), instructions (string), suggestedTags (array of strings).${adminInstructionsText}`
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: extractedRecipeSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from AI model');
    }

    return JSON.parse(response.text) as ExtractedRecipe;
  } catch (error) {
    console.error("Image recipe extraction error:", error);
    throw new Error("Failed to extract recipe from image");
  }
};

/**
 * Extract recipe from a PDF document
 * Uses Gemini's vision capabilities to read PDF pages
 */
export const extractRecipeFromPDF = async (base64Data: string): Promise<ExtractedRecipe> => {
  // Use Edge Function in production
  if (USE_EDGE_FUNCTIONS && isSupabaseConfigured()) {
    return await extractRecipeViaEdge('pdf', { pdfBase64: base64Data });
  }

  // Fall back to client-side for development only
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  // Get admin instructions for recipe generation
  const adminInstructions = await getInstructionsByTag('recipe_generation');
  const adminInstructionsText = adminInstructions.length > 0
    ? `\n\nADDITIONAL INSTRUCTIONS:\n${adminInstructions.join('\n')}`
    : '';

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data,
          },
        },
        {
          text: `Extract the recipe from this PDF document. If there are multiple recipes, extract only the first/main one. Return the recipe name, a brief description, ingredients list (with quantities), and step-by-step instructions. Also suggest relevant tags from: ${ALL_TAGS.join(", ")}

Return as JSON with fields: name, description, ingredients (array of strings), instructions (string), suggestedTags (array of strings).${adminInstructionsText}`
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: extractedRecipeSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from AI model');
    }

    return JSON.parse(response.text) as ExtractedRecipe;
  } catch (error) {
    console.error("PDF recipe extraction error:", error);
    throw new Error("Failed to extract recipe from PDF");
  }
};

/**
 * Fetch webpage content and extract recipe using AI
 * Uses a CORS proxy or server-side fetch to get the HTML content
 */
export const extractRecipeFromURL = async (url: string): Promise<ExtractedRecipe> => {
  // Validate URL first
  try {
    new URL(url);
  } catch {
    throw new Error("Invalid URL provided");
  }

  // Use Edge Function in production
  if (USE_EDGE_FUNCTIONS && isSupabaseConfigured()) {
    return await extractRecipeViaEdge('url', { url });
  }

  // Fall back to client-side for development only
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  // Fetch the webpage content using a CORS proxy
  // Using allorigins.win as a public CORS proxy
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
    throw new Error("Failed to fetch the webpage. The site may be blocking access.");
  }

  // Get admin instructions for recipe generation
  const adminInstructions = await getInstructionsByTag('recipe_generation');
  const adminInstructionsText = adminInstructions.length > 0
    ? `\n\nADDITIONAL INSTRUCTIONS:\n${adminInstructions.join('\n')}`
    : '';

  // Use AI to extract the recipe from the HTML content
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: extractedRecipeSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from AI model');
    }

    const extracted = JSON.parse(response.text) as ExtractedRecipe;

    // Check if extraction failed
    if (extracted.name.toLowerCase().includes('error') ||
        extracted.name.toLowerCase().includes('no recipe') ||
        extracted.ingredients.length === 0) {
      throw new Error("No recipe found on this page");
    }

    return extracted;
  } catch (error) {
    console.error("URL recipe extraction error:", error);
    if (error instanceof Error && error.message.includes("No recipe")) {
      throw error;
    }
    throw new Error("Failed to extract recipe from URL");
  }
};

// Schema for single recipe generation
const singleRecipeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Full name of the dish" },
    description: { type: Type.STRING, description: "Appetizing description of the dish" },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of ingredients with quantities"
    },
    instructions: { type: Type.STRING, description: "Step-by-step cooking instructions" },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Relevant tags for this recipe"
    }
  },
  required: ["name", "description", "ingredients", "instructions"]
};

/**
 * Generate a single recipe via Edge Function
 */
const generateSingleRecipeViaEdge = async (
  recipeDescription: string,
  preferences: UserPreferences,
  pantryItems: PantryItem[],
  peopleCount: number,
  useWhatIHave: boolean,
  macroTargets?: { calories: number; protein: number; carbohydrates: number; fat: number },
  meatServingGrams?: number
): Promise<Meal> => {
  const { data, error } = await invokeWithAuth('generate-recipe', {
    recipeDescription,
    preferences,
    pantryItems,
    peopleCount,
    useWhatIHave,
    macroTargets,
    meatServingGrams
  });

  if (error) {
    console.error('Edge Function error:', error);
    throw new Error(error.message || 'Failed to generate recipe');
  }

  if (!data) {
    throw new Error('No data returned from Edge Function');
  }

  // Ensure the response has the expected structure
  const meal: Meal = {
    id: data.id || `single-${Date.now()}`,
    name: data.name,
    description: data.description,
    ingredients: data.ingredients,
    instructions: data.instructions,
    tags: data.tags || [],
    source: 'generated',
    servings: data.servings || peopleCount,
  };

  return meal;
};

/**
 * Generate a single recipe based on user description
 * Uses pantry items and preferences like the meal planner
 */
export const generateSingleRecipe = async (
  recipeDescription: string,
  preferences: UserPreferences,
  pantryItems: PantryItem[],
  peopleCount: number = 2,
  useWhatIHave: boolean = false,
  userCountry?: CountryCode | null,
  macroTargets?: { calories: number; protein: number; carbohydrates: number; fat: number },
  meatServingGrams?: number
): Promise<Meal> => {
  // Use Edge Functions in production when configured
  if (USE_EDGE_FUNCTIONS && isSupabaseConfigured()) {
    return generateSingleRecipeViaEdge(
      recipeDescription,
      preferences,
      pantryItems,
      peopleCount,
      useWhatIHave,
      macroTargets,
      meatServingGrams
    );
  }

  // Fall back to client-side API call (development only)
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  const pantryListString = pantryItems.map((p) => p.name).join(", ");

  // Build mode-specific instructions
  const useWhatIHaveMode = useWhatIHave && pantryItems.length > 0;
  const pantryInstructions = useWhatIHaveMode
    ? `PRIORITY MODE - USE WHAT I HAVE:
You MUST create this recipe using primarily these available ingredients: ${pantryListString}.
The recipe should maximize use of these items while still matching the user's request.
Only include additional ingredients that are absolutely necessary to complete the dish.
Goal: minimize extra shopping and reduce food waste.`
    : `Available pantry items to use: ${pantryListString || "none specified"}`;

  // Build localization instruction based on user's country
  const localizationText = getLocalizationInstruction(userCountry || null);
  const localizationInstruction = localizationText ? `\n${localizationText}` : '';

  // Build excluded ingredients instruction
  const excludedIngredients = preferences.excludedIngredients || [];
  const exclusionsInstruction = excludedIngredients.length > 0
    ? `\nCRITICAL - NEVER USE THESE INGREDIENTS (allergies/exclusions): ${excludedIngredients.map(e => e.name).join(', ')}.`
    : '';

  // Build meat portion instruction
  const meatPortionInstruction = meatServingGrams
    ? `\nMeat portion size: approximately ${meatServingGrams}g per person (total ${meatServingGrams * peopleCount}g for ${peopleCount} people).`
    : '';

  // Build macro targets instruction
  const macroInstruction = macroTargets
    ? `\nNUTRITION TARGETS (per serving): Aim for approximately ${macroTargets.calories} calories, ${macroTargets.protein}g protein, ${macroTargets.carbohydrates}g carbs, ${macroTargets.fat}g fat. Design the recipe to meet these nutritional goals.`
    : '';

  const prompt = `Create a detailed recipe based on this request: "${recipeDescription}"

For ${peopleCount} people.
Dietary requirements: ${preferences.dietaryRestrictions || "None"}
Likes: ${preferences.likes || "Any"}
Dislikes: ${preferences.dislikes || "None"}${exclusionsInstruction}${meatPortionInstruction}${macroInstruction}
Units: ${preferences.unitSystem}
Temperature: ${preferences.temperatureScale}${localizationInstruction}

${pantryInstructions}

Create a complete, delicious recipe with:
- A descriptive name
- An appetizing description
- Full ingredients list with exact quantities for ${peopleCount} people
- Clear step-by-step cooking instructions

Also assign 3-5 relevant tags from: ${ALL_TAGS.join(", ")}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: singleRecipeSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from AI model');
    }

    const parsed = JSON.parse(response.text);

    // Create a Meal object with unique ID and servings
    const meal: Meal = {
      id: `single-${Date.now()}`,
      name: parsed.name,
      description: parsed.description,
      ingredients: parsed.ingredients,
      instructions: parsed.instructions,
      tags: parsed.tags || [],
      source: 'generated',
      servings: peopleCount, // Store the servings count
    };

    return meal;
  } catch (error) {
    console.error("Single recipe generation error:", error);
    throw new Error("Failed to generate recipe");
  }
};

// ============================================
// PANTRY SCANNING FROM IMAGES
// ============================================

// Schema for pantry item extraction from images
const pantryItemsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of identified food items and ingredients"
    },
    categories: {
      type: Type.OBJECT,
      properties: {
        produce: { type: Type.ARRAY, items: { type: Type.STRING } },
        dairy: { type: Type.ARRAY, items: { type: Type.STRING } },
        meat: { type: Type.ARRAY, items: { type: Type.STRING } },
        pantryStaples: { type: Type.ARRAY, items: { type: Type.STRING } },
        frozen: { type: Type.ARRAY, items: { type: Type.STRING } },
        beverages: { type: Type.ARRAY, items: { type: Type.STRING } },
        condiments: { type: Type.ARRAY, items: { type: Type.STRING } },
        other: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    }
  },
  required: ["items"]
};

// ScannedPantryResult is now imported from types.ts

/**
 * Analyze images of pantry/fridge/freezer to identify available ingredients
 * Accepts multiple images for comprehensive scanning
 * Applies admin-managed instructions for pantry scanning
 */
export const scanPantryFromImages = async (
  images: { base64: string; mimeType: string }[]
): Promise<ScannedPantryResult> => {
  // Use Edge Functions in production when configured
  if (USE_EDGE_FUNCTIONS && isSupabaseConfigured()) {
    return scanPantryViaEdge('images', { images });
  }

  // Fall back to client-side API call (development only)
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  // Fetch admin instructions for pantry scanning
  const adminInstructions = await getInstructionsByTag('pantry_scanning');

  // Build the base prompt
  const basePrompt = `Analyze these images of a pantry, refrigerator, freezer, or kitchen counter with ingredients.

Identify ALL visible food items, ingredients, and cooking supplies. Be thorough and specific.

For each item:
- Use common names (e.g., "eggs" not "chicken eggs")
- Include quantities if clearly visible (e.g., "milk (1 gallon)")
- Note if items appear fresh, frozen, or packaged

Group items into categories:
- Produce (fruits, vegetables)
- Dairy (milk, cheese, yogurt, butter)
- Meat & Seafood (fresh or frozen)
- Pantry Staples (flour, sugar, rice, pasta, canned goods, spices)
- Frozen items
- Beverages
- Condiments & Sauces
- Other

Return all identified items as a flat list in "items" and categorized in "categories".`;

  // Apply admin instructions to the prompt
  const finalPrompt = buildPromptWithInstructions(basePrompt, adminInstructions);

  // Build content array with all images
  const contents: any[] = images.map(img => ({
    inlineData: {
      mimeType: img.mimeType,
      data: img.base64,
    },
  }));

  // Add the prompt at the end
  contents.push({ text: finalPrompt });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: pantryItemsSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from AI model');
    }

    return JSON.parse(response.text) as ScannedPantryResult;
  } catch (error) {
    console.error("Pantry scanning error:", error);
    throw new Error("Failed to analyze pantry images");
  }
};

/**
 * Analyze video of pantry/fridge/freezer to identify available ingredients
 * Extracts frames from video and sends to AI for analysis
 * Applies admin-managed instructions for pantry scanning
 */
export const scanPantryFromVideo = async (
  videoBlob: Blob
): Promise<ScannedPantryResult> => {
  // Use Edge Functions in production when configured
  if (USE_EDGE_FUNCTIONS && isSupabaseConfigured()) {
    const base64Video = await blobToBase64(videoBlob);
    const mimeType = videoBlob.type || 'video/webm';
    return scanPantryViaEdge('video', { video: { base64: base64Video, mimeType } });
  }

  // Fall back to client-side API call (development only)
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  // Fetch admin instructions for pantry scanning
  const adminInstructions = await getInstructionsByTag('pantry_scanning');

  // Build the base prompt
  const basePrompt = `Analyze this video of a pantry, refrigerator, freezer, or kitchen counter with ingredients.

Identify ALL visible food items, ingredients, and cooking supplies throughout the video. Be thorough and specific.

For each item:
- Use common names (e.g., "eggs" not "chicken eggs")
- Include quantities if clearly visible (e.g., "milk (1 gallon)")
- Note if items appear fresh, frozen, or packaged

Group items into categories:
- Produce (fruits, vegetables)
- Dairy (milk, cheese, yogurt, butter)
- Meat & Seafood (fresh or frozen)
- Pantry Staples (flour, sugar, rice, pasta, canned goods, spices)
- Frozen items
- Beverages
- Condiments & Sauces
- Other

Return all identified items as a flat list in "items" and categorized in "categories".`;

  // Apply admin instructions to the prompt
  const finalPrompt = buildPromptWithInstructions(basePrompt, adminInstructions);

  // Convert video blob to base64
  const base64Video = await blobToBase64(videoBlob);
  const mimeType = videoBlob.type || 'video/webm';

  // Build content array with video
  const contents: any[] = [
    {
      inlineData: {
        mimeType: mimeType,
        data: base64Video,
      },
    },
    { text: finalPrompt },
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: pantryItemsSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from AI model');
    }

    return JSON.parse(response.text) as ScannedPantryResult;
  } catch (error) {
    console.error("Video pantry scanning error:", error);
    throw new Error("Failed to analyze pantry video");
  }
};

/**
 * Analyze audio transcription for pantry items
 * User verbally lists items in their pantry
 * Applies admin-managed instructions for pantry scanning
 */
export const scanPantryFromAudio = async (
  audioBlob: Blob
): Promise<ScannedPantryResult> => {
  // Use Edge Functions in production when configured
  if (USE_EDGE_FUNCTIONS && isSupabaseConfigured()) {
    const base64Audio = await blobToBase64(audioBlob);
    const mimeType = audioBlob.type || 'audio/webm';
    return scanPantryViaEdge('audio', { audio: { base64: base64Audio, mimeType } });
  }

  // Fall back to client-side API call (development only)
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  // Fetch admin instructions for pantry scanning
  const adminInstructions = await getInstructionsByTag('pantry_scanning');

  // Build the base prompt
  const basePrompt = `Listen to this audio recording of someone listing items in their pantry, refrigerator, or kitchen.

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

  // Apply admin instructions to the prompt
  const finalPrompt = buildPromptWithInstructions(basePrompt, adminInstructions);

  // Convert audio blob to base64
  const base64Audio = await blobToBase64(audioBlob);
  const mimeType = audioBlob.type || 'audio/webm';

  // Build content array with audio
  const contents: any[] = [
    {
      inlineData: {
        mimeType: mimeType,
        data: base64Audio,
      },
    },
    { text: finalPrompt },
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: pantryItemsSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from AI model');
    }

    return JSON.parse(response.text) as ScannedPantryResult;
  } catch (error) {
    console.error("Audio pantry scanning error:", error);
    throw new Error("Failed to analyze pantry audio");
  }
};

/**
 * Parse live dictation text for pantry items
 * Uses Web Speech API transcription text for real-time item extraction
 * Applies admin-managed instructions for pantry scanning
 */
export const parseDictationForPantryItems = async (
  transcriptionText: string
): Promise<ScannedPantryResult> => {
  // Use Edge Functions in production when configured
  if (USE_EDGE_FUNCTIONS && isSupabaseConfigured()) {
    return scanPantryViaEdge('dictation', { dictationText: transcriptionText });
  }

  // Fall back to client-side API call (development only)
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  // Fetch admin instructions for pantry scanning
  const adminInstructions = await getInstructionsByTag('pantry_scanning');

  // Build the base prompt
  const basePrompt = `Parse this transcription of someone listing items in their pantry, refrigerator, or kitchen:

"${transcriptionText}"

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

  // Apply admin instructions to the prompt
  const finalPrompt = buildPromptWithInstructions(basePrompt, adminInstructions);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ text: finalPrompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: pantryItemsSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from AI model');
    }

    return JSON.parse(response.text) as ScannedPantryResult;
  } catch (error) {
    console.error("Dictation parsing error:", error);
    throw new Error("Failed to parse dictation for pantry items");
  }
};

/**
 * Helper function to convert Blob to base64 string
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Remove the data URL prefix (e.g., "data:video/webm;base64,")
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// ============================================
// NUTRITIONAL INFORMATION
// ============================================

// Schema for nutritional information
const nutritionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    servingSize: { type: Type.STRING, description: "Serving size description" },
    servingsPerRecipe: { type: Type.NUMBER, description: "Number of servings the recipe makes" },
    calories: { type: Type.NUMBER, description: "Calories per serving" },
    macros: {
      type: Type.OBJECT,
      properties: {
        protein: { type: Type.NUMBER, description: "Protein in grams" },
        carbohydrates: { type: Type.NUMBER, description: "Carbohydrates in grams" },
        fat: { type: Type.NUMBER, description: "Total fat in grams" },
        fiber: { type: Type.NUMBER, description: "Fiber in grams" },
        sugar: { type: Type.NUMBER, description: "Sugar in grams" },
        saturatedFat: { type: Type.NUMBER, description: "Saturated fat in grams" }
      },
      required: ["protein", "carbohydrates", "fat"]
    },
    micros: {
      type: Type.OBJECT,
      properties: {
        sodium: { type: Type.NUMBER, description: "Sodium in mg" },
        cholesterol: { type: Type.NUMBER, description: "Cholesterol in mg" },
        potassium: { type: Type.NUMBER, description: "Potassium in mg" },
        vitaminA: { type: Type.NUMBER, description: "Vitamin A as % daily value" },
        vitaminC: { type: Type.NUMBER, description: "Vitamin C as % daily value" },
        calcium: { type: Type.NUMBER, description: "Calcium as % daily value" },
        iron: { type: Type.NUMBER, description: "Iron as % daily value" }
      }
    },
    healthNotes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Brief health notes about the dish"
    }
  },
  required: ["calories", "macros", "servingSize", "servingsPerRecipe"]
};

export interface NutritionInfo {
  servingSize: string;
  servingsPerRecipe: number;
  calories: number;
  macros: {
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    saturatedFat?: number;
  };
  micros?: {
    sodium?: number;
    cholesterol?: number;
    potassium?: number;
    vitaminA?: number;
    vitaminC?: number;
    calcium?: number;
    iron?: number;
  };
  healthNotes?: string[];
}

// Schema for recipe adjustment
const adjustedRecipeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Recipe name (may be updated if significantly changed)" },
    description: { type: Type.STRING, description: "Updated description" },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Adjusted ingredients with quantities"
    },
    instructions: { type: Type.STRING, description: "Updated cooking instructions with adjusted times" },
    servings: { type: Type.NUMBER, description: "New number of servings" },
    adjustmentNotes: { type: Type.STRING, description: "Brief explanation of what was changed" }
  },
  required: ["name", "description", "ingredients", "instructions", "servings", "adjustmentNotes"]
};

export interface AdjustedRecipe {
  name: string;
  description: string;
  ingredients: string[];
  instructions: string;
  servings: number;
  adjustmentNotes: string;
}

export type RecipeAdjustmentType =
  | { type: 'servings'; targetServings: number }
  | { type: 'protein'; adjustment: 'increase' | 'decrease'; targetGrams?: number }
  | { type: 'macros'; targetCalories?: number; targetProtein?: number; targetCarbs?: number; targetFat?: number }
  | { type: 'custom'; instructions: string };

/**
 * Adjust recipe via Edge Function
 */
const adjustRecipeViaEdge = async (
  recipe: Meal,
  adjustment: RecipeAdjustmentType,
  preferences?: UserPreferences
): Promise<AdjustedRecipe> => {
  const { data, error } = await invokeWithAuth('adjust-recipe', {
    recipe,
    adjustment,
    preferences,
  });

  if (error) {
    console.error('Edge Function error:', error);
    throw new Error(error.message || 'Failed to adjust recipe');
  }

  if (!data) {
    throw new Error('No data returned from Edge Function');
  }

  return data as AdjustedRecipe;
};

/**
 * Adjust a recipe based on user requirements
 * Can modify servings, protein content, or retarget macros
 */
export const adjustRecipe = async (
  recipe: Meal,
  adjustment: RecipeAdjustmentType,
  preferences?: UserPreferences
): Promise<AdjustedRecipe> => {
  // Use Edge Function in production
  if (USE_EDGE_FUNCTIONS && isSupabaseConfigured()) {
    return await adjustRecipeViaEdge(recipe, adjustment, preferences);
  }

  // Fall back to client-side for development only
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  let adjustmentPrompt = '';

  switch (adjustment.type) {
    case 'servings':
      adjustmentPrompt = `Adjust this recipe from ${recipe.servings || 4} servings to ${adjustment.targetServings} servings.
Scale ALL ingredient quantities proportionally.
Adjust cooking times if necessary (e.g., larger batches may need more time).
Keep the same cooking method and techniques.`;
      break;

    case 'protein':
      if (adjustment.targetGrams) {
        adjustmentPrompt = `Adjust this recipe to have approximately ${adjustment.targetGrams}g of protein per serving.
${adjustment.adjustment === 'increase' ? 'Add more protein sources or increase existing protein ingredients.' : 'Reduce protein ingredients.'}
Maintain the overall flavor profile and dish concept.
Adjust other ingredients as needed for balance.`;
      } else {
        adjustmentPrompt = `${adjustment.adjustment === 'increase' ? 'Increase' : 'Decrease'} the protein content of this recipe significantly.
${adjustment.adjustment === 'increase' ? 'Add more protein sources (meat, legumes, eggs, dairy, etc.) or increase existing protein ingredients.' : 'Reduce protein-heavy ingredients while maintaining flavor.'}
Adjust cooking times and other ingredients as needed.`;
      }
      break;

    case 'macros':
      const targets = [];
      if (adjustment.targetCalories) targets.push(`~${adjustment.targetCalories} calories per serving`);
      if (adjustment.targetProtein) targets.push(`~${adjustment.targetProtein}g protein per serving`);
      if (adjustment.targetCarbs) targets.push(`~${adjustment.targetCarbs}g carbohydrates per serving`);
      if (adjustment.targetFat) targets.push(`~${adjustment.targetFat}g fat per serving`);

      adjustmentPrompt = `Adjust this recipe to meet these nutritional targets per serving:
${targets.join('\n')}

Modify ingredients and portions to achieve these targets while:
- Maintaining the dish's core concept and flavor profile
- Keeping it practical and delicious
- Using substitutions where beneficial (e.g., lean meat, low-fat alternatives, more vegetables)`;
      break;

    case 'custom':
      adjustmentPrompt = adjustment.instructions;
      break;
  }

  const unitSystem = preferences?.unitSystem || 'metric';
  const tempScale = preferences?.temperatureScale || 'celsius';

  const prompt = `Adjust this recipe according to the instructions below.

ORIGINAL RECIPE:
Name: ${recipe.name}
Description: ${recipe.description}
Current servings: ${recipe.servings || 4}
Ingredients:
${recipe.ingredients.map(i => `- ${i}`).join('\n')}

Instructions:
${recipe.instructions}

ADJUSTMENT REQUEST:
${adjustmentPrompt}

REQUIREMENTS:
- Use ${unitSystem} units for measurements
- Use ${tempScale} for temperatures
- Keep instructions clear and practical
- Adjust cooking times appropriately
- Provide a brief note explaining the main changes made

Return the fully adjusted recipe.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: adjustedRecipeSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from AI model');
    }

    return JSON.parse(response.text) as AdjustedRecipe;
  } catch (error) {
    console.error("Recipe adjustment error:", error);
    throw new Error("Failed to adjust recipe");
  }
};

/**
 * Calculate nutritional information for a recipe via Edge Function
 */
const calculateNutritionViaEdge = async (
  recipeName: string,
  ingredients: string[],
  servings: number = 1
): Promise<NutritionInfo> => {
  const { data, error } = await invokeWithAuth('calculate-nutrition', {
    recipeName,
    ingredients,
    servings,
  });

  if (error) {
    console.error('Edge Function error:', error);
    throw new Error(error.message || 'Failed to calculate nutrition');
  }

  if (!data) {
    throw new Error('No data returned from Edge Function');
  }

  return data as NutritionInfo;
};

/**
 * Calculate nutritional information for a recipe
 * Analyzes ingredients to estimate macros and other nutritional data
 */
export const calculateNutrition = async (
  recipeName: string,
  ingredients: string[],
  servings: number = 1
): Promise<NutritionInfo> => {
  // Always use Edge Function in production
  if (USE_EDGE_FUNCTIONS && isSupabaseConfigured()) {
    return await calculateNutritionViaEdge(recipeName, ingredients, servings);
  }

  // Fall back to client-side for development only
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Calculate the nutritional information for this recipe:

Recipe: ${recipeName}
Total servings the recipe makes: ${servings}

Ingredients (quantities are for the ENTIRE recipe, not per serving):
${ingredients.map(i => `- ${i}`).join('\n')}

IMPORTANT: The ingredient quantities above are for the COMPLETE recipe (${servings} servings total).
Calculate and return nutritional values PER SINGLE SERVING by dividing the total by ${servings}.

Include:
- Calories per serving
- Macronutrients per serving (protein, carbs, fat, fiber, sugar, saturated fat in grams)
- Key micronutrients per serving (sodium, cholesterol, potassium in mg; vitamins A & C, calcium, iron as % daily value)
- 2-3 brief health notes about this dish
- Set servingsPerRecipe to ${servings}

Use standard nutritional databases as reference. All values MUST be per single serving, not for the whole recipe.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: nutritionSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from AI model');
    }

    return JSON.parse(response.text) as NutritionInfo;
  } catch (error) {
    console.error("Nutrition calculation error:", error);
    throw new Error("Failed to calculate nutritional information");
  }
};