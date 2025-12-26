# Database Setup Instructions

## Option 1: Use the Migration Script (Recommended)

The codebase uses UUIDs for IDs. The proper way to set up the database is:

```bash
# Make sure PostgreSQL is running and database exists
createdb riddick_chess

# Run the migration script (creates all tables with proper schema)
cd server
node utils/migrate.js
```

This will create all tables with the correct schema including:
- UUID primary keys
- Glicko-2 rating system with RD and volatility
- All required tables (users, games, tournaments, puzzles, achievements, etc.)

## Option 2: Simple Setup (setup-db.sql)

If you want to use the simpler setup-db.sql file (uses INTEGER IDs instead of UUIDs):

```bash
# Install PostgreSQL if not installed
brew install postgresql@15
brew services start postgresql@15

# Create the database
createdb riddick_chess

# Run the SQL file
psql riddick_chess < server/setup-db.sql
```

**Note:** The simple setup uses INTEGER IDs, but the codebase expects UUIDs. You may need to modify the codebase or use the migration script instead.

## Environment Variables

Make sure your `server/.env` file has:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 5001)
- `CLIENT_URL` - Frontend URL for CORS

## After Setup

Restart the server:
```bash
cd server
npm start
# or for development:
npm run dev
```

