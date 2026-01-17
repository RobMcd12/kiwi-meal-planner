// Shared schema definitions for Gemini API structured output

export const ingredientSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    quantity: { type: 'STRING' },
    unit: { type: 'STRING' },
  },
  required: ['name', 'quantity', 'unit'],
};

export const mealSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', description: 'Full name of the complete meal (Main + Sides)' },
    description: { type: 'STRING', description: 'Description of the full meal composition' },
    ingredients: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    instructions: { type: 'STRING', description: 'Combined cooking instructions for all parts of the meal' },
  },
  required: ['name', 'description', 'ingredients', 'instructions'],
};

export const dayPlanSchema = {
  type: 'OBJECT',
  properties: {
    day: { type: 'STRING' },
    meals: {
      type: 'OBJECT',
      properties: {
        breakfast: mealSchema,
        lunch: mealSchema,
        dinner: mealSchema,
      },
    },
  },
  required: ['day', 'meals'],
};

export const shoppingCategorySchema = {
  type: 'OBJECT',
  properties: {
    categoryName: { type: 'STRING' },
    items: {
      type: 'ARRAY',
      items: ingredientSchema,
    },
  },
  required: ['categoryName', 'items'],
};

export const responseSchema = {
  type: 'OBJECT',
  properties: {
    weeklyPlan: {
      type: 'ARRAY',
      items: dayPlanSchema,
    },
    shoppingList: {
      type: 'ARRAY',
      items: shoppingCategorySchema,
    },
  },
  required: ['weeklyPlan', 'shoppingList'],
};

export const nutritionSchema = {
  type: 'OBJECT',
  properties: {
    servingSize: { type: 'STRING', description: 'Serving size description' },
    servingsPerRecipe: { type: 'NUMBER', description: 'Number of servings the recipe makes' },
    calories: { type: 'NUMBER', description: 'Calories per serving' },
    macros: {
      type: 'OBJECT',
      properties: {
        protein: { type: 'NUMBER', description: 'Protein in grams' },
        carbohydrates: { type: 'NUMBER', description: 'Carbohydrates in grams' },
        fat: { type: 'NUMBER', description: 'Total fat in grams' },
        fiber: { type: 'NUMBER', description: 'Fiber in grams' },
        sugar: { type: 'NUMBER', description: 'Sugar in grams' },
        saturatedFat: { type: 'NUMBER', description: 'Saturated fat in grams' },
      },
      required: ['protein', 'carbohydrates', 'fat'],
    },
    micros: {
      type: 'OBJECT',
      properties: {
        sodium: { type: 'NUMBER', description: 'Sodium in mg' },
        cholesterol: { type: 'NUMBER', description: 'Cholesterol in mg' },
        potassium: { type: 'NUMBER', description: 'Potassium in mg' },
        vitaminA: { type: 'NUMBER', description: 'Vitamin A as % daily value' },
        vitaminC: { type: 'NUMBER', description: 'Vitamin C as % daily value' },
        calcium: { type: 'NUMBER', description: 'Calcium as % daily value' },
        iron: { type: 'NUMBER', description: 'Iron as % daily value' },
      },
    },
    healthNotes: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Brief health notes about the dish',
    },
  },
  required: ['calories', 'macros', 'servingSize', 'servingsPerRecipe'],
};

export const autoTagSchema = {
  type: 'OBJECT',
  properties: {
    tags: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Relevant tags for the recipe',
    },
    cuisineType: { type: 'STRING', description: 'Primary cuisine type' },
    difficulty: { type: 'STRING', description: 'Recipe difficulty level' },
  },
  required: ['tags', 'cuisineType', 'difficulty'],
};

export const extractedRecipeSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', description: 'Recipe name' },
    description: { type: 'STRING', description: 'Brief description of the dish' },
    ingredients: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'List of ingredients with quantities',
    },
    instructions: { type: 'STRING', description: 'Step-by-step cooking instructions' },
    suggestedTags: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Suggested tags for the recipe',
    },
  },
  required: ['name', 'description', 'ingredients', 'instructions'],
};

export const adjustedRecipeSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', description: 'Recipe name' },
    description: { type: 'STRING', description: 'Recipe description' },
    ingredients: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Adjusted ingredients list',
    },
    instructions: { type: 'STRING', description: 'Adjusted cooking instructions' },
    servings: { type: 'NUMBER', description: 'Number of servings' },
    adjustmentNotes: { type: 'STRING', description: 'Notes about what was changed' },
  },
  required: ['name', 'description', 'ingredients', 'instructions', 'servings'],
};

// Schema for side dish or dessert
export const accompanimentSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', description: 'Name of the side dish or dessert' },
    description: { type: 'STRING', description: 'Brief description' },
    ingredients: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'List of ingredients with quantities',
    },
    instructions: { type: 'STRING', description: 'Cooking instructions' },
    prepTime: { type: 'STRING', description: 'Preparation time' },
  },
  required: ['name', 'description', 'ingredients', 'instructions'],
};

// Schema for full recipe with sides and desserts
export const fullRecipeSchema = {
  type: 'OBJECT',
  properties: {
    main: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Main dish name' },
        description: { type: 'STRING', description: 'Main dish description' },
        ingredients: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
        instructions: { type: 'STRING', description: 'Main dish cooking instructions' },
      },
      required: ['name', 'description', 'ingredients', 'instructions'],
    },
    sides: {
      type: 'ARRAY',
      items: accompanimentSchema,
      description: '1-2 complementary side dishes',
    },
    dessert: accompanimentSchema,
  },
  required: ['main', 'sides', 'dessert'],
};

// Schema for category suggestion
export const categorySuggestionItemSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', description: 'The original item name' },
    suggestedCategory: { type: 'STRING', description: 'The suggested category for this item' },
    confidence: { type: 'NUMBER', description: 'Confidence score from 0 to 1' },
  },
  required: ['name', 'suggestedCategory', 'confidence'],
};

export const categorySuggestionSchema = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: categorySuggestionItemSchema,
      description: 'Array of items with their suggested categories',
    },
  },
  required: ['items'],
};
