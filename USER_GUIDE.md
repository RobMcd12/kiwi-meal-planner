# Kiwi Meal Planner - User Guide

> **IMPORTANT FOR DEVELOPERS**: This documentation must be updated whenever features are added, modified, or removed. The in-app help modal (`components/HelpModal.tsx`) should also be updated to match.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating a Meal Plan](#creating-a-meal-plan)
3. [My Cookbook](#my-cookbook)
4. [Uploading Recipes](#uploading-recipes)
5. [Recipe Images](#recipe-images)
6. [Tags & Search](#tags--search)
7. [Sharing Recipes](#sharing-recipes)
8. [Notes & Comments](#notes--comments)
9. [Shopping Lists](#shopping-lists)
10. [Settings & Preferences](#settings--preferences)
11. [Feedback & Support](#feedback--support)
12. [Installing as an App](#installing-as-an-app)

---

## Getting Started

Kiwi Meal Planner uses AI to generate personalized weekly meal plans based on your preferences, dietary restrictions, and what you have in your pantry.

### Quick Start

1. **Sign in** with Google or email to save your data across devices
2. **Configure your plan** - choose number of days, people, and which meals to include
3. **Add pantry items** - tell us what ingredients you already have
4. **Set preferences** - dietary restrictions, likes, and dislikes
5. **Generate!** - AI creates a custom meal plan with shopping list

### Account Benefits

When signed in, your data syncs across all devices:
- Saved recipes and favorites
- Pantry inventory
- Preferences and settings
- Plan history

---

## Creating a Meal Plan

### Step 1: Configure Your Plan

Choose your meal plan settings:
- **Number of days** (1-7)
- **Number of people** - affects portion sizes and shopping quantities
- **Meals to include** - Breakfast, Lunch, and/or Dinner

### Step 2: Add Pantry Items

Tell the AI what ingredients you already have:
- Type ingredient names to add them
- The AI will try to use these ingredients first
- This reduces your shopping list

### Step 3: Set Your Preferences

Be specific for better results:
- **Dietary restrictions** - e.g., "vegetarian", "gluten-free", "no nuts"
- **Likes** - e.g., "Italian food", "spicy dishes", "one-pot meals"
- **Dislikes** - e.g., "mushrooms", "seafood", "overly sweet dishes"

**Pro Tip**: Instead of vague preferences like "healthy food", try specific ones like "high protein, low carb meals with vegetables".

### Step 4: Generate

Click "Generate Meal Plan" and the AI will create:
- A complete meal plan for your selected days
- Recipes with ingredients and instructions
- A consolidated shopping list (minus pantry items)

### Rating Meals

After viewing a meal plan, rate each meal:
- **4-5 stars** - Recipe is saved to your "AI Generated" cookbook
- Lower ratings help the AI learn your preferences

---

## My Cookbook

Your cookbook stores all your favorite and uploaded recipes across three tabs:

### AI Generated Tab
Recipes from meal plans that you've rated 4-5 stars. These are automatically saved when you rate them highly.

### My Uploads Tab
Recipes you've added yourself via URL, image, PDF, or text. You have full control over these recipes:
- Edit tags
- Toggle public/private sharing
- Delete recipes

### Public Recipes Tab
Recipes shared by other users in the community. You can:
- Browse and search public recipes
- Add them to your shopping list
- Save notes on recipes

---

## Uploading Recipes

Add your own recipes using four convenient methods:

### URL Upload (Recommended for web recipes)
1. Click the **Upload** button in your cookbook
2. Select the **URL** tab
3. Paste any recipe URL (e.g., from food blogs, recipe sites)
4. Click **Upload Recipe**
5. AI extracts just the recipe, ignoring ads and navigation

### Image Upload
1. Select the **Image** tab
2. Upload a photo of a recipe card, cookbook page, or screenshot
3. Supported formats: JPG, PNG, WebP
4. AI reads and extracts the recipe text

### PDF Upload
1. Select the **PDF** tab
2. Upload a PDF recipe file
3. AI processes the document and extracts recipe details

### Text Paste
1. Select the **Text** tab
2. Copy and paste recipe text from any source
3. AI formats it into a structured recipe with:
   - Name and description
   - Ingredients list
   - Step-by-step instructions
   - Auto-generated tags

### Background Processing
All uploads are processed in the background:
- You can navigate away while AI works
- A notification appears when processing completes
- Failed uploads can be retried

---

## Recipe Images

All recipes in your cookbook display AI-generated images to help you visualize each dish.

### Automatic Image Generation
- Images are automatically generated for recipes that don't have one
- Generation happens in the background when you view your cookbook
- Images are cached for fast loading on future visits

### Editing Recipe Images
Customize recipe images using AI:

1. **Hover over any recipe image** in your cookbook
2. **Click "Edit"** to open the image editor
3. **Describe your changes** in the text box, for example:
   - "Make the dish look more colorful"
   - "Show it on a rustic wooden table"
   - "Add a garnish of fresh herbs"
   - "Make it look more appetizing with steam"
4. **Click "Apply"** to generate a new image based on your instructions

### Regenerating Images
If you're not happy with a recipe's image:
1. Hover over the image
2. Click "Regenerate" to create a completely new image
3. The AI will generate a fresh image based on the recipe

### Image Tips
- Be specific in your edit instructions for better results
- Images are high-quality food photography style
- Changes may take a few seconds to process
- Edited images replace the previous version

---

## Tags & Search

### Automatic Tagging
All recipes are automatically tagged by AI for easy organization:

| Category | Examples |
|----------|----------|
| **Cuisine** | Italian, Asian, Mexican, Indian, Mediterranean, Thai, Japanese |
| **Dietary** | Vegan, Vegetarian, Gluten-Free, Dairy-Free, Keto, Low-Carb, Paleo |
| **Meal Type** | Breakfast, Lunch, Dinner, Snack, Dessert, Appetizer |
| **Other** | Quick, Easy, Budget-Friendly, Healthy, One-Pot, Air Fryer |

### Searching Recipes
- Type 3+ characters in the search box
- Searches recipe names, descriptions, and ingredients
- Results update in real-time

### Filtering by Tags
- Click tag pills below the search bar to filter
- Select multiple tags to narrow results
- Click "Clear" to reset filters

### Editing Tags
- **Your uploads**: Click a recipe, then "Edit" next to Tags
- **Admins**: Can edit tags on any recipe

---

## Sharing Recipes

Share your uploaded recipes with the community:

### Making a Recipe Public
1. Open any recipe from your "My Uploads" tab
2. Find the **Private/Public** toggle button
3. Click to switch from 🔒 Private to 🌐 Public
4. Your recipe now appears in everyone's "Public Recipes" tab

### What Gets Shared
- Recipe name, description, ingredients, and instructions
- Tags (for searchability)
- Your display name (as the recipe owner)

### Privacy Notes
- Only your uploaded recipes can be shared
- AI-generated recipes remain private
- You can make a recipe private again at any time

---

## Notes & Comments

Add personal notes and interact with the community on recipes.

### Private Notes
Keep personal notes that only you can see:
- Available on all recipes (yours and public)
- Perfect for your own tips, modifications, or reminders
- Only visible to you

### Shared Notes
Share notes with the community on public recipes:
- Visible to everyone viewing the recipe
- Great for sharing tips, substitutions, or experiences
- You can have **both** a private note AND a shared note on the same recipe

### Comments & Ratings
Leave feedback on public recipes:
1. Open any public recipe
2. Scroll to the **Comments & Ratings** section (collapsed by default)
3. Click to expand and view all community feedback
4. Add your rating (1-5 stars) and write a comment
5. The average rating appears in the header

### Rating Guidelines
- **5 stars** - Exceptional, made it multiple times
- **4 stars** - Great recipe, would make again
- **3 stars** - Good, but needed modifications
- **2 stars** - Below average, significant issues
- **1 star** - Did not work as described

---

## Shopping Lists

Generate smart shopping lists from your cookbook:

### Selecting Recipes
1. Go to **My Cookbook**
2. Click the circle on each recipe card to select it
3. Selected recipes show a filled circle and highlighted border
4. The header shows how many recipes are selected

### Generating the List
1. With recipes selected, click **Create List** in the header
2. AI generates a consolidated shopping list that:
   - Combines duplicate ingredients
   - Adjusts quantities for your number of servings
   - Excludes items you have in your pantry
   - Organizes by category (produce, dairy, meat, etc.)

### Using the List
- Check off items as you shop
- List persists until you generate a new one
- Works offline on installed app

---

## Settings & Preferences

Access settings from the ⚙️ gear icon or welcome screen:

### Plan Configuration
- **Days**: How many days to plan (1-7)
- **People**: Number of servings per meal
- **Meals**: Which meals to include

### Pantry Management
- Add ingredients you have on hand
- Remove items you've used up
- AI uses pantry items first when planning

### Food Preferences
- **Dietary Restrictions**: Allergies, intolerances, diet types
- **Likes**: Cuisines, ingredients, or styles you enjoy
- **Dislikes**: Foods to avoid

### Unit Preferences
- **Measurement System**: Metric (grams, ml) or Imperial (oz, cups)
- **Temperature**: Celsius or Fahrenheit

### Data Management
- Export your data as JSON backup
- Import previously exported data
- Clear all local data

---

## Feedback & Support

We value your input!

### Sending Feedback
1. Click **Feedback** in the header
2. Choose a category (Bug, Feature Request, General)
3. Write your message
4. Submit

### Viewing Responses
- When admins respond, you'll see a 🔔 notification badge
- Click the bell icon to view your feedback history
- Mark responses as read to clear notifications

### Getting Help
- Click the **?** help icon in the header for this guide
- Check the FAQ sections for common questions
- Use feedback for specific issues

---

## Installing as an App

Kiwi Meal Planner is a Progressive Web App (PWA) that can be installed on any device:

### Desktop (Chrome, Edge)
1. Look for the install icon (⊕) in the address bar
2. Click "Install" in the prompt
3. App opens in its own window

### iOS (Safari)
1. Tap the Share button (square with arrow)
2. Scroll down and tap "Add to Home Screen"
3. Confirm the name and tap "Add"

### Android (Chrome)
1. Tap the three-dot menu
2. Select "Install app" or "Add to Home Screen"
3. Confirm installation

### Offline Features
When installed, you can:
- View saved recipes offline
- Access your cookbook
- See your last shopping list

Note: Generating new meal plans requires an internet connection.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Esc` | Close modals and dialogs |
| `Enter` | Submit forms |

---

## Troubleshooting

### Meal plan won't generate
- Check your internet connection
- Try refreshing the page
- Reduce the number of days/meals

### Recipe upload failed
- Ensure file is under 10MB
- Try a different image format
- For URLs, the site may be blocking access

### Tags not appearing
- Wait for AI processing to complete
- Refresh the cookbook page
- Tags may take a moment to load

### Data not syncing
- Ensure you're signed in
- Check internet connection
- Try signing out and back in

---

## Version History

### v1.0.6 (Current)
- Automatic AI image generation for all recipes
- AI-powered image editing with custom instructions
- Image regeneration option
- Separate private and shared notes per recipe
- Comments and 5-star ratings on public recipes
- Collapsible comments section

### v1.0.5
- Added URL recipe upload
- Moved cookbook buttons to header
- Sticky search bar on scroll
- Added in-app help guide

### v1.0.4
- Cookbook enhancements (tags, search, filters)
- Recipe upload (image, PDF, text)
- Public recipe sharing
- Notes on recipes

### v1.0.3
- User feedback system
- Admin dashboard
- PWA improvements

---

> **Developers**: When updating features, remember to update both this file AND the `components/HelpModal.tsx` component to keep documentation in sync.
