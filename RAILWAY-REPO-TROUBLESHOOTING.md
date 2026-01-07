# Railway "No Repositories Found" - Troubleshooting

If you already have a GitHub repository but Railway can't see it, try these fixes:

## Fix 1: Authorize Railway to Access GitHub

1. Go to [railway.app](https://railway.app)
2. Click your **profile icon** (top right)
3. Go to **Settings** → **Connected Accounts**
4. Make sure **GitHub** is connected
5. If not connected, click **"Connect GitHub"**
6. Authorize Railway to access your repositories
7. Make sure you grant access to **all repositories** or at least the one you need

## Fix 2: Check Repository Visibility

1. Go to your GitHub repository
2. Check if it's **Private** or **Public**
3. If private, make sure Railway has access:
   - Railway Settings → Connected Accounts → GitHub
   - Check "Access to private repositories" is enabled

## Fix 3: Check Repository Owner

1. Make sure you're logged into Railway with the **same GitHub account** that owns the repository
2. If the repo is in an organization, make sure:
   - Railway has access to that organization
   - You have admin rights to connect Railway

## Fix 4: Refresh Repository List

1. In Railway, when selecting "Deploy from GitHub repo"
2. Try clicking **"Refresh"** or **"Reload"** button
3. Or close and reopen the repository selection

## Fix 5: Search for Repository

1. In Railway's repository selection, use the **search box**
2. Type your repository name (e.g., "riddick-chess")
3. Sometimes repositories don't show in the list but can be found via search

## Fix 6: Check Repository Name

1. Make sure you're searching for the exact repository name
2. Check your GitHub: [github.com/YOUR_USERNAME?tab=repositories](https://github.com)
3. Note the exact repository name and search for it in Railway

## Fix 7: Use Repository URL Directly

Some Railway interfaces allow you to paste the GitHub URL directly:
1. Copy your repository URL: `https://github.com/YOUR_USERNAME/riddick-chess-v2`
2. In Railway, look for "Paste repository URL" option
3. Or try the "Import" option if available

## Fix 8: Reconnect GitHub Account

1. Railway Dashboard → Settings → Connected Accounts
2. Disconnect GitHub
3. Reconnect GitHub
4. Make sure to grant all necessary permissions

## Fix 9: Use Railway CLI Instead

If the web interface still doesn't work:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project (create empty project first in dashboard)
railway link

# Deploy
railway up
```

## Fix 10: Check Railway Status

1. Check if Railway is having issues: [status.railway.app](https://status.railway.app)
2. Try again later if there are service issues

## Still Not Working?

1. **Check Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
2. **Railway Support**: Check Railway dashboard for support options
3. **Alternative**: Use Railway CLI to deploy without GitHub connection (see `DEPLOY-WITHOUT-GITHUB.md`)

## Quick Test

To verify Railway can see your GitHub:
1. Go to Railway Dashboard
2. Click **"New Project"**
3. Click **"Deploy from GitHub repo"**
4. You should see a list of your repositories
5. If the list is empty, it's a permissions/authorization issue




