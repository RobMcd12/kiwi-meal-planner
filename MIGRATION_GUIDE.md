# Migration Guide: Moving to a New Google Account

This guide explains how to transfer the **Kiwi Meal Planner** app and your data to a new Google Account context.

Since this application runs client-side (in your browser), "moving" it implies two things:
1.  Using a new **API Key** (billed to a different Google Cloud Project).
2.  Moving your **Personal Data** (Pantry, Favorites) to the new instance.

## Step 1: Export Your Data
Before switching environments, save your current data.

1.  Open the App.
2.  Click the **Settings** (gear icon) in the top right.
3.  Go to the **Data** tab.
4.  Click **Export Backup**.
5.  Save the `.json` file to your computer.

## Step 2: Get a New API Key
You need a new key from your new Google Account.

1.  Log out of your old Google Account.
2.  Log in to [Google AI Studio](https://aistudio.google.com/) with your **NEW** Google Account.
3.  Click **Get API key**.
4.  Click **Create API key** (you may need to create a new Google Cloud project).
5.  Copy the key string (starts with `AIza...`).

## Step 3: Update the Application
How you update the key depends on how you are running the app:

### If running locally (VS Code):
1.  Open the project folder in VS Code.
2.  Open the `.env` file.
3.  Replace the value of `VITE_API_KEY` with your **NEW** key.
4.  Restart the dev server (`npm run dev` or stop/start the terminal).

### If deployed (Vercel/Netlify):
1.  Log in to your hosting provider dashboard (e.g., Vercel).
2.  Go to **Settings > Environment Variables**.
3.  Edit `VITE_API_KEY` with the **NEW** key.
4.  Redeploy the project.

## Step 4: Import Your Data
Once the app is running with the new key:

1.  Open the fresh version of the App.
2.  Click **Settings** (gear icon).
3.  Go to the **Data** tab.
4.  Click **Import** and select the `.json` file you saved in Step 1.
5.  The app will reload, and your Pantry, Favorites, and Preferences will be restored.
