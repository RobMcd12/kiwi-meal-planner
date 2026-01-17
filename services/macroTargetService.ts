import { supabase } from './authService';
import { MacroTargets, UserMacroTargets, DEFAULT_MACRO_TARGETS } from '../types';

/**
 * Get user's macro targets, returning defaults if not set
 * If no userId provided, uses currently authenticated user
 */
export const getUserMacroTargets = async (userId?: string): Promise<UserMacroTargets | null> => {
  try {
    // Get current user if no userId provided
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return null;
      }
      effectiveUserId = user.id;
    }

    const { data, error } = await supabase
      .from('user_macro_targets')
      .select('*')
      .eq('user_id', effectiveUserId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching macro targets:', error);
      // Return defaults on error
      return {
        userId: effectiveUserId,
        targets: { ...DEFAULT_MACRO_TARGETS },
        isCustom: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (!data) {
      // Return defaults if no custom targets set
      return {
        userId: effectiveUserId,
        targets: { ...DEFAULT_MACRO_TARGETS },
        isCustom: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      userId: data.user_id,
      targets: {
        calories: data.calories,
        protein: data.protein,
        carbohydrates: data.carbohydrates,
        fat: data.fat,
        fiber: data.fiber,
        sugar: data.sugar,
        sodium: data.sodium,
        saturatedFat: data.saturated_fat,
      },
      isCustom: data.is_custom,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Error getting macro targets:', error);
    return null;
  }
};

/**
 * Save user's custom macro targets (Pro feature)
 */
export const saveUserMacroTargets = async (
  userId: string,
  targets: MacroTargets
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_macro_targets')
      .upsert({
        user_id: userId,
        calories: targets.calories,
        protein: targets.protein,
        carbohydrates: targets.carbohydrates,
        fat: targets.fat,
        fiber: targets.fiber ?? DEFAULT_MACRO_TARGETS.fiber,
        sugar: targets.sugar ?? DEFAULT_MACRO_TARGETS.sugar,
        sodium: targets.sodium ?? DEFAULT_MACRO_TARGETS.sodium,
        saturated_fat: targets.saturatedFat ?? DEFAULT_MACRO_TARGETS.saturatedFat,
        is_custom: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error saving macro targets:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving macro targets:', error);
    return false;
  }
};

/**
 * Reset user's macro targets to defaults
 */
export const resetMacroTargets = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_macro_targets')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error resetting macro targets:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error resetting macro targets:', error);
    return false;
  }
};

/**
 * Compare nutrition values against targets
 * Returns percentage of daily target for each macro
 */
export const compareToTargets = (
  nutrition: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    saturatedFat?: number;
  },
  targets: MacroTargets,
  servings: number = 1
): {
  calories: { value: number; target: number; percent: number };
  protein: { value: number; target: number; percent: number };
  carbs: { value: number; target: number; percent: number };
  fat: { value: number; target: number; percent: number };
  fiber?: { value: number; target: number; percent: number };
  sugar?: { value: number; target: number; percent: number };
  sodium?: { value: number; target: number; percent: number };
  saturatedFat?: { value: number; target: number; percent: number };
} => {
  const perServing = (val: number | undefined) => (val ?? 0) / servings;

  const result: ReturnType<typeof compareToTargets> = {
    calories: {
      value: perServing(nutrition.calories),
      target: targets.calories,
      percent: Math.round((perServing(nutrition.calories) / targets.calories) * 100),
    },
    protein: {
      value: perServing(nutrition.protein),
      target: targets.protein,
      percent: Math.round((perServing(nutrition.protein) / targets.protein) * 100),
    },
    carbs: {
      value: perServing(nutrition.carbs),
      target: targets.carbohydrates,
      percent: Math.round((perServing(nutrition.carbs) / targets.carbohydrates) * 100),
    },
    fat: {
      value: perServing(nutrition.fat),
      target: targets.fat,
      percent: Math.round((perServing(nutrition.fat) / targets.fat) * 100),
    },
  };

  if (targets.fiber && nutrition.fiber !== undefined) {
    result.fiber = {
      value: perServing(nutrition.fiber),
      target: targets.fiber,
      percent: Math.round((perServing(nutrition.fiber) / targets.fiber) * 100),
    };
  }

  if (targets.sugar && nutrition.sugar !== undefined) {
    result.sugar = {
      value: perServing(nutrition.sugar),
      target: targets.sugar,
      percent: Math.round((perServing(nutrition.sugar) / targets.sugar) * 100),
    };
  }

  if (targets.sodium && nutrition.sodium !== undefined) {
    result.sodium = {
      value: perServing(nutrition.sodium),
      target: targets.sodium,
      percent: Math.round((perServing(nutrition.sodium) / targets.sodium) * 100),
    };
  }

  if (targets.saturatedFat && nutrition.saturatedFat !== undefined) {
    result.saturatedFat = {
      value: perServing(nutrition.saturatedFat),
      target: targets.saturatedFat,
      percent: Math.round((perServing(nutrition.saturatedFat) / targets.saturatedFat) * 100),
    };
  }

  return result;
};

/**
 * Get color for macro percentage (for visual feedback)
 */
export const getMacroColor = (percent: number, isMaxLimit: boolean = false): string => {
  if (isMaxLimit) {
    // For sugar, sodium, saturated fat - lower is better
    if (percent <= 50) return 'text-emerald-600';
    if (percent <= 80) return 'text-amber-600';
    return 'text-red-600';
  } else {
    // For protein, fiber - hitting target is good
    if (percent >= 80 && percent <= 120) return 'text-emerald-600';
    if (percent >= 50) return 'text-amber-600';
    return 'text-slate-500';
  }
};

/**
 * Format macro target prompt for AI
 */
export const formatMacroTargetsForPrompt = (targets: MacroTargets): string => {
  return `Daily nutrition targets per person:
- Calories: ${targets.calories} kcal
- Protein: ${targets.protein}g
- Carbohydrates: ${targets.carbohydrates}g
- Fat: ${targets.fat}g
${targets.fiber ? `- Fiber: ${targets.fiber}g (minimum)` : ''}
${targets.sugar ? `- Sugar: ${targets.sugar}g (maximum)` : ''}
${targets.sodium ? `- Sodium: ${targets.sodium}mg (maximum)` : ''}

Please design meals that help achieve these daily targets when combined.`;
};
