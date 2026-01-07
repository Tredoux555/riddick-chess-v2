# Fix GitHub Push Authentication

Your code is committed locally but needs authentication to push to GitHub.

## Option 1: Use GitHub CLI (Easiest)

```bash
# Install GitHub CLI (if not installed)
brew install gh

# Login to GitHub
gh auth login

# Follow the prompts:
# - Choose GitHub.com
# - Choose HTTPS
# - Authenticate in browser
# - Choose "Login with a web browser"

# Then push
cd /Users/Riddick/Desktop/riddick-chess-v2
git push -u origin main
```

## Option 2: Use Personal Access Token

1. **Create a token on GitHub:**
   - Go to: https://github.com/settings/tokens
   - Click **"Generate new token"** → **"Generate new token (classic)"**
   - Name it: "Riddick Chess Push"
   - Select scopes: **repo** (full control of private repositories)
   - Click **"Generate token"**
   - **Copy the token** (you won't see it again!)

2. **Push using token:**
   ```bash
   cd /Users/Riddick/Desktop/riddick-chess-v2
   git push -u origin main
   # When prompted:
   # Username: Tredoux555
   # Password: [paste your token here]
   ```

## Option 3: Set Up SSH (For Future)

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Start SSH agent
eval "$(ssh-agent -s)"

# Add key to agent
ssh-add ~/.ssh/id_ed25519

# Copy public key
cat ~/.ssh/id_ed25519.pub

# Add to GitHub:
# 1. Go to https://github.com/settings/keys
# 2. Click "New SSH key"
# 3. Paste the key
# 4. Save

# Then change remote to SSH
cd /Users/Riddick/Desktop/riddick-chess-v2
git remote set-url origin git@github.com:Tredoux555/riddick-chess-v2.git
git push -u origin main
```

## Quick Check: Does Repository Exist?

Make sure you created the repository on GitHub:
1. Go to: https://github.com/Tredoux555/riddick-chess-v2
2. If it doesn't exist, create it:
   - Go to: https://github.com/new
   - Repository name: `riddick-chess-v2`
   - **Don't** initialize with README
   - Click "Create repository"

## After Successful Push

Once pushed, Railway should be able to see your repository!

1. Go back to Railway
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Search for `riddick-chess-v2`
4. It should appear now!




