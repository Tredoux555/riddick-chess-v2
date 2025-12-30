# Connect Your Local Repository to GitHub

Your local repository exists but isn't connected to GitHub yet. Here's how to connect it:

## Step 1: Find Your GitHub Repository URL

1. Go to your GitHub repository on [github.com](https://github.com)
2. Click the green **"Code"** button
3. Copy the HTTPS URL (looks like: `https://github.com/YOUR_USERNAME/riddick-chess-v2.git`)

## Step 2: Connect Local Repo to GitHub

Run these commands (replace YOUR_USERNAME and REPO_NAME):

```bash
cd /Users/Riddick/Desktop/riddick-chess-v2

# Add GitHub as remote
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Verify it's connected
git remote -v
```

## Step 3: Push Your Code

```bash
# Make sure you're on main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 4: Now Try Railway Again

1. Go back to Railway
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Your repository should now appear!

## If You Get "Repository Already Exists" Error

If your GitHub repo already has files (like a README), you might need to pull first:

```bash
# Pull and merge
git pull origin main --allow-unrelated-histories

# Then push
git push -u origin main
```

## Quick Command (Replace YOUR_USERNAME)

```bash
cd /Users/Riddick/Desktop/riddick-chess-v2
git remote add origin https://github.com/YOUR_USERNAME/riddick-chess-v2.git
git branch -M main
git push -u origin main
```

After this, Railway should be able to see your repository!



