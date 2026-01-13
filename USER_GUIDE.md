# Kiwi Meal Planner - User Guide

> **IMPORTANT FOR DEVELOPERS**: This documentation must be updated whenever features are added, modified, or removed. The in-app help modal (`components/HelpModal.tsx`) should also be updated to match.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating a Meal Plan](#creating-a-meal-plan)
3. [Use What I Have Mode](#use-what-i-have-mode) *(Pro)*
4. [Single Recipe Generator](#single-recipe-generator)
5. [AI Pantry Scanner](#ai-pantry-scanner)
6. [Pantry Staples](#pantry-staples)
7. [Nutritional Information](#nutritional-information)
8. [AI Recipe Adjustments](#ai-recipe-adjustments) *(Pro)*
9. [My Cookbook](#my-cookbook)
10. [Uploading Recipes](#uploading-recipes) *(Pro)*
11. [Recipe Images](#recipe-images)
12. [Recipe Categories](#recipe-categories)
13. [Tags & Search](#tags--search)
15. [Sharing Recipes](#sharing-recipes)
16. [Notes & Comments](#notes--comments)
17. [Shopping Lists](#shopping-lists)
    - [Master Shopping List](#master-shopping-list)
    - [Supermarket Layouts](#supermarket-layouts) *(Pro)*
    - [Exporting Shopping Lists](#exporting-shopping-lists)
18. [Portions & Macro Targets](#portions--macro-targets)
19. [Settings & Preferences](#settings--preferences)
20. [Feedback & Support](#feedback--support)
21. [Installing as an App](#installing-as-an-app)

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

## Use What I Have Mode

> **Pro Feature**: Use What I Have mode is available with a Pro subscription.

Maximize your pantry ingredients and minimize shopping with the smart "Use What I Have" mode.

### What is Use What I Have?

This intelligent mode tells the AI to **prioritize ingredients you already have** when generating meal plans and recipes. Instead of creating the "best" recipes and then building a shopping list, it flips the approach: build recipes around what's in your kitchen first.

### Benefits

- **Reduce food waste** - Use ingredients before they expire
- **Save money** - Smaller shopping lists mean lower grocery bills
- **Less shopping trips** - Only buy what you truly need
- **Smarter meal planning** - AI considers what's available, not just what's ideal

### How to Enable It

#### From the Welcome Screen
1. If you have pantry items saved, a prominent **"Use What I Have"** button appears
2. Click it to go directly to meal plan configuration with the mode enabled
3. The button shows a ✨ Smart badge indicating AI-powered optimization

#### From Plan Configuration
1. During meal plan setup, find the **Recipe Mode** section
2. Choose between:
   - **Standard** - Best recipes, then shop for ingredients
   - **Use What I Have** - Prioritize pantry items to minimize shopping
3. Note: "Use What I Have" is only available if you have pantry items saved

#### From Single Recipe Generator
1. When generating individual recipes, toggle the **"Use What I Have"** option
2. The AI will try to incorporate your pantry ingredients into the recipe

### How It Works

When enabled, the AI receives special instructions to:
1. **Prioritize** your pantry, fridge, and freezer items as primary ingredients
2. **Build recipes around** what you have available
3. **Minimize** the shopping list by using existing ingredients creatively
4. **Only add items** to the shopping list when absolutely necessary

### Best Practices

1. **Keep your pantry updated** - Scan or add items regularly for best results
2. **Use the AI Pantry Scanner** - Quickly photograph your kitchen to keep inventory current
3. **Remove used items** - Delete ingredients after you've used them up
4. **Be thorough** - The more pantry items the AI knows about, the smarter it can plan

### Example Scenario

**Without Use What I Have:**
- AI creates a Thai curry recipe requiring lemongrass, coconut milk, fish sauce
- Shopping list includes all specialty ingredients

**With Use What I Have (and chicken, carrots, onions in pantry):**
- AI creates a chicken stir-fry using your chicken, carrots, and onions
- Shopping list only includes soy sauce and sesame oil

---

## Single Recipe Generator

Don't need a full meal plan? Generate individual recipes on demand.

### How to Use

1. From the **Home screen**, click "Generate a Recipe"
2. Or from **My Cookbook**, click "Generate" in the header
3. **Describe what you want** - e.g., "A quick weeknight pasta dish" or "Something healthy with chicken"
4. **Adjust servings** using the +/- buttons
5. Click **Generate Recipe**

### What You Get

- A complete recipe tailored to your description
- Ingredients adjusted for your serving size
- Step-by-step instructions
- Option to generate an AI image
- Nutrition information (click the Nutrition button)
- Save to your cookbook for later

### Tips for Better Results

- Be specific: "A creamy Italian pasta with mushrooms" works better than "pasta"
- Mention cooking style: "one-pot", "air fryer", "slow cooker"
- Include dietary needs: "vegan", "low-carb", "high-protein"
- The AI uses your saved preferences and pantry items automatically

---

## AI Pantry Scanner

Quickly add ingredients to your pantry using multiple methods: photos, video, or voice.

### Input Methods

#### Photo Scanning
1. Go to **Pantry Settings** (during meal plan setup or in Settings)
2. Click the purple **"Scan with Photos"** button
3. **Take photos or upload images** of your:
   - Refrigerator shelves
   - Freezer contents
   - Pantry/cupboard shelves
   - Grocery bags
4. Add multiple images for thorough scanning
5. Click **Scan for Ingredients**

#### Video Scanning
1. Click **"Video Scan"** in the pantry manager
2. Either record directly or upload an existing video
3. Walk through your kitchen showing fridge, pantry, and freezer
4. AI extracts frames and identifies all visible items
5. Review and select items to add

#### Voice Dictation (Talk to Add)
1. Click **"Talk to Add"** in the pantry manager
2. Grant microphone permission when prompted
3. Simply say your items: *"I have milk, eggs, bread, chicken, and some pasta"*
4. AI transcribes in real-time and extracts items
5. Review detected items and add with one click

#### Audio Upload
1. Click **"Upload Audio"** in the pantry manager
2. Upload a pre-recorded audio file (MP3, M4A, WAV, etc.)
3. AI transcribes the audio and extracts pantry items
4. Review and select items to add

### Review & Select

After AI analysis:
- Items are organized by category (Produce, Dairy, Meat, Frozen, etc.)
- **Check or uncheck** items to include
- Use **Select All** or **Clear All** for quick selection
- Click **Add Items to Pantry**

### Smart Quantity Detection

The AI scanner automatically estimates quantities for your pantry items:

- **Specific item types** - AI identifies exact types like "balsamic vinegar" instead of just "vinegar"
- **Quantity estimates** - For visible items, AI estimates remaining amounts:
  - Countable items: "eggs (6)", "apples (3)"
  - Containers: "olive oil (~500ml remaining)", "milk (~1L remaining)"
  - Packaged items: "pasta (~400g)", "rice (~1kg)"
- **Edit quantities** - After adding items, click any item to adjust its quantity and unit

### Managing Quantities

For each pantry item, you can:
1. **Click the item** to open the quantity editor
2. **Enter the amount** (numeric value)
3. **Select or type a unit** (g, kg, ml, L, pieces, etc.)
4. **Preview** your changes before saving
5. **Clear** to remove quantity information

### Upload Mode Options

When adding scanned items to an existing pantry, you can choose:
- **Add New Items Only** - Only add items not already in your pantry (recommended)
- **Replace All Items** - Clear existing pantry and replace with scanned items

### Media File Management

Video and audio files are stored temporarily:
- Files are automatically deleted after **10 days**
- View your uploaded files in **Settings > Account > Uploaded Media Files**
- Each file shows days until automatic deletion
- Delete files manually if no longer needed
- Your extracted pantry items are saved permanently (only the media files expire)

### Tips

- Take clear, well-lit photos
- Capture labels when possible for better identification
- Multiple angles help identify more items
- For video, speak clearly about what you're showing
- Voice dictation works best in quiet environments

### Why Use It?

- **Faster setup** - No manual typing of each ingredient
- **Multiple input methods** - Choose what works best for you
- **Better meal plans** - AI knows exactly what you have
- **Reduced waste** - Plans use ingredients before they expire
- **Smaller shopping lists** - Excludes items you already own
- **Enables "Use What I Have" mode** - See [Use What I Have Mode](#use-what-i-have-mode) for how to maximize your scanned items

### Workflow: Scan → Plan → Cook

For the best experience, follow this workflow:

1. **Scan your kitchen** - Use photos, video, or voice to capture what you have
2. **Review and add items** - Check the AI's suggestions and add to your pantry
3. **Enable "Use What I Have"** - Turn on the smart mode when creating a meal plan
4. **Generate your plan** - AI creates recipes prioritizing your ingredients
5. **Shop minimally** - Only buy the few items you're missing
6. **Cook and enjoy!** - Make meals with what you already had

---

## Pantry Staples

Track items you always keep in stock and create quick shopping lists for restocking.

### What are Staples?

Staples are pantry items that you always want to have on hand. Unlike regular pantry items that come and go, staples are essentials you want to maintain at all times - like olive oil, salt, pasta, rice, or your favorite sauces.

### Setting Up Staples

1. Go to **Pantry Settings** (during meal plan setup or in Settings)
2. You'll see two tabs: **Pantry Items** and **Staples**
3. In the Pantry Items tab, hover over any item
4. Click the **star icon** (⭐) to mark it as a staple
5. The item moves to the Staples tab

### Managing Staples

#### Viewing Staples
- Click the **Staples** tab in the pantry manager
- See all your staple items in one place
- A badge shows how many items need restocking

#### Marking Items for Restock
When you run low on a staple:
1. Go to the **Staples** tab
2. **Check the box** next to items you need to buy
3. Items marked for restock show a "Need to buy" badge
4. A red banner appears showing your shopping list summary

#### Shopping Completed
After buying your staples:
1. The red banner shows all items needing restock
2. Click the green **"Shopping Completed"** button
3. All restock checkboxes are cleared
4. Start fresh for your next shopping trip

### Removing Staples

To remove an item from staples (not delete it):
1. Go to the **Staples** tab
2. Click the **filled star icon** on the item
3. The item returns to regular pantry items

### Benefits of Staples

- **Never run out** - Track essentials separately from temporary items
- **Quick shopping lists** - Checkbox items you need with one click
- **Easy reset** - Clear your list after shopping with one button
- **Visual organization** - See regular pantry vs. always-stock items
- **Badge notifications** - Know at a glance if staples need restocking

### Best Practices

1. **Start with basics** - Mark 5-10 essential items as staples
2. **Review weekly** - Check which staples need restocking
3. **Keep it manageable** - Too many staples defeats the purpose
4. **Be specific** - "Olive Oil" is better than just "Oil"
5. **Update regularly** - Add new essentials, remove ones you no longer use

### Example Workflow

1. Mark "Olive Oil", "Pasta", "Rice", and "Garlic" as staples
2. During the week, notice you're low on olive oil and pasta
3. Check those two items in the Staples tab
4. Go shopping, buy olive oil and pasta
5. Click "Shopping Completed" to clear the list
6. Ready for next week!

### Clearing Your Pantry

Need to start fresh? Use the clear buttons at the bottom of each tab:

#### Empty My Pantry
- Removes **all regular pantry items** (non-staples)
- Useful when moving, doing a kitchen reset, or starting over
- Your staples remain untouched
- Click "Empty My Pantry" at the bottom of the Pantry Items tab

#### Empty My Staples
- Removes **all staple items**
- Your regular pantry items remain untouched
- Click "Empty My Staples" at the bottom of the Staples tab

**Warning**: Both actions require confirmation and cannot be undone. Items are permanently deleted from your account.

---

## Nutritional Information

View detailed nutritional information for any recipe with AI-calculated macros.

### Accessing Nutrition Info

1. **From a generated recipe**: Click the green **"Nutrition"** button
2. **From the cookbook**: Open any recipe and click **"Nutrition"**
3. **From single recipe generator**: Click **"Nutrition"** after generating

### What's Included

#### Per Serving Breakdown

| Nutrient | Information |
|----------|-------------|
| **Calories** | Total energy per serving |
| **Protein** | Grams with visual bar |
| **Carbohydrates** | Grams with visual bar |
| **Fat** | Grams with visual bar |
| **Fiber** | Grams (when available) |
| **Sugar** | Grams (when available) |

#### Additional Details

- **Serving size** - How much one serving is
- **Servings per recipe** - Total portions
- **Micronutrients** - Sodium, cholesterol, vitamins (when applicable)
- **Health notes** - AI insights about the nutritional profile

### Understanding the Display

- **Visual bars** show macro proportions relative to recommended daily values
- **Color coding**: Protein (blue), Carbs (orange), Fat (purple)
- Values are **per serving**, not for the entire recipe

### Accuracy Notes

- Nutrition is AI-estimated based on typical ingredient values
- Actual values may vary based on specific brands and preparation
- Use as a guide, not medical advice
- For precise tracking, verify with actual product labels

---

## AI Recipe Adjustments

> **Pro Feature**: AI Recipe Adjustments are available with a Pro subscription.

Let AI modify any recipe to fit your dietary goals and preferences.

### Accessing Recipe Adjustments

1. Open any recipe in your cookbook
2. Click the **"Adjust"** button (purple icon)
3. The AI Adjustment panel opens

### What You Can Adjust

| Adjustment Type | Description |
|----------------|-------------|
| **Increase Protein** | Add more protein-rich ingredients |
| **Reduce Carbs** | Lower carbohydrate content |
| **Make Vegetarian** | Substitute meat with plant-based alternatives |
| **Lower Calories** | Reduce overall calorie count |
| **Add Fiber** | Increase fiber content |
| **Reduce Sodium** | Lower salt and sodium levels |
| **Custom Adjustments** | Describe any changes you'd like |

### How It Works

1. **Select an adjustment type** or describe your custom changes
2. **Click "Adjust"** to let AI reformulate the recipe
3. **Preview the changes** including new ingredients and instructions
4. **Save the adjusted recipe** as a new entry in your cookbook

### Tips for Best Results

- Be specific about your dietary goals
- You can combine multiple adjustments
- The original recipe is preserved—adjustments create a new version
- Check nutrition info after adjusting to verify changes

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

> **Pro Feature**: Recipe uploads (URL, Image, PDF, Text) are available with a Pro subscription.

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

## Recipe Categories

Create custom categories to organize your cookbook exactly how you want.

### What are Categories?

Categories are **personal labels** you create to organize your recipes. Unlike tags (which are auto-generated by AI), categories are entirely your own - create them, name them, and assign recipes however you like.

### Creating Categories

1. **Open any recipe** from your cookbook
2. Find the **"My Categories"** section below Tags
3. Click the **+ Category** button
4. Type a category name (e.g., "Weeknight Dinners", "Kids Favorites", "Holiday Meals")
5. Press Enter or click to create and assign it

### Assigning Categories

Assign recipes to categories in two ways:

#### From Recipe View
1. Open a recipe in your cookbook
2. Click the **+ Category** button
3. **Select existing categories** by checking them
4. **Create new categories** by typing and pressing Enter
5. Changes save automatically

#### Multi-Select Dropdown
- Type to filter existing categories
- Check/uncheck to assign or remove
- Create new categories on the fly
- Categories appear as colored badges on your recipes

### Filtering by Category

1. In your cookbook, look for the **Categories:** filter row
2. Click any category badge to filter
3. Only recipes in that category are shown
4. Click again to clear the filter
5. Combine with tag and search filters

### Category Colors

Each category has a unique color badge:
- Colors are automatically assigned
- Makes it easy to spot categories at a glance
- Color-coded badges appear on recipe cards

### Best Practices

1. **Keep it simple** - Start with 3-5 categories
2. **Be specific** - "Quick Lunches" is better than "Lunch"
3. **Use consistently** - Assign categories as you save recipes
4. **Review periodically** - Remove categories you don't use

### Example Categories

| Category | Purpose |
|----------|---------|
| **Weeknight Dinners** | Quick meals for busy evenings |
| **Meal Prep** | Recipes good for batch cooking |
| **Guest Worthy** | Impressive dishes for entertaining |
| **Kids Favorites** | Family-friendly recipes |
| **Healthy Options** | Lower calorie, nutritious meals |
| **Comfort Food** | Indulgent classics |
| **Holiday Meals** | Seasonal and celebratory dishes |

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

Generate smart shopping lists from your cookbook and meal plans.

### Master Shopping List

The Master Shopping List consolidates everything you need to buy in one place:

#### What's Included
- **Meal plan ingredients** - Items from any meal plans you've added
- **Cookbook recipe ingredients** - Items from selected recipes
- **Pantry staples for restock** - Staples marked as needing purchase
- **Pantry items for restock** - Regular pantry items flagged for restocking

#### Sorting Options

Choose how to organize your shopping list:

| Sort Mode | Description |
|-----------|-------------|
| **Source** | Group by where items came from (plans, recipes, staples, pantry) |
| **Category** | Group by food type (Produce, Dairy, Meat, etc.) |
| **Store Layout** | Group by your custom supermarket aisle order |

### Supermarket Layouts

> **Pro Feature**: Custom supermarket layouts are available with a Pro subscription.

Create custom layouts that match how your local store is organized:

#### Creating a Layout
1. In the Master Shopping List, select **Store Layout** sort mode
2. Click **Manage Layouts**
3. Click **+ New Layout** and give it a name
4. **Drag and drop** categories to match your store's aisle order
5. Click **Save** when done

#### Managing Layouts
- **Multiple layouts** - Save layouts for different stores you shop at
- **Set default** - Click the star icon to set your preferred layout
- **Edit anytime** - Reorder categories as stores change
- **Delete** - Remove layouts you no longer need

#### Using Layouts
1. Select **Store Layout** from the sort options
2. Choose your layout from the dropdown
3. Items are now grouped by your custom aisle order
4. Shop efficiently by following your store's layout

### Custom Categories

Create your own categories beyond the 18 default ones:

#### Creating Custom Categories
1. Open **Manage Layouts** in the shopping list
2. Scroll down to **Create Custom Category**
3. Enter your category name (e.g., "Pet Supplies", "Organic", "Bulk Foods")
4. Click **Add** or press Enter
5. Your custom category appears in purple and can be used in any layout

#### Using Custom Categories
- Custom categories appear in **purple** to distinguish them from defaults
- Add them to any layout by clicking the purple + button
- Drag them to reorder within your layout
- They persist across all your layouts

#### Deleting Custom Categories
- Click the **trash icon** next to any custom category to remove it
- The category will be removed from all layouts using it
- Default categories cannot be deleted

#### Default Categories
The app includes 18 default categories:
- Produce, Bakery, Dairy, Meat & Seafood
- Deli, Frozen, Pantry, Canned Goods
- Condiments & Sauces, Snacks, Beverages
- Breakfast, Baking, Spices & Seasonings
- International, Health & Beauty, Household, Other

### Selecting Recipes for Shopping
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

### Exporting Shopping Lists

Export your shopping list to take with you:

#### Export to iOS Reminders
1. Click the **Share** button in the Master Shopping List
2. Select **Reminders** or your preferred app
3. Items are formatted as a checklist you can mark off while shopping

#### Export to PDF
1. Click the **PDF** button in the Master Shopping List
2. A branded PDF is generated with:
   - Kiwi Meal Planner header
   - Items organized by your selected sort mode
   - Professional formatting for easy reading
3. Save or print the PDF to take shopping

#### Print Preview
1. Click the **Print** button to open print preview
2. Review the formatted list
3. Print directly or save as PDF from your browser

---

## Portions & Macro Targets

Customize your nutrition goals to get personalized meal plans and recipe adjustments.

### Accessing Portion & Macro Settings

1. Go to **Settings** → **Preferences**
2. Click the **Macros** tab
3. Configure your daily targets

### Portion Settings

| Setting | Description |
|---------|-------------|
| **Meat per Person** | Target protein serving size in grams (e.g., 150-200g) |
| **Daily Calories** | Your target daily calorie intake |

These settings guide the AI when generating meal plans, ensuring recipes match your portion preferences.

### Macro Targets (Pro Feature)

Pro users can set custom daily macro nutrient targets:

| Macro | Default | Description |
|-------|---------|-------------|
| **Calories** | 2000 kcal | Daily energy target |
| **Protein** | 50g | Muscle building and repair |
| **Carbohydrates** | 250g | Energy source |
| **Fat** | 65g | Essential nutrients |
| **Fiber** | 25g | Digestive health (minimum) |
| **Sugar** | 50g | Daily limit (maximum) |
| **Sodium** | 2300mg | Daily limit (maximum) |
| **Saturated Fat** | 20g | Daily limit (maximum) |

#### Setting Custom Targets

1. Navigate to **Preferences** → **Macros** tab
2. Adjust each value using the input fields
3. Click **Save Targets** to save your changes
4. Click **Reset to defaults** to restore recommended values

### How Macros Are Used

#### In Meal Plan Generation
When generating meal plans, the AI considers your macro targets to:
- Balance daily nutrition across all meals
- Suggest recipes that fit your calorie goals
- Prioritize protein-rich options if you have higher protein targets

#### In Recipe Nutrition Info
When viewing nutrition information for any recipe:
- Your daily targets are shown alongside actual values
- Percentage of daily target is calculated for each macro
- Color-coded indicators show how the recipe fits your goals:
  - **Green**: Within optimal range
  - **Amber**: Moderate deviation
  - **Red**: Significant deviation (for limits like sugar/sodium)

#### Adjust Recipe to My Macros (Pro Feature)

For any recipe in your cookbook, you can automatically adjust it to fit your nutrition targets:

1. Open any recipe from your cookbook
2. Click the **"Fit My Macros"** button (Pro feature)
3. The AI reformulates the recipe to match your saved macro targets:
   - Adjusts portion sizes
   - Suggests ingredient substitutions
   - Modifies cooking methods if needed
4. Preview the changes before saving
5. Save as a new recipe to your cookbook

This feature works with both AI-generated recipes and your uploaded recipes, making it easy to personalize any dish.

### Best Practices

1. **Start with defaults** - The recommended values are based on general nutrition guidelines
2. **Consult a professional** - For specific dietary needs, consult a nutritionist
3. **Be realistic** - Set achievable targets you can maintain
4. **Review regularly** - Update targets as your goals change

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
4. Optionally attach a screenshot or screen recording (see below)
5. Submit

### Attaching Screenshots

Screenshots help us understand issues faster:

1. Click the **📷 Screenshot** button in the feedback dialog
2. A screenshot of your current screen is captured automatically
3. The screenshot appears as a preview in the feedback form
4. Click **×** on the preview to remove it if needed
5. Submit your feedback with the screenshot attached

**Tips for screenshots:**
- Navigate to the screen showing the issue before opening feedback
- The screenshot captures exactly what you see
- Useful for UI bugs, layout issues, or showing specific errors

### Recording Your Screen

For complex issues or step-by-step problems, record a video:

1. Click the **🎥 Record** button in the feedback dialog
2. Your browser will ask permission to record the screen
3. Select which screen/window/tab to share
4. Perform the actions that demonstrate the issue
5. Click **Stop Recording** when finished
6. The recording appears as a preview in the feedback form
7. Submit your feedback with the video attached

**Tips for screen recordings:**
- Keep recordings short (under 30 seconds is ideal)
- Focus on reproducing the specific issue
- Narrate or annotate if helpful (your microphone can be included)
- Great for demonstrating bugs that are hard to describe

### What Gets Captured

| Attachment | Format | Best For |
|------------|--------|----------|
| **Screenshot** | PNG image | Static UI issues, error messages, layout problems |
| **Recording** | WebM video | Step-by-step bugs, interaction issues, "how to reproduce" |

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

### v2.6.0 (Current)
- **Custom Shopping Categories** - Create your own shopping list categories beyond the 18 defaults
- **Smart Quantity Detection** - AI scanner now estimates remaining quantities for pantry items
- **Quantity Editor** - Click any pantry item to set or edit its quantity and unit
- **Empty Pantry/Staples** - One-click buttons to clear all pantry items or staples
- **App-Styled Confirmations** - All confirmation dialogs now use consistent app styling
- **Enhanced Pantry Scanning** - AI identifies specific item types (e.g., "balsamic vinegar" not just "vinegar")

### v2.5.0
- **Recipe Categories** - Create custom categories to organize your cookbook
- **Category Filtering** - Filter recipes by your custom categories
- **Improved Meal Plan Flow** - Settings/Pantry/Preferences now shown as step-by-step flow below navigation
- **UI Improvements** - Better navigation and layout consistency

### v2.3.0
- **Custom Macro Targets** - Pro users can set personalized daily nutrition targets
- **Fit My Macros** - Pro feature to automatically adjust any recipe to match your macro goals
- **Nutrition Comparison** - See how recipes compare to your daily targets
- **Preference Sub-tabs** - Reorganized preferences into Meal Prefs, Allergies, and Macros tabs

### v2.2.0
- **Master Shopping List** - Consolidated shopping list from meal plans, recipes, staples, and pantry
- **Supermarket Layouts** - Save custom store layouts with drag-and-drop category ordering
- **Multiple Sort Modes** - Sort by source, category, or store layout
- **Export to iOS Reminders** - Share shopping list to Reminders app
- **Export to PDF** - Generate branded PDF shopping lists
- **Print Preview** - Print-friendly shopping list view

### v2.1.0
- **Shopping List Selections** - Persist selected plans and recipes for shopping lists
- **Checked Items Sync** - Remember checked-off items across sessions
- **Database Integration** - Shopping list selections saved to cloud

### v2.0.0
- **Video Pantry Scanning** - Record or upload videos to scan your kitchen
- **Voice Dictation** - Talk to the app to add pantry items in real-time
- **Audio Upload** - Upload pre-recorded audio files for AI transcription
- **Upload Mode Options** - Choose to replace all pantry items or add only new ones
- **Media File Management** - View and manage uploaded video/audio with 10-day auto-cleanup
- **Admin AI Instructions** - Behind-the-scenes AI rules for better scanning results
- Updated landing page with video and voice scanning features

### v1.0.9
- **Pantry Staples** - Track essential items you always keep in stock
- Mark pantry items as staples with the star icon
- Checkbox system to add staples to shopping list for restocking
- "Shopping Completed" button to clear restock list after shopping
- Badge notifications showing items needing restock

### v1.0.8
- **Use What I Have mode** - AI prioritizes your pantry ingredients to minimize shopping
- Smart mode toggle in meal plan configuration and single recipe generator
- Featured "Use What I Have" button on welcome screen for quick access
- Updated landing page with kitchen scanning and recipe upload feature highlights

### v1.0.7
- Single recipe generator - create individual recipes on demand
- AI Pantry Scanner - photograph your fridge/pantry to add ingredients
- Nutritional information - view macros and nutrition for any recipe
- Multi-image pantry scanning with categorized results

### v1.0.6
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
