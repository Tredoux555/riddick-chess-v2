# Riddick Chess v2

A full-featured school chess club platform with real-time gameplay, tournaments, puzzles, and achievements.

## Features

- **Real-time Chess Games**: Play against friends or find opponents via matchmaking
- **Glicko-2 Rating System**: Separate ratings for Bullet, Blitz, Rapid, and Classical
- **Swiss Tournaments**: Automatic pairings, Buchholz tiebreakers, live standings
- **Puzzle Training**: Rated puzzles matched to your skill level
- **Puzzle Rush**: Survival and timed modes to test your tactics
- **Achievements**: 20+ achievements across multiple categories
- **Leaderboards**: Rankings for all time controls, puzzles, and achievements
- **Club Features**: Exclusive content and events for verified club members
- **Friends System**: Add friends, see online status, challenge directly
- **Admin Panel**: Manage users, tournaments, and club memberships

## Tech Stack

- **Frontend**: React 18, React Router, Socket.io Client
- **Backend**: Node.js, Express, Socket.io
- **Database**: PostgreSQL
- **Chess Logic**: chess.js
- **Ratings**: glicko2 npm package
- **Auth**: JWT + Google OAuth

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone and install dependencies**

```bash
cd riddick-chess-v2

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

2. **Set up the database**

```bash
# Create PostgreSQL database
createdb riddick_chess

# Or via psql
psql -c "CREATE DATABASE riddick_chess;"
```

3. **Configure environment variables**

```bash
# Server
cd server
cp .env.example .env
# Edit .env with your database credentials and JWT secret

# Client
cd ../client
cp .env.example .env
# Edit if needed (defaults work for local dev)
```

4. **Run database migrations**

```bash
cd server
node utils/migrate.js
```

5. **Seed sample puzzles (optional)**

```bash
node utils/seedPuzzles.js
```

6. **Start the development servers**

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm start
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Project Structure

```
riddick-chess-v2/
├── server/
│   ├── index.js           # Express + Socket.io entry point
│   ├── routes/            # API routes
│   │   ├── auth.js        # Authentication
│   │   ├── users.js       # User profiles
│   │   ├── games.js       # Game history
│   │   ├── friends.js     # Friend system
│   │   ├── tournaments.js # Tournament management
│   │   ├── puzzles.js     # Puzzle training
│   │   ├── achievements.js# Achievement system
│   │   ├── leaderboards.js# Leaderboard queries
│   │   ├── club.js        # Club content
│   │   ├── admin.js       # Admin panel
│   │   └── customization.js # User preferences
│   ├── services/          # Business logic
│   │   ├── ratingService.js     # Glicko-2 ratings
│   │   ├── puzzleService.js     # Puzzle matching
│   │   ├── achievementService.js# Achievement tracking
│   │   └── tournamentService.js # Swiss pairings
│   ├── sockets/           # Real-time handlers
│   │   └── index.js       # Game, matchmaking, chat
│   ├── middleware/        # Auth middleware
│   └── utils/             # DB, migrations, seeds
├── client/
│   ├── src/
│   │   ├── App.js         # Routes
│   │   ├── components/    # Reusable components
│   │   │   └── Navbar.jsx
│   │   ├── pages/         # Page components
│   │   │   ├── Home.jsx
│   │   │   ├── Play.jsx
│   │   │   ├── Game.jsx
│   │   │   ├── Puzzles.jsx
│   │   │   ├── PuzzleRush.jsx
│   │   │   ├── Tournaments.jsx
│   │   │   ├── Tournament.jsx
│   │   │   ├── Leaderboards.jsx
│   │   │   ├── Achievements.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Friends.jsx
│   │   │   ├── Club.jsx
│   │   │   ├── Admin.jsx
│   │   │   └── Settings.jsx
│   │   ├── contexts/      # React contexts
│   │   │   ├── AuthContext.jsx
│   │   │   └── SocketContext.jsx
│   │   └── styles/        # CSS
│   └── public/
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/google` - Google OAuth
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password

### Games
- `GET /api/games/:id` - Get game details
- `GET /api/games/live` - List active games

### Tournaments
- `GET /api/tournaments` - List tournaments
- `POST /api/tournaments` - Create (admin)
- `POST /api/tournaments/:id/register` - Register
- `POST /api/tournaments/:id/start` - Start (admin)

### Puzzles
- `GET /api/puzzles/next` - Get next puzzle
- `GET /api/puzzles/daily` - Daily puzzle
- `POST /api/puzzles/:id/move` - Submit move
- `POST /api/puzzles/rush/start` - Start Puzzle Rush

### Socket Events

**Client → Server**
- `authenticate` - JWT auth
- `game:join` - Join/rejoin game
- `game:move` - Make a move
- `game:resign` - Resign
- `matchmaking:join/leave` - Queue management
- `challenge:send/accept/decline` - Direct challenges

**Server → Client**
- `game:state` - Full game state
- `game:moved` - Move made
- `game:over` - Game ended
- `matchmaking:found` - Match found
- `challenge:received` - Incoming challenge

## Deployment

### Railway (Recommended - Easiest)

Railway provides automatic PostgreSQL setup and deployment. See [RAILWAY.md](./RAILWAY.md) for detailed instructions.

**Quick Start:**
1. Create account at [railway.app](https://railway.app)
2. Add PostgreSQL database (automatic `DATABASE_URL`)
3. Deploy from GitHub
4. Set environment variables: `JWT_SECRET`, `CLIENT_URL`
5. Run migration: `railway run node utils/migrate.js`

### Production Build (Manual)

```bash
# Build client
cd client
npm run build

# The server will serve the build from client/build
cd ../server
NODE_ENV=production node index.js
```

### Environment Variables (Production)

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-production-secret
GOOGLE_CLIENT_ID=your-google-client-id
CLIENT_URL=https://yourdomain.com
```

## License

MIT

## Credits

Built for the Riddick Chess Club 🏆
