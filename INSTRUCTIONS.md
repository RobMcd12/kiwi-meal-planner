# Kiwi Meal Planner - Reconstruction Instructions

This document outlines the steps to recreate the **Kiwi Meal Planner** application using VS Code and an AI assistant (like Claude).

## 1. Project Overview
**Kiwi Meal Planner** is a React-based web application that uses the Google Gemini API to generate weekly meal plans and shopping lists tailored for New Zealand shoppers. It features local persistence (acting as a local database), pantry management, and export functionality to iOS Reminders and New World Online.

## 2. Prerequisites
*   **Node.js** (v18 or higher)
*   **npm** or **yarn**
*   **VS Code**
*   **Google Gemini API Key** (Get one at [aistudio.google.com](https://aistudio.google.com))

## 3. Scaffolding the Project (VS Code)

Open your terminal in VS Code and run the following commands to create the React TypeScript project structure.

```bash
# 1. Create a new Vite project (faster/modern alternative to CRA)
npm create vite@latest kiwi-meal-planner -- --template react-ts

# 2. Navigate into the folder
cd kiwi-meal-planner

# 3. Install required dependencies
npm install @google/genai lucide-react

# 4. Start the development server (to test)
npm run dev
```

## 4. Environment Setup

Create a file named `.env` in the root directory of your project (same level as `package.json`).

```env
# .env
VITE_API_KEY=your_actual_google_gemini_api_key_here
```

*Note: In the provided code, `process.env.API_KEY` is used. If using Vite, you may need to update the `geminiService.ts` to use `import.meta.env.VITE_API_KEY` or configure your bundler to expose `process.env`.*

## 5. File Structure & Replication

Delete the contents of the generated `src/` folder and recreate the file structure as shown below.

### Directory Tree
```
kiwi-meal-planner/
├── index.html          # (In root) Replaces default Vite HTML
├── src/
│   ├── index.tsx       # Entry point
│   ├── App.tsx         # Main Application Router/Logic
│   ├── types.ts        # TypeScript Interfaces (Database Schema)
│   ├── metadata.json   # App metadata
│   ├── services/
│   │   ├── geminiService.ts   # AI Logic
│   │   └── storageService.ts  # Database Connection Layer
│   └── components/
│       ├── WelcomeScreen.tsx
│       ├── ConfigForm.tsx
│       ├── PantryManager.tsx
│       ├── PreferenceForm.tsx
│       ├── PlanDisplay.tsx
│       ├── FavoritesView.tsx
│       ├── SettingsView.tsx
│       └── RecipeModal.tsx (Optional/Future implementation)
```

## 6. Database Connection & Persistence Architecture

The application currently uses a **Repository Pattern** in `services/storageService.ts`.

### Current Database Implementation (Local)
The app currently functions using **LocalStorage** as a client-side database. This allows the app to work offline and persist data between refreshes without a backend server.

*   **Database File:** `src/services/storageService.ts`
*   **Tables (Keys):**
    *   `kiwi_meal_planner_favorites`: Stores saved recipes (`Meal[]`).
    *   `kiwi_meal_planner_pantry`: Stores pantry inventory (`PantryItem[]`).
    *   `kiwi_meal_planner_config`: Stores user settings (`MealConfig`).
    *   `kiwi_meal_planner_preferences`: Stores user taste profiles (`UserPreferences`).

### Upgrading to a Cloud Database (Firebase/Supabase)
To connect this app to a real cloud database, you **only** need to modify `services/storageService.ts`. The rest of the React UI (`components/*`) is decoupled from the data source.

**Example: Switching to Firebase Firestore**
1.  Install Firebase: `npm install firebase`
2.  Update `storageService.ts`:

```typescript
// services/storageService.ts (CONCEPTUAL)
import { db } from './firebaseConfig';
import { collection, addDoc, getDocs } from "firebase/firestore";

// Replace local storage call with DB call
export const saveFavoriteMeal = async (meal: Meal) => {
   await addDoc(collection(db, "favorites"), meal);
};
```

## 7. Native iOS Integration Details

The `PlanDisplay.tsx` file uses the **Web Share API** (`navigator.share`).
*   **Functionality:** When the "Share / Reminders" button is clicked on an iOS device, it triggers the native iOS Share Sheet.
*   **Behavior:** Selecting "Reminders" from the sheet automatically converts the text bullet points into a checklist.

## 8. Deployment

To deploy this application for free:

1.  **Vercel / Netlify:**
    *   Push your code to GitHub.
    *   Import the repository to Vercel.
    *   **Crucial:** Add your `API_KEY` (or `VITE_API_KEY`) in the Vercel Project Settings > Environment Variables.
    *   Deploy.

## 9. Troubleshooting

*   **Tailwind Not Working:** Ensure `index.html` contains the `<script src="https://cdn.tailwindcss.com"></script>` tag, or install Tailwind locally via npm if you prefer a build-step approach.
*   **API Errors:** Check the Browser Console (F12). If you see 401/403 errors, your Gemini API Key is missing or invalid.
*   **Persistence Issues:** If settings reset on reload, ensure `useEffect` hooks in `App.tsx` are calling the `save*` functions from `storageService.ts`.

