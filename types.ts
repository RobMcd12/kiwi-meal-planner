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
  // Cookbook enhancement fields
  source?: 'generated' | 'uploaded';
  isPublic?: boolean;
  uploadStatus?: 'pending' | 'processing' | 'complete' | 'failed';
  tags?: string[];
  userId?: string;
  ownerName?: string;
  createdAt?: string;
  // Rating fields
  averageRating?: number; // 1-5 stars average
  ratingCount?: number; // Number of ratings
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
  screenshot?: string; // Base64 encoded screenshot image
  status: FeedbackStatus;
  admin_response?: string;
  admin_responded_at?: string;
  admin_responded_by?: string;
  admin_name?: string;
  user_viewed_response: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// RECIPE/COOKBOOK TYPES
// ============================================

export interface RecipeTag {
  id: string;
  name: string;
  category: 'cuisine' | 'dietary' | 'meal_type' | 'other';
}

export interface RecipeNote {
  id: string;
  mealId: string;
  userId: string;
  noteText: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt?: string;
  userName?: string; // For displaying public notes
  isOwn?: boolean; // Whether this note belongs to the current user
}

export interface RecipeComment {
  id: string;
  mealId: string;
  userId: string;
  commentText: string;
  rating: number | null; // 1-5 stars
  createdAt: string;
  updatedAt?: string;
  userName?: string;
  userAvatar?: string;
  isOwn?: boolean;
}

export interface ExtractedRecipe {
  name: string;
  description: string;
  ingredients: string[];
  instructions: string;
  suggestedTags?: string[];
}

export interface UploadTask {
  id: string;
  fileName: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  result?: Meal;
  error?: string;
  progress?: number;
}

export type RecipeSource = 'generated' | 'uploaded';
export type CookbookTab = 'generated' | 'uploaded' | 'public';

// ============================================
// SAVED MEAL PLANS
// ============================================

export interface SavedMealPlan {
  id: string;
  name: string;
  weeklyPlan: DayPlan[];
  shoppingList: ShoppingCategory[];
  createdAt: string;
  updatedAt?: string;
  userId?: string;
}