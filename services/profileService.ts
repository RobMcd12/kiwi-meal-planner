import { supabase } from './authService';
import { UserProfile, CountryCode } from '../types';

/**
 * Get user profile from database
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      country: data.country as CountryCode | null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: { displayName?: string; country?: CountryCode | null }
): Promise<boolean> => {
  try {
    const updateData: Record<string, unknown> = {};

    if (updates.displayName !== undefined) {
      updateData.display_name = updates.displayName;
    }
    if (updates.country !== undefined) {
      updateData.country = updates.country;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    return false;
  }
};

/**
 * Country options for the dropdown
 */
export const COUNTRY_OPTIONS: { code: CountryCode; name: string; flag: string }[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'OTHER', name: 'Other', flag: '🌍' },
];

/**
 * Ingredient term mappings by country
 * US uses American terms, others use British/international terms
 */
export const INGREDIENT_LOCALIZATIONS: Record<string, Record<CountryCode, string>> = {
  // US term -> localized terms
  'cilantro': {
    'US': 'cilantro',
    'UK': 'coriander',
    'AU': 'coriander',
    'NZ': 'coriander',
    'CA': 'cilantro',
    'IE': 'coriander',
    'ZA': 'coriander',
    'IN': 'coriander',
    'OTHER': 'cilantro/coriander',
  },
  'eggplant': {
    'US': 'eggplant',
    'UK': 'aubergine',
    'AU': 'eggplant',
    'NZ': 'eggplant',
    'CA': 'eggplant',
    'IE': 'aubergine',
    'ZA': 'brinjal',
    'IN': 'brinjal',
    'OTHER': 'eggplant/aubergine',
  },
  'zucchini': {
    'US': 'zucchini',
    'UK': 'courgette',
    'AU': 'zucchini',
    'NZ': 'courgette',
    'CA': 'zucchini',
    'IE': 'courgette',
    'ZA': 'baby marrow',
    'IN': 'zucchini',
    'OTHER': 'zucchini/courgette',
  },
  'arugula': {
    'US': 'arugula',
    'UK': 'rocket',
    'AU': 'rocket',
    'NZ': 'rocket',
    'CA': 'arugula',
    'IE': 'rocket',
    'ZA': 'rocket',
    'IN': 'arugula',
    'OTHER': 'arugula/rocket',
  },
  'bell pepper': {
    'US': 'bell pepper',
    'UK': 'pepper',
    'AU': 'capsicum',
    'NZ': 'capsicum',
    'CA': 'bell pepper',
    'IE': 'pepper',
    'ZA': 'pepper',
    'IN': 'capsicum',
    'OTHER': 'bell pepper/capsicum',
  },
  'ground beef': {
    'US': 'ground beef',
    'UK': 'minced beef',
    'AU': 'beef mince',
    'NZ': 'beef mince',
    'CA': 'ground beef',
    'IE': 'minced beef',
    'ZA': 'beef mince',
    'IN': 'minced beef',
    'OTHER': 'ground/minced beef',
  },
  'shrimp': {
    'US': 'shrimp',
    'UK': 'prawns',
    'AU': 'prawns',
    'NZ': 'prawns',
    'CA': 'shrimp',
    'IE': 'prawns',
    'ZA': 'prawns',
    'IN': 'prawns',
    'OTHER': 'shrimp/prawns',
  },
  'scallions': {
    'US': 'scallions',
    'UK': 'spring onions',
    'AU': 'shallots',
    'NZ': 'spring onions',
    'CA': 'green onions',
    'IE': 'spring onions',
    'ZA': 'spring onions',
    'IN': 'spring onions',
    'OTHER': 'scallions/spring onions',
  },
  'heavy cream': {
    'US': 'heavy cream',
    'UK': 'double cream',
    'AU': 'thickened cream',
    'NZ': 'cream',
    'CA': 'heavy cream',
    'IE': 'double cream',
    'ZA': 'fresh cream',
    'IN': 'fresh cream',
    'OTHER': 'heavy/double cream',
  },
};

/**
 * Get the localized ingredient name for a country
 */
export const getLocalizedIngredient = (ingredient: string, country: CountryCode | null): string => {
  if (!country) return ingredient;

  const lowerIngredient = ingredient.toLowerCase();
  const localization = INGREDIENT_LOCALIZATIONS[lowerIngredient];

  if (localization && localization[country]) {
    return localization[country];
  }

  return ingredient;
};

/**
 * Build localization instruction for AI prompts based on country
 */
export const getLocalizationInstruction = (country: CountryCode | null): string => {
  if (!country || country === 'OTHER') {
    return '';
  }

  const terms: string[] = [];

  Object.entries(INGREDIENT_LOCALIZATIONS).forEach(([usName, localizations]) => {
    const localName = localizations[country];
    if (localName !== usName) {
      terms.push(`${localName} (not ${usName})`);
    }
  });

  if (terms.length === 0) return '';

  return `Use ${COUNTRY_OPTIONS.find(c => c.code === country)?.name} ingredient terminology: ${terms.join(', ')}.`;
};
