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
│   └── functions/      # Edge functions
└── types.ts            # TypeScript types
```

## Email Service

The app includes an edge function for sending emails via [Resend](https://resend.com/).

### Setup

1. Create a Resend account and get your API key
2. Add your domain `kiwimealplans.co.nz` to Resend and verify DNS records
3. Set the secret in Supabase:
   ```bash
   npx supabase secrets set RESEND_API_KEY="re_xxxxx"
   ```
4. Deploy the function:
   ```bash
   npx supabase functions deploy send-email
   ```

### Usage

The `send-email` function accepts POST requests with the following payload:

```typescript
interface EmailRequest {
  to: string | string[];    // Recipient email(s)
  subject: string;          // Email subject
  html?: string;            // HTML content
  text?: string;            // Plain text content (fallback)
  replyTo?: string;         // Reply-to address (optional)
}
```

### Example: Calling from Frontend

```typescript
import { supabase } from './services/authService';

async function sendEmail(to: string, subject: string, html: string) {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { to, subject, html }
  });

  if (error) throw error;
  return data;
}
```

### Example: Calling from Another Edge Function

```typescript
// Internal call using service role key
const response = await fetch(
  `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    },
    body: JSON.stringify({
      to: 'user@example.com',
      subject: 'Your Meal Plan is Ready!',
      html: '<h1>Hello!</h1><p>Your weekly meal plan has been generated.</p>',
    }),
  }
);
```

### Access Control

- **Admin users**: Can send emails via authenticated requests
- **Service calls**: Other edge functions can call using the service role key
- **Regular users**: Cannot send emails directly (prevents abuse)

### Sender Details

- **From**: `Kiwi Meal Planner <noreply@kiwimealplans.co.nz>`
- All emails are sent from this address to maintain brand consistency

## Styling Guidelines

### Popup, Toast & Alert Styling

All error messages, warnings, success messages, and info popups **must** use consistent app styling:

| Type | Background | Border | Text | Icon |
|------|------------|--------|------|------|
| **Error** | `bg-red-50` | `border-red-200` | `text-red-700` | `AlertCircle` (red-500) |
| **Success** | `bg-emerald-50` | `border-emerald-200` | `text-emerald-600` | `CheckCircle` (emerald-500) |
| **Warning** | `bg-amber-50` | `border-amber-200` | `text-amber-700` | `AlertTriangle` (amber-500) |
| **Info** | `bg-blue-50` | `border-blue-200` | `text-blue-600` | `Info` (blue-500) |

**Standard error component pattern:**
```tsx
{error && (
  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
    <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
    <p className="text-sm text-red-700">{error}</p>
  </div>
)}
```

**Key requirements:**
- Always use `rounded-xl` for consistency with app design
- Include appropriate icon from `lucide-react`
- Use border for visual separation
- Icons should have `flex-shrink-0` to prevent squishing

For toast notifications, use the `useToast` hook which handles styling automatically.

## License

MIT
