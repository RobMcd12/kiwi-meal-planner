import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SideDish, Meal } from "../types";
import { supabase } from "./authService";

// Schema for side dish suggestions
const sideDishSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "Unique identifier for this side dish" },
    name: { type: Type.STRING, description: "Name of the side dish" },
    description: { type: Type.STRING, description: "Brief description of the side dish" },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of ingredients with quantities"
    },
    instructions: { type: Type.STRING, description: "Cooking instructions" },
    prepTime: { type: Type.STRING, description: "Preparation and cooking time (e.g., '15 minutes')" },
    servings: { type: Type.NUMBER, description: "Number of servings" }
  },
  required: ["id", "name", "description", "ingredients", "instructions"]
};

const suggestSidesResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      items: sideDishSchema,
      description: "Array of 3-4 suggested side dishes"
    }
  },
  required: ["suggestions"]
};

/**
 * Generate AI-powered side dish suggestions for a recipe
 */
export const suggestSideDishes = async (
  meal: Meal,
  preferences?: { dietary?: string; dislikes?: string }
): Promise<SideDish[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  const dietaryInfo = preferences?.dietary ? `Dietary restrictions: ${preferences.dietary}.` : '';
  const dislikesInfo = preferences?.dislikes ? `Avoid: ${preferences.dislikes}.` : '';

  const prompt = `Suggest 4 complementary side dishes for this main dish:

Main Dish: ${meal.name}
Description: ${meal.description}
Main Ingredients: ${meal.ingredients.slice(0, 5).join(', ')}

${dietaryInfo}
${dislikesInfo}

Requirements:
- Suggest 4 different side dishes that pair well with this main dish
- Include a variety: vegetable, starch/grain, salad, and one creative option
- Each side should be quick to prepare (15-30 minutes)
- Include complete ingredient lists with quantities for 4 servings
- Provide clear, concise cooking instructions
- Consider flavor profiles, textures, and nutritional balance`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: suggestSidesResponseSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from AI model');
    }

    const parsed = JSON.parse(response.text);

    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      throw new Error('Invalid response structure: missing suggestions');
    }

    // Ensure each side has a unique ID
    const timestamp = Date.now();
    return parsed.suggestions.map((side: SideDish, idx: number) => ({
      ...side,
      id: side.id || `side-${timestamp}-${idx}`,
      servings: side.servings || 4
    }));
  } catch (error) {
    console.error("Error suggesting side dishes:", error);
    throw error;
  }
};

/**
 * Save selected side dishes to a recipe in the database
 */
export const saveSidesToRecipe = async (
  mealId: string,
  sides: SideDish[]
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('favorite_meals')
      .update({ sides: sides })
      .eq('id', mealId);

    if (error) {
      console.error('Error saving sides to recipe:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving sides to recipe:', error);
    return false;
  }
};

/**
 * Get sides for a recipe from the database
 */
export const getSidesForRecipe = async (mealId: string): Promise<SideDish[]> => {
  try {
    const { data, error } = await supabase
      .from('favorite_meals')
      .select('sides')
      .eq('id', mealId)
      .single();

    if (error || !data) {
      return [];
    }

    return (data.sides as SideDish[]) || [];
  } catch (error) {
    console.error('Error getting sides for recipe:', error);
    return [];
  }
};

/**
 * Remove sides from a recipe
 */
export const removeSidesFromRecipe = async (mealId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('favorite_meals')
      .update({ sides: null })
      .eq('id', mealId);

    if (error) {
      console.error('Error removing sides from recipe:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error removing sides from recipe:', error);
    return false;
  }
};
