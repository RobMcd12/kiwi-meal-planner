import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserPreferences, PantryItem, MealPlanResponse, MealConfig, Meal, ExtractedRecipe } from "../types";
import { supabase, isSupabaseConfigured } from "./authService";

// Predefined tag categories for AI to choose from
export const TAG_CATEGORIES = {
  cuisine: ['Italian', 'Asian', 'Mexican', 'Indian', 'Mediterranean', 'American', 'French', 'Thai', 'Japanese', 'Chinese', 'Greek', 'Middle Eastern', 'Korean', 'Vietnamese', 'Spanish'],
  dietary: ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Carb', 'Paleo', 'Nut-Free', 'Halal', 'Kosher', 'Low-Sodium', 'Sugar-Free'],
  mealType: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Appetizer', 'Side Dish', 'Beverage'],
  other: ['Quick', 'Easy', 'Budget-Friendly', 'Healthy', 'Comfort Food', 'Spicy', 'Kid-Friendly', 'Meal Prep', 'One-Pot', 'BBQ', 'Slow Cooker', 'Air Fryer']
};

const ALL_TAGS = [...TAG_CATEGORIES.cuisine, ...TAG_CATEGORIES.dietary, ...TAG_CATEGORIES.mealType, ...TAG_CATEGORIES.other];

// Feature flag: Set to true to use Edge Functions (production), false for client-side (development)
const USE_EDGE_FUNCTIONS = false; // Disabled - using client-side Gemini API

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

const generateMealPlanViaEdge = async (
  config: MealConfig,
  preferences: UserPreferences,
  pantryItems: PantryItem[]
): Promise<MealPlanResponse> => {
  const { data, error } = await supabase.functions.invoke('generate-meal-plan', {
    body: { config, preferences, pantryItems },
  });

  if (error) throw error;
  if (!data) throw new Error('No data returned from Edge Function');

  return data as MealPlanResponse;
};

const generateShoppingListViaEdge = async (
  meals: Meal[],
  peopleCount: number,
  pantryItems: PantryItem[]
): Promise<MealPlanResponse> => {
  const { data, error } = await supabase.functions.invoke('generate-shopping-list', {
    body: { meals, peopleCount, pantryItems },
  });

  if (error) throw error;
  if (!data) throw new Error('No data returned from Edge Function');

  return data as MealPlanResponse;
};

// --- Client-Side API Calls (Development) ---

export const generateMealPlan = async (
  config: MealConfig,
  preferences: UserPreferences,
  pantryItems: PantryItem[]
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

  // Concise prompt for faster generation
  const prompt = `${config.days}-day meal plan, ${config.peopleCount} people. Meals: ${requestedMeals.join(", ")} only.
Diet: ${preferences.dietaryRestrictions || "None"}. Likes: ${preferences.likes || "Any"}. Dislikes: ${preferences.dislikes || "None"}.
Units: ${preferences.unitSystem}. Temps: ${preferences.temperatureScale}.
Pantry (exclude from list): ${pantryListString || "none"}.
Each meal = complete dish with sides (e.g. "Grilled Salmon with Rice and Vegetables"). Include all ingredients/instructions for full meal. Shopping list by aisle, quantities for ${config.peopleCount}.`;

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

    // Add IDs to meals for database compatibility
    const timestamp = Date.now();
    parsed.weeklyPlan = parsed.weeklyPlan.map((day: any, dayIdx: number) => ({
      ...day,
      meals: {
        breakfast: day.meals?.breakfast
          ? { ...day.meals.breakfast, id: `${dayIdx}-breakfast-${timestamp}` }
          : undefined,
        lunch: day.meals?.lunch
          ? { ...day.meals.lunch, id: `${dayIdx}-lunch-${timestamp}` }
          : undefined,
        dinner: day.meals?.dinner
          ? { ...day.meals.dinner, id: `${dayIdx}-dinner-${timestamp}` }
          : undefined,
      }
    }));

    return parsed as MealPlanResponse;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const generateShoppingListFromFavorites = async (
  meals: Meal[],
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
    const mealNames = meals.map(m => m.name).join(", ");
    const pantryListString = pantryItems.map((p) => p.name).join(", ");

    const prompt = `Shopping list for meals: ${mealNames}. ${peopleCount} people. Exclude pantry: ${pantryListString || "none"}. Return weeklyPlan with meals on Day 1, Day 2, etc.`;

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
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A high-end food magazine photo of a complete meal: ${mealName}. The image should show the main dish alongside its side dishes as described: ${description}. Warm, appetizing lighting, table setting.` }],
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
 * Auto-tag a recipe using AI
 * Called for ALL recipes (both generated and uploaded)
 */
export const autoTagRecipe = async (recipe: { name: string; description: string; ingredients: string[] }): Promise<{
  tags: string[];
  cuisineType: string;
  difficulty: string;
}> => {
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
 * Extract recipe from pasted text using AI
 */
export const extractRecipeFromText = async (textContent: string): Promise<ExtractedRecipe> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Extract the recipe information from the following text. If the text contains multiple recipes, extract only the first/main one.

Text:
${textContent}

Extract the recipe name, a brief description, ingredients (with quantities), and step-by-step instructions. Also suggest relevant tags from: ${ALL_TAGS.join(", ")}`;

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
 * Extract recipe from an image (photo of recipe card, cookbook page, screenshot)
 */
export const extractRecipeFromImage = async (base64Data: string, mimeType: string): Promise<ExtractedRecipe> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        },
        {
          text: `Extract the recipe from this image. Return the recipe name, a brief description, ingredients list (with quantities), and step-by-step instructions. Also suggest relevant tags from: ${ALL_TAGS.join(", ")}

Return as JSON with fields: name, description, ingredients (array of strings), instructions (string), suggestedTags (array of strings).`
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
    console.error("Image recipe extraction error:", error);
    throw new Error("Failed to extract recipe from image");
  }
};

/**
 * Extract recipe from a PDF document
 * Uses Gemini's vision capabilities to read PDF pages
 */
export const extractRecipeFromPDF = async (base64Data: string): Promise<ExtractedRecipe> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

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

Return as JSON with fields: name, description, ingredients (array of strings), instructions (string), suggestedTags (array of strings).`
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
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error("Invalid URL provided");
  }

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
- suggestedTags: Relevant tags from this list: ${ALL_TAGS.join(", ")}`;

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