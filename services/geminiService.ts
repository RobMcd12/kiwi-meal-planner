import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserPreferences, PantryItem, MealPlanResponse, MealConfig, Meal } from "../types";
import { supabase, isSupabaseConfigured } from "./authService";

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