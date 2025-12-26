# Push to GitHub - Quick Guide

## Step 1: Initialize Git (if not already)

```bash
cd /Users/Riddick/Desktop/riddick-chess-v2
git init
```

## Step 2: Create .gitignore (if needed)

Make sure you have a `.gitignore` file. Create one if missing:

```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
server/node_modules/
client/node_modules/

# Environment variables
.env
.env.local
.env*.local
server/.env
client/.env

# Build outputs
client/build/
dist/

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Railway
.railway/
EOF
```

## Step 3: Add and Commit Files

```bash
git add .
git commit -m "Initial commit - Riddick Chess v2"
```

## Step 4: Create GitHub Repository

1. Go to [github.com](https://github.com)
2. Click **"+"** → **"New repository"**
3. Name it: `riddick-chess-v2`
4. **Don't** initialize with README (we already have files)
5. Click **"Create repository"**

## Step 5: Push to GitHub

```bash
# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/riddick-chess-v2.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 6: Now Deploy to Railway

1. Go back to Railway
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Now you should see `riddick-chess-v2` in the list!
4. Select it and continue with Railway setup

