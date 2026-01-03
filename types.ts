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
  isStaple?: boolean;      // If true, this is a staple item the user always keeps
  needsRestock?: boolean;  // If true, this staple needs to be added to shopping list
  quantity?: number;       // Numeric quantity (e.g., 2 for "2 kg")
  unit?: string;           // Unit of measurement (e.g., "kg", "cups", "pieces")
  categoryId?: string;     // Optional category this item belongs to
  sortOrder?: number;      // Sort order within category
}

export interface PantryCategory {
  id: string;
  name: string;
  sortOrder: number;
  isCollapsed: boolean;
  isStapleCategory: boolean; // If true, this category is for staples
}

// Units organized by measurement system
export const METRIC_UNITS = [
  { value: 'g', label: 'Grams (g)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'ml', label: 'Millilitres (ml)' },
  { value: 'L', label: 'Litres (L)' },
  { value: 'cm', label: 'Centimetres (cm)' },
] as const;

export const IMPERIAL_UNITS = [
  { value: 'oz', label: 'Ounces (oz)' },
  { value: 'lb', label: 'Pounds (lb)' },
  { value: 'fl oz', label: 'Fluid Ounces (fl oz)' },
  { value: 'cups', label: 'Cups' },
  { value: 'pt', label: 'Pints (pt)' },
  { value: 'qt', label: 'Quarts (qt)' },
  { value: 'gal', label: 'Gallons (gal)' },
  { value: 'in', label: 'Inches (in)' },
] as const;

export const UNIVERSAL_UNITS = [
  { value: 'pieces', label: 'Pieces' },
  { value: 'items', label: 'Items' },
  { value: 'bunch', label: 'Bunch' },
  { value: 'pack', label: 'Pack' },
  { value: 'can', label: 'Can' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'jar', label: 'Jar' },
  { value: 'box', label: 'Box' },
  { value: 'bag', label: 'Bag' },
  { value: 'tbsp', label: 'Tablespoon (tbsp)' },
  { value: 'tsp', label: 'Teaspoon (tsp)' },
  { value: 'cloves', label: 'Cloves' },
  { value: 'slices', label: 'Slices' },
  { value: 'heads', label: 'Heads' },
] as const;

export interface MealConfig {
  days: number;
  peopleCount: number;
  includeBreakfast: boolean;
  includeLunch: boolean;
  includeDinner: boolean;
  useWhatIHave?: boolean; // Prioritize pantry items to minimize shopping
}

export interface ExcludedIngredient {
  name: string;
  reason?: string; // e.g., "allergy", "preference", "intolerance"
}

export interface UserPreferences {
  dietaryRestrictions: string;
  likes: string;
  dislikes: string;
  unitSystem: 'metric' | 'imperial';
  temperatureScale: 'celsius' | 'fahrenheit';
  // Portion/nutrition settings
  meatServingGrams?: number; // Default 150-200g per person
  calorieTarget?: number; // Daily calorie target (e.g., 2000)
  // Ingredient exclusions (allergies, etc.)
  excludedIngredients?: ExcludedIngredient[];
}

// Country codes for ingredient localization
export type CountryCode = 'US' | 'UK' | 'AU' | 'NZ' | 'CA' | 'IE' | 'ZA' | 'IN' | 'OTHER';

export interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  country: CountryCode | null;
  defaultCookbookTab: CookbookTab | null;
  createdAt: string;
  updatedAt: string;
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
  servings?: number; // Number of servings the recipe makes (for nutrition calculation)
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
  // Video fields
  videoId?: string; // Reference to recipe_videos.id
  hasVideo?: boolean; // Whether this recipe has a completed video
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
  SAVED_PLANS = 'SAVED_PLANS',
  SINGLE_RECIPE = 'SINGLE_RECIPE',
  SHOPPING_LIST = 'SHOPPING_LIST',
  FEATURES = 'FEATURES',
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
  isPublic: boolean;
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
export type CookbookTab = 'all' | 'favourites' | 'generated' | 'uploaded' | 'public';

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

// ============================================
// ADMIN INSTRUCTIONS
// ============================================

export interface AdminInstructionCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export type InstructionTag = 'meal_planner' | 'recipe_generation' | 'pantry_scanning' | 'video_generation';

export interface AdminInstruction {
  id: string;
  categoryId: string;
  categoryName?: string; // Joined from category table
  title: string;
  instructionText: string;
  tags: InstructionTag[];
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// MEDIA UPLOADS
// ============================================

export interface MediaUpload {
  id: string;
  userId: string;
  storagePath: string;
  mediaType: 'video' | 'audio';
  originalFilename: string;
  fileSizeBytes?: number;
  mimeType?: string;
  durationSeconds?: number;
  processingStatus: 'pending' | 'processing' | 'complete' | 'failed';
  processedItems?: ScannedPantryResult;
  errorMessage?: string;
  expiresAt: string;
  createdAt: string;
}

export interface ScannedPantryResult {
  items: string[];
  categories?: {
    produce?: string[];
    dairy?: string[];
    meat?: string[];
    pantryStaples?: string[];
    frozen?: string[];
    beverages?: string[];
    condiments?: string[];
    other?: string[];
  };
}

export type PantryUploadMode = 'replace' | 'add_new';

// ============================================
// RECIPE VIDEO TYPES
// ============================================

export type VideoStorageType = 'google_drive' | 'supabase';
export type VideoProcessingStatus = 'pending' | 'generating' | 'uploading' | 'complete' | 'failed';

export interface RecipeVideo {
  id: string;
  mealId: string;
  mealName?: string; // Joined from favorite_meals for display
  storageType: VideoStorageType;
  // Google Drive fields
  googleDriveFileId?: string;
  googleDriveUrl?: string;
  // Supabase Storage fields
  supabaseStoragePath?: string;
  // Common fields
  videoUrl?: string; // Resolved playable URL
  thumbnailUrl?: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  processingStatus: VideoProcessingStatus;
  generationPrompt?: string;
  instructionsUsed?: AdminInstruction[];
  errorMessage?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GoogleDriveConfig {
  isConfigured: boolean;
  driveFolderId?: string;
  driveFolderName?: string;
  configuredBy?: string;
  configuredAt?: string;
}

export interface VideoGenerationRequest {
  mealId: string;
  storageType: VideoStorageType;
  customPrompt?: string;
}

// ============================================
// LOGIN HISTORY TYPES
// ============================================

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  loginAt: string;
  ipAddress: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  loginMethod: string;
  success: boolean;
}

export interface UserLoginSummary {
  totalLogins: number;
  lastLoginAt: string | null;
  lastLoginLocation: string | null;
  devices: string[];
  countries: string[];
}

// ============================================
// SUBSCRIPTION TYPES
// ============================================

export type SubscriptionTier = 'free' | 'pro';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trialing';
export type ProFeature = 'pantry_scanner' | 'video_scanner' | 'live_dictation' | 'audio_recorder' | 'unlimited_recipes';
export type BillingInterval = 'weekly' | 'monthly' | 'yearly';

export interface SubscriptionConfig {
  trialPeriodDays: number;
  priceWeeklyCents: number;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  yearlyDiscountPercent: number;
  freeRecipeLimit: number;
  proFeatures: ProFeature[];
  stripeWeeklyPriceId: string | null;
  stripeMonthlyPriceId: string | null;
  stripeYearlyPriceId: string | null;
  // Cancel offer settings
  cancelOfferEnabled: boolean;
  cancelOfferDiscountPercent: number;
  cancelOfferDurationMonths: number;
  cancelOfferMessage: string;
}

export interface UserSubscription {
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  stripeCurrentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  adminGrantedPro: boolean;
  adminGrantedBy: string | null;
  adminGrantExpiresAt: string | null;
  adminGrantNote: string | null;
  // Pause fields
  pausedAt: string | null;
  pauseResumesAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionState {
  subscription: UserSubscription | null;
  config: SubscriptionConfig | null;
  hasPro: boolean;
  isTrialing: boolean;
  daysLeftInTrial: number | null;
  recipeCount: number;
  recipeLimit: number;
  canCreateRecipe: boolean;
}

export interface AdminSubscriptionGrant {
  userId: string;
  expiresAt: string | null;
  note: string | null;
}

// ============================================
// ADMIN USER STATS
// ============================================

export interface UserStats {
  recipeCount: number;
  uploadedRecipeCount: number;
  mealPlanCount: number;
  mediaUploadCount: number;
  storageUsedBytes: number;
}

export interface AdminUserWithDetails {
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
  loginSummary: UserLoginSummary | null;
  subscription: UserSubscription | null;
  stats: UserStats | null;
}

// ============================================
// SIDE DISH TYPES
// ============================================

export interface SideDish {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  instructions: string;
  prepTime?: string;
  servings?: number;
}

export interface MealWithSides extends Meal {
  sides?: SideDish[];
}