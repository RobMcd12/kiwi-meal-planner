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
