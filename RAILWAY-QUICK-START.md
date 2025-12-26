# Railway Quick Start (No CLI Needed!)

## 🚀 Deploy in 5 Minutes - Use Web Dashboard Only

### Step 1: Sign Up & Create Project

**Option A: Deploy from GitHub (if repo is on GitHub)**
1. Go to **[railway.app](https://railway.app)**
2. Click **"Start a New Project"** or **"Login"**
3. Sign in with **GitHub**
4. Click **"New Project"** → **"Deploy from GitHub repo"**
5. Select your `riddick-chess-v2` repository
6. Railway will auto-detect it's Node.js

**Option B: Empty Project + Railway CLI (if repo not on GitHub)**
1. Go to **[railway.app](https://railway.app)**
2. Click **"New Project"** → **"Empty Project"**
3. Install Railway CLI: `npm i -g @railway/cli`
4. In your project folder, run:
   ```bash
   railway login
   railway link
   railway up
   ```

**Option C: Push to GitHub First (Recommended)**
If you see "No repositories found", your code isn't on GitHub yet. See `GITHUB-SETUP.md` for instructions to push your code first.

### Step 2: Configure Service
1. Railway will create a service automatically
2. Click on the service
3. Go to **Settings** tab
4. Set **Root Directory** to: `server`
5. Railway will auto-detect the start command

### Step 3: Add PostgreSQL Database
1. In your Railway project, click **"+ New"** (top right)
2. Select **"Database"** → **"Add PostgreSQL"**
3. Wait for it to provision (takes ~30 seconds)
4. **Important**: Railway automatically sets `DATABASE_URL` - you don't need to do anything!

### Step 4: Set Environment Variables
1. Click on your **service** (not the database)
2. Go to **Variables** tab
3. Click **"+ New Variable"** and add:

```
JWT_SECRET=your-super-secret-key-change-this-in-production
NODE_ENV=production
CLIENT_URL=https://your-app-name.railway.app
```

**Note**: `DATABASE_URL` is automatically added - don't set it manually!

### Step 5: Run Database Migration
1. Click on your **service**
2. Go to **Shell** tab (or **Deployments** → **View Logs**)
3. Run this command:
   ```bash
   node utils/migrate.js
   ```
4. Wait for it to complete (you'll see "✅ Migration complete!")

### Step 6: Get Your App URL
1. Click on your **service**
2. Go to **Settings** tab
3. Under **"Networking"**, click **"Generate Domain"**
4. Your app will be available at: `https://your-app-name.railway.app`

### Step 7: (Optional) Seed Puzzles
In the **Shell** tab, run:
```bash
node utils/seedPuzzles.js
```

## ✅ Done!

Your app should now be live! Visit your Railway domain to see it.

## Troubleshooting

### "Team not found" Error
- **Solution**: Use the web dashboard (steps above) instead of CLI
- Make sure you're logged in and have created a project

### Database Connection Error
- Make sure PostgreSQL service is running (green status)
- Check that migration ran successfully
- Verify `DATABASE_URL` is set (should be automatic)

### Build Fails
- Check **Deployments** → **View Logs** for error messages
- Make sure **Root Directory** is set to `server`
- Verify all dependencies are in `package.json`

### App Shows Blank/Error
- Check service logs in Railway dashboard
- Verify environment variables are set correctly
- Make sure migration completed successfully

## Next Steps

1. **Update CLIENT_URL**: Set it to your Railway domain
2. **Set up custom domain** (optional): Settings → Networking → Custom Domain
3. **Configure Google OAuth** (if using): Add `GOOGLE_CLIENT_ID` variable
4. **Monitor**: Check logs and metrics in Railway dashboard

## Need Help?

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Check logs: Service → Deployments → View Logs

