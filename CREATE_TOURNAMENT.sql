-- Create the Official Back-to-School Tournament
-- Run this in Railway/Supabase SQL console

INSERT INTO tournaments (
  name,
  description,
  type,
  time_control,
  increment,
  max_players,
  total_rounds,
  status,
  current_round,
  start_time,
  registration_start,
  registration_end,
  tournament_end,
  forfeit_hours,
  is_arena,
  created_by
) VALUES (
  'Riddick from G5-1''s Official Tournament',
  'The schoolwide official back-to-school tournament to have fun. Anyone can join!

返校官方锦标赛，欢乐至上。欢迎所有人参加！

📅 SCHEDULE / 时间安排:
• Registration / 报名: Mon Jan 5th - Fri Jan 9th 5PM
• Tournament / 比赛: Fri Jan 9th 5PM - Sun Jan 11th 6PM  
• Finals / 决赛: Mon Jan 12th at Recess (in person! / 当面对决！)

⚠️ RULES / 规则:
• You have 24 hours to play each game or you forfeit
• 每场比赛必须在24小时内完成，否则判负
• 2 forfeits = automatic withdrawal
• 两次弃权将被自动退出比赛
• Top 2 players play finals in person!
• 前两名选手将进行现场决赛！',
  'swiss',
  600,  -- 10 minutes
  0,    -- no increment
  1500, -- max players
  9,    -- 9 rounds (good for up to 512+ players)
  'upcoming',
  0,
  '2026-01-09 17:00:00+08',  -- Tournament starts Fri Jan 9 5PM Beijing
  '2026-01-05 00:00:00+08',  -- Registration opens Mon Jan 5 midnight Beijing
  '2026-01-09 17:00:00+08',  -- Registration closes when tournament starts
  '2026-01-11 18:00:00+08',  -- Tournament ends Sun Jan 11 6PM Beijing
  24,   -- 24 hours to play each game
  false, -- not arena style
  (SELECT id FROM users WHERE is_admin = true LIMIT 1)  -- created by first admin
)
RETURNING id, name, status, start_time;
