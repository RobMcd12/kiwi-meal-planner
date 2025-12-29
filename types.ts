// ============================================
// CONSTANTS
// ============================================

export const CONSTANTS = {
  MAX_HISTORY_ENTRIES: 5,
  MAX_PLAN_DAYS: 7,
  MIN_PLAN_DAYS: 1,
  MAX_PEOPLE_COUNT: 12,
  MIN_PEOPLE_COUNT: 1,
} as const;

// ============================================
// CORE TYPES
// ============================================

export interface PantryItem {
  id: string;
  name: string;
}

export interface MealConfig {
  days: number;
  peopleCount: number;
  includeBreakfast: boolean;
  includeLunch: boolean;
  includeDinner: boolean;
}

export interface UserPreferences {
  dietaryRestrictions: string;
  likes: string;
  dislikes: string;
  unitSystem: 'metric' | 'imperial';
  temperatureScale: 'celsius' | 'fahrenheit';
}

export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
  checked?: boolean;
}

export interface Meal {
  id: string; // Required for database deduplication
  name: string;
  description: string;
  ingredients: string[];
  instructions: string;
  isFavorite?: boolean;
  rating?: 'like' | 'dislike' | null;
  imageUrl?: string;
}

export interface DayPlan {
  day: string;
  meals: {
    breakfast?: Meal;
    lunch?: Meal;
    dinner?: Meal;
  };
}

export interface ShoppingCategory {
  categoryName: string;
  items: Ingredient[];
}

export interface MealPlanResponse {
  id?: string; // Database ID for persistence
  weeklyPlan: DayPlan[];
  shoppingList: ShoppingCategory[];
}

// ============================================
// AUTH TYPES
// ============================================

export interface UserSession {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export type AuthProvider = 'google' | 'apple' | 'github';

// ============================================
// APP STATE
// ============================================

export enum AppStep {
  LANDING = 'LANDING',
  AUTH = 'AUTH',
  WELCOME = 'WELCOME',
  CONFIG = 'CONFIG',
  PANTRY = 'PANTRY',
  PREFERENCES = 'PREFERENCES',
  RESULTS = 'RESULTS',
  FAVORITES = 'FAVORITES',
  SETTINGS = 'SETTINGS',
  ADMIN = 'ADMIN',
  MY_FEEDBACK = 'MY_FEEDBACK',
}

// ============================================
// TOAST TYPES
// ============================================

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// ============================================
// FEEDBACK TYPES
// ============================================

export type FeedbackType = 'bug' | 'feature' | 'question' | 'other';
export type FeedbackStatus = 'new' | 'reviewed' | 'in-progress' | 'resolved';

export interface FeedbackItem {
  id: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  type: FeedbackType;
  subject: string;
  message: string;
  status: FeedbackStatus;
  admin_response?: string;
  admin_responded_at?: string;
  admin_responded_by?: string;
  admin_name?: string;
  user_viewed_response: boolean;
  created_at: string;
  updated_at: string;
}