# Deploy to Railway Without GitHub

If you don't want to push to GitHub, you can deploy directly using Railway CLI.

## Step 1: Install Railway CLI

```bash
npm i -g @railway/cli
```

## Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authorize Railway.

## Step 3: Create Empty Project in Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Empty Project"**
3. Give it a name (e.g., "riddick-chess")
4. Note the project name/ID

## Step 4: Link Your Local Project

```bash
cd /Users/Riddick/Desktop/riddick-chess-v2
railway link
```

Select the project you just created.

## Step 5: Add PostgreSQL

In Railway dashboard:
1. Click **"+ New"** in your project
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway automatically sets `DATABASE_URL`

## Step 6: Set Environment Variables

In Railway dashboard:
1. Click on your **service** (should be created automatically)
2. Go to **Variables** tab
3. Add:
   - `JWT_SECRET=your-secret-key-here`
   - `NODE_ENV=production`
   - `CLIENT_URL=https://your-app.railway.app`

## Step 7: Deploy

```bash
# Make sure you're in the project root
cd /Users/Riddick/Desktop/riddick-chess-v2

# Deploy to Railway
railway up
```

## Step 8: Set Root Directory

In Railway dashboard:
1. Click on your service
2. Go to **Settings**
3. Set **Root Directory** to: `server`
4. Railway will redeploy automatically

## Step 9: Run Migration

In Railway dashboard:
1. Click on your service
2. Go to **Shell** tab
3. Run: `node utils/migrate.js`

## Step 10: Get Your URL

1. Click on your service
2. Go to **Settings** → **Networking**
3. Click **"Generate Domain"**

Done! Your app is live.

