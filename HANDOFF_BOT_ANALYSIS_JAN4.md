# RIDDICK CHESS BOT & ANALYSIS - HANDOFF DOCUMENT
## Date: January 4, 2026

---

## SUMMARY
Added bot opponents and AI game analysis features to Riddick Chess. Most features working, some in-progress.

---

## COMPLETED FEATURES

### 1. Bot Opponents System
**6 Bots Available:**
| Bot | ELO | Emoji | Skill Level |
|-----|-----|-------|-------------|
| Baby Bot | 400 | 🐣 | 0 |
| Beginner Bot | 800 | 🤖 | 3 |
| Intermediate Bot | 1200 | 🧠 | 8 |
| Advanced Bot | 1600 | 💪 | 12 |
| Master Bot | 2000 | 🎓 | 16 |
| Stockfish | 3200 | 💀 | 20 |

**Files Created/Modified:**
- `server/services/botEngine.js` - Pure JS chess AI with minimax/alpha-beta pruning
- `server/routes/bots.js` - Bot game API endpoints
- `server/routes/analysis.js` - Game analysis endpoints
- `server/init-db.js` - Added tables: bots, bot_games, game_analyses, move_evaluations
- `client/src/components/BotGame.jsx` - Main game interface
- `client/src/components/BotSelection.jsx` - Bot selection screen
- `client/src/components/GameAnalysis.jsx` - Analysis viewer
- `client/src/components/AnalyzeButton.jsx` - Analysis trigger button

### 2. Database Tables Added
```sql
-- Bots table (pre-seeded with 6 bots)
bots (id, name, emoji, elo, skill_level, personality, is_active)

-- Bot games
bot_games (id, user_id, bot_id, user_color, fen, moves, pgn, status, result, timestamps)

-- Game analysis
game_analyses (id, game_id, game_type, user_id, pgn, status, white_accuracy, black_accuracy, analysis_data, timestamps)

-- Move evaluations
move_evaluations (id, analysis_id, move_number, color, move_played, best_move, eval_before, eval_after, eval_change, classification)
```

### 3. Auth Pattern (IMPORTANT)
All client components use JWT Bearer token auth:
```javascript
import { useAuth } from '../contexts/AuthContext';
const { token } = useAuth();

// Every fetch needs:
headers: { 'Authorization': `Bearer ${token}` }
```

### 4. Routes Added
- `/bots` - Bot selection page
- `/bot-game/:gameId` - Active bot game
- `/analysis/:analysisId` - Game analysis view

---

## IN-PROGRESS / ISSUES

### 1. BotGame.jsx - INCOMPLETE
The file was being rewritten when user requested handoff. Current state:
- First ~170 lines written
- Missing: render return statement
- Need to add user preferences integration for board/pieces

**What was being added:**
- Board theme from user preferences (classic, blue, green, purple, wood)
- Piece sets from user preferences (neo, cburnett, merida, alpha, classic)
- Using Lichess CDN for piece images (works in China, chess.com may be blocked)

**Board Themes:**
```javascript
const BOARD_THEMES = {
  classic: { light: '#f0d9b5', dark: '#b58863' },
  blue: { light: '#dee3e6', dark: '#8ca2ad' },
  green: { light: '#eeeed2', dark: '#769656' },
  purple: { light: '#e8e0f0', dark: '#7b61a8' },
  wood: { light: '#e8d0aa', dark: '#a87c50' }
};
```

**Piece URLs (Lichess CDN - works in China):**
```javascript
const PIECE_URLS = {
  neo: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150',
  cburnett: 'https://lichess1.org/assets/piece/cburnett',
  merida: 'https://lichess1.org/assets/piece/merida',
  alpha: 'https://lichess1.org/assets/piece/alpha',
  classic: 'https://lichess1.org/assets/piece/maestro'
};
```

### 2. Analysis System
- Was loading forever initially
- Fixed to reconstruct PGN from moves array if PGN field empty
- Server route updated with better error handling
- May need further testing

---

## NEXT STEPS TO COMPLETE

### 1. Finish BotGame.jsx
Complete the component with:
- User preferences for board theme and pieces
- Full render method with Chessboard component
- Sidebar with move history, resign button, analyze button

### 2. Test Analysis Flow
1. Start bot game at `/bots`
2. Play a few moves
3. Finish game or resign
4. Click "Analyze Game"
5. Verify analysis completes and displays

### 3. Apply Preferences to Other Components
Also update these files to use user preferences:
- `client/src/components/GameAnalysis.jsx`
- Any other components using Chessboard

---

## KEY FILES REFERENCE

### Server
```
server/
├── services/botEngine.js    # Chess AI engine
├── routes/bots.js           # Bot game endpoints  
├── routes/analysis.js       # Analysis endpoints
├── init-db.js               # Database schema (lines ~400-450 for bot tables)
└── routes/customization.js  # User preferences API
```

### Client
```
client/src/
├── components/
│   ├── BotGame.jsx          # INCOMPLETE - needs finishing
│   ├── BotSelection.jsx     # Working
│   ├── GameAnalysis.jsx     # Working (may need preferences)
│   └── AnalyzeButton.jsx    # Working
├── contexts/AuthContext.jsx # Use for token
└── App.js                   # Routes at lines 102-104
```

---

## API ENDPOINTS

### Bot Games
```
POST /api/bots/start          # Start new bot game
GET  /api/bots/game/:id       # Get game state
POST /api/bots/move           # Make a move
POST /api/bots/resign/:id     # Resign game
GET  /api/bots                # List available bots
```

### Analysis
```
POST /api/analysis/request    # Request new analysis
GET  /api/analysis/:id        # Get analysis status/results
POST /api/analysis/position   # Analyze single position
GET  /api/analysis/history    # User's analysis history
```

### Customization
```
GET  /api/customization/preferences  # Get user prefs
PUT  /api/customization/preferences  # Update user prefs
GET  /api/customization/themes       # List board themes
GET  /api/customization/pieces       # List piece sets
```

---

## DEPLOYMENT
- Platform: Railway
- Repo: github.com/Tredoux555/riddick-chess-v2
- Domain: riddickchess.site
- Last commit: dbe2efe (Fix analysis)

---

## QUICK START FOR NEW CHAT

```
I'm working on Riddick Chess at /Users/Riddick/Desktop/riddick-chess-v2

TASK: Complete the bot game feature with user customization

1. BotGame.jsx is incomplete - needs the render method finished
2. Should use user's board theme and piece set from /api/customization/preferences
3. Board themes: classic, blue, green, purple, wood
4. Piece sets: neo, cburnett, merida, alpha, classic (use Lichess CDN)

Read the current BotGame.jsx and complete it with:
- Chessboard using user's preferred theme/pieces
- Move history sidebar
- Resign button (when game active)
- Analyze button (when game complete)
- Back to bots link

Then deploy with: git add . && git commit -m "message" && git push
```

---

## NOTES
- User is in Beijing, China - chess.com CDN may be blocked, use Lichess CDN
- Site was showing Google briefly (DNS issue) but resolved
- "Loading forever" usually means client-side infinite loop or blocked external resource
