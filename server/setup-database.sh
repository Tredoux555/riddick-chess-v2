#!/bin/bash

echo "🔧 Riddick Chess - Database Setup Script"
echo "========================================"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed."
    echo ""
    echo "To install PostgreSQL on macOS:"
    echo "  1. Install Homebrew (if not installed):"
    echo "     /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo ""
    echo "  2. Install PostgreSQL:"
    echo "     brew install postgresql@15"
    echo ""
    echo "  3. Start PostgreSQL:"
    echo "     brew services start postgresql@15"
    echo ""
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h localhost > /dev/null 2>&1; then
    echo "⚠️  PostgreSQL is not running."
    echo ""
    echo "Start PostgreSQL with:"
    echo "  brew services start postgresql@15"
    echo "  # or"
    echo "  pg_ctl -D /usr/local/var/postgresql@15 start"
    echo ""
    exit 1
fi

echo "✅ PostgreSQL is installed and running"
echo ""

# Check if database exists
if psql -lqt | cut -d \| -f 1 | grep -qw riddick_chess; then
    echo "⚠️  Database 'riddick_chess' already exists"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        dropdb riddick_chess
    else
        echo "Using existing database..."
    fi
fi

# Create database if it doesn't exist
if ! psql -lqt | cut -d \| -f 1 | grep -qw riddick_chess; then
    echo "📦 Creating database 'riddick_chess'..."
    createdb riddick_chess
    if [ $? -eq 0 ]; then
        echo "✅ Database created successfully"
    else
        echo "❌ Failed to create database"
        exit 1
    fi
else
    echo "✅ Database 'riddick_chess' exists"
fi

echo ""
echo "🚀 Running migration script..."
cd "$(dirname "$0")"
node utils/migrate.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database setup complete!"
    echo ""
    echo "You can now start the server with:"
    echo "  npm start"
    echo "  # or for development:"
    echo "  npm run dev"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi

