# 🏆 TOURNAMENT SYSTEM TEST GUIDE
## Riddick Chess - January 4, 2026

---

## QUICK START - Create Tomorrow's Tournament

### 1. Go to Admin Panel
Navigate to: `https://riddickchess.site/admin/riddick/tournaments/create`

### 2. Fill Tournament Details
- **Name**: Sunday Blitz Battle (or any name)
- **Description**: Weekly blitz tournament for all skill levels!
- **Time Control**: 300 (5 min)
- **Increment**: 0
- **Max Players**: 16
- **Rounds**: 5
- **Start Time**: Tomorrow (e.g., 2026-01-05 14:00)

### 3. Click "Create Tournament"

---

## TESTING CHECKLIST

### ✅ Pre-Tournament Tests

1. **Tournament Created**
   - [ ] Appears in `/tournaments` list
   - [ ] Shows correct time control
   - [ ] Shows correct player limit
   - [ ] Status shows "Upcoming"

2. **Registration**
   - [ ] Register button visible
   - [ ] Can register multiple users
   - [ ] Count increases after registration
   - [ ] "Already registered" error if try again
   - [ ] Can withdraw before start

### ✅ Tournament Start Tests

1. **Admin Start**
   - [ ] Go to tournament detail page
   - [ ] As admin, start tournament
   - [ ] Status changes to "Active"
   - [ ] Round 1 pairings generated

2. **Pairings**
   - [ ] Games created for all pairs
   - [ ] Bye assigned if odd players
   - [ ] Colors assigned fairly

### ✅ Game Play Tests

1. **Finding Games**
   - [ ] Tournament games show in active games
   - [ ] Can click to join game
   - [ ] Time control correct

2. **Results Recording**
   - [ ] Win/loss updates scores
   - [ ] Draw gives 0.5 to each
   - [ ] Standings update

### ✅ Round Progression

1. **Round Complete**
   - [ ] After all games finish, next round auto-generates
   - [ ] Players paired avoiding rematches
   - [ ] Color alternation working

2. **Tournament End**
   - [ ] After final round, status → "Completed"
   - [ ] Final standings calculated
   - [ ] Buchholz tiebreaker applied

---

## ADMIN API TESTS (for Terminal)

### Get Auth Token First
```bash
# Login and save token
TOKEN=$(curl -s -X POST https://riddickchess.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' | jq -r '.token')
```

### Create Tournament
```bash
curl -X POST https://riddickchess.site/api/tournaments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Tournament",
    "description": "Testing the system",
    "timeControl": 180,
    "increment": 2,
    "maxPlayers": 8,
    "totalRounds": 3,
    "startTime": "2026-01-05T14:00:00Z"
  }'
```

### List Tournaments
```bash
curl https://riddickchess.site/api/tournaments \
  -H "Authorization: Bearer $TOKEN"
```

### Get Tournament Details
```bash
curl https://riddickchess.site/api/tournaments/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Register for Tournament
```bash
curl -X POST https://riddickchess.site/api/tournaments/1/register \
  -H "Authorization: Bearer $TOKEN"
```

### Start Tournament (Admin)
```bash
curl -X POST https://riddickchess.site/api/tournaments/1/start \
  -H "Authorization: Bearer $TOKEN"
```

### Get Standings
```bash
curl https://riddickchess.site/api/tournaments/1/standings \
  -H "Authorization: Bearer $TOKEN"
```

---

## COMMON ISSUES & FIXES

### "Need at least 2 participants"
- Register more users before starting

### "Tournament has already started"  
- Can't start twice, check status

### Pairings not generating
- Check all previous round games are completed
- Check tournament status is 'active'

### Rating not updating
- Tournament games are rated by default
- Check user_ratings table

---

## DATABASE QUERIES (for Debugging)

```sql
-- Check tournaments
SELECT id, name, status, current_round, total_rounds 
FROM tournaments ORDER BY created_at DESC LIMIT 5;

-- Check participants
SELECT tp.*, u.username 
FROM tournament_participants tp
JOIN users u ON tp.user_id = u.id
WHERE tp.tournament_id = 1;

-- Check pairings
SELECT tp.*, w.username as white, b.username as black, g.status as game_status
FROM tournament_pairings tp
LEFT JOIN users w ON tp.white_player_id = w.id
LEFT JOIN users b ON tp.black_player_id = b.id
LEFT JOIN games g ON tp.game_id = g.id
WHERE tp.tournament_id = 1;
```

---

## TOURNAMENT FLOW DIAGRAM

```
1. CREATE (Admin)
   ↓
2. REGISTRATION (Users join)
   ↓
3. START (Admin triggers)
   ↓
4. ROUND 1 PAIRINGS (Auto-generated)
   ↓
5. GAMES PLAYED (Users play)
   ↓
6. ROUND COMPLETE (All results in)
   ↓
7. NEXT ROUND (Auto-generated) → Repeat 5-7
   ↓
8. FINAL ROUND COMPLETE
   ↓
9. TOURNAMENT COMPLETE (Awards/Standings)
```

---

## SUCCESS METRICS

After testing, verify:
- ✅ Tournament appears on `/tournaments`
- ✅ Users can register
- ✅ Admin can start tournament
- ✅ Games create with correct time control
- ✅ Scores update after games
- ✅ Standings show correctly
- ✅ Multiple rounds work

---

## READY FOR TOMORROW! 🎯

1. Create tournament now
2. Share link with players
3. Let them register tonight
4. Start tournament tomorrow at scheduled time
5. Monitor from admin panel

Good luck with the launch!
