<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Kiwi Meal Planner

AI-powered meal planning application that generates personalized weekly meal plans based on your preferences, dietary restrictions, and pantry inventory.

## Features

- **AI Meal Planning** - Generate custom weekly meal plans using Google Gemini AI
- **Smart Shopping Lists** - Consolidated lists that account for your pantry
- **Recipe Cookbook** - Save favorites and upload your own recipes
- **Recipe Upload** - Import recipes from URLs, images, PDFs, or text
- **AI Auto-Tagging** - Recipes automatically tagged by cuisine, dietary, and meal type
- **Public Sharing** - Share recipes with the community
- **PWA Support** - Install as an app, works offline

## Documentation

> **IMPORTANT FOR DEVELOPERS**: Documentation must be kept up-to-date when features are added or modified.

| Document | Purpose |
|----------|---------|
| [USER_GUIDE.md](USER_GUIDE.md) | Complete end-user documentation |
| [components/HelpModal.tsx](components/HelpModal.tsx) | In-app help (must match USER_GUIDE.md) |
| [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) | Database migration instructions |

When adding or updating features:
1. Update `USER_GUIDE.md` with user-facing documentation
2. Update `components/HelpModal.tsx` to match
3. Update this README if it affects setup or architecture

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env.local`:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

## Database Setup

The app uses Supabase for data storage. Run migrations in order:

```bash
# In Supabase SQL editor, run:
# 1. supabase/migrations/001_initial_schema.sql
# 2. supabase/migrations/002_cookbook_enhancements.sql
# 3. supabase/migrations/003_comments_and_ratings.sql
```

See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for details.

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **AI**: Google Gemini API (gemini-2.0-flash, gemini-2.5-flash-image)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Google OAuth, Email)
- **Build**: Vite

## Project Structure

```
├── components/          # React components
│   ├── HelpModal.tsx   # In-app help guide
│   ├── FavoritesView.tsx # Cookbook/recipes view
│   └── ...
├── services/           # API and data services
│   ├── geminiService.ts # AI integration
│   ├── recipeService.ts # Recipe CRUD
│   └── storageService.ts # Data persistence
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── supabase/           # Database migrations
└── types.ts            # TypeScript types
```

## License

MIT
