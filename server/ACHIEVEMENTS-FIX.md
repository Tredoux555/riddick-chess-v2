# Achievements System Fix

## Changes Made

### 1. Updated `achievementService.js`

- **Added `checkAchievementsByRequirement()` method**: Generic method that checks achievements based on requirement_type and requirement_value
- **Updated `checkGameAchievements()`**: Now uses requirement-based matching for win achievements
- **Updated `checkTournamentAchievements()`**: Now uses requirement-based matching for tournament achievements
- **Updated `checkSocialAchievements()`**: Now uses requirement-based matching for friend count achievements
- **Added `checkPuzzleAchievements()`**: New method for puzzle achievements using requirement-based matching
- **Added `checkRatingAchievements()`**: New method for rating achievements using requirement-based matching

### 2. Updated `ratingService.js`

- Changed to use `achievementService.checkRatingAchievements()` instead of hardcoded string IDs

### 3. Updated `puzzleService.js`

- Changed to use `achievementService.checkPuzzleAchievements()` instead of hardcoded string IDs

## Database Schema

The achievements table should have:
- `id` - Numeric (SERIAL/INTEGER) - auto-incrementing
- `requirement_type` - VARCHAR - e.g., 'wins', 'puzzles_solved', 'rating'
- `requirement_value` - INTEGER - the threshold value

## SQL to Run

Run this SQL in your database (Supabase/PostgreSQL):

```sql
-- Delete all existing achievements and start fresh
DELETE FROM user_achievements;
DELETE FROM achievements;

-- Insert clean achievements with proper slugs
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, points, rarity) VALUES
('First Win', 'Win your first game', '🏆', 'games', 'wins', 1, 10, 'common'),
('10 Wins', 'Win 10 games', '🎯', 'games', 'wins', 10, 25, 'common'),
('50 Wins', 'Win 50 games', '⭐', 'games', 'wins', 50, 50, 'uncommon'),
('100 Wins', 'Win 100 games', '👑', 'games', 'wins', 100, 100, 'rare'),
('Puzzle Solver', 'Solve 10 puzzles', '🧩', 'puzzles', 'puzzles_solved', 10, 10, 'common'),
('Puzzle Master', 'Solve 100 puzzles', '🧠', 'puzzles', 'puzzles_solved', 100, 50, 'uncommon'),
('Streak Master', 'Get a 5 puzzle streak', '🔥', 'puzzles', 'puzzle_streak', 5, 25, 'common'),
('First Tournament', 'Participate in a tournament', '🎪', 'tournaments', 'tournament_count', 1, 15, 'common'),
('Tournament Winner', 'Win a tournament', '🥇', 'tournaments', 'tournament_wins', 1, 50, 'rare'),
('Social Butterfly', 'Add 10 friends', '🦋', 'social', 'friend_count', 10, 20, 'common'),
('Rating Climber', 'Reach 1200 rating', '📈', 'rating', 'rating', 1200, 25, 'common'),
('Expert', 'Reach 1600 rating', '🎓', 'rating', 'rating', 1600, 50, 'uncommon'),
('Master', 'Reach 2000 rating', '🏅', 'rating', 'rating', 2000, 100, 'rare');
```

## How It Works Now

1. **Requirement-Based Matching**: Instead of checking specific achievement IDs, the system now:
   - Gets user's current stat (e.g., total_wins = 15)
   - Finds all achievements where `requirement_type = 'wins'` AND `requirement_value <= 15`
   - Awards all qualifying achievements that haven't been earned yet

2. **Automatic Awarding**: When a user's stat increases, all matching achievements are automatically checked and awarded

3. **No Hardcoded IDs**: The system is now flexible - you can add new achievements in the database without changing code

## Testing

After running the SQL:
1. Play a game and win - should award "First Win"
2. Win 10 games - should award "10 Wins"
3. Solve 10 puzzles - should award "Puzzle Solver"
4. Reach 1200 rating - should award "Rating Climber"
5. Add 10 friends - should award "Social Butterfly"

## Notes

- The `awardAchievement()` method still works with numeric IDs
- All achievement checks now use requirement-based matching
- The system is backward compatible - existing code calling these methods will work




