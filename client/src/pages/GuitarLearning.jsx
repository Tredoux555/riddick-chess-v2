import React, { useState, useEffect, useRef } from 'react';

// ============= USER PROGRESS SYSTEM =============
const initializeUserData = () => {
  const stored = localStorage.getItem('guitarAppData');
  if (stored) return JSON.parse(stored);
  
  return {
    streak: 0,
    lastPracticeDate: null,
    totalXP: 0,
    level: 1,
    practiceMinutes: 0,
    lessonsCompleted: [],
    riffsCompleted: [],
    achievementsUnlocked: [],
    practiceHistory: {}, // { 'YYYY-MM-DD': minutes }
    songsStars: {} // { songId: stars }
  };
};

const saveUserData = (data) => {
  localStorage.setItem('guitarAppData', JSON.stringify(data));
};

const addXP = (userData, amount, reason) => {
  const newXP = userData.totalXP + amount;
  const newLevel = Math.floor(newXP / 100) + 1;
  
  return {
    ...userData,
    totalXP: newXP,
    level: newLevel
  };
};

const updateStreak = (userData) => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  if (userData.lastPracticeDate === today) {
    return userData; // Already practiced today
  }
  
  let newStreak = userData.streak;
  if (userData.lastPracticeDate === yesterday) {
    newStreak = userData.streak + 1; // Continue streak
  } else if (userData.lastPracticeDate !== null) {
    newStreak = 1; // Streak broken, start over
  } else {
    newStreak = 1; // First day
  }
  
  return {
    ...userData,
    streak: newStreak,
    lastPracticeDate: today
  };
};

const addPracticeTime = (userData, minutes) => {
  const today = new Date().toISOString().split('T')[0];
  const history = {...userData.practiceHistory};
  history[today] = (history[today] || 0) + minutes;
  
  return {
    ...userData,
    practiceMinutes: userData.practiceMinutes + minutes,
    practiceHistory: history
  };
};

// ============= ACHIEVEMENTS SYSTEM =============
const ACHIEVEMENTS = [
  { id: 'first_practice', name: 'First Steps', desc: 'Complete your first practice session', icon: '🎸', xp: 10 },
  { id: 'streak_3', name: '3-Day Warrior', desc: 'Practice 3 days in a row', icon: '🔥', xp: 25 },
  { id: 'streak_7', name: 'Week Champion', desc: 'Practice 7 days in a row', icon: '⭐', xp: 50 },
  { id: 'streak_30', name: 'Month Master', desc: 'Practice 30 days in a row', icon: '👑', xp: 200 },
  { id: 'first_song', name: 'First Song!', desc: 'Complete your first full song', icon: '🎵', xp: 30 },
  { id: 'songs_5', name: 'Song Hero', desc: 'Complete 5 songs', icon: '🎤', xp: 75 },
  { id: 'first_riff', name: 'Riff Master', desc: 'Learn your first riff', icon: '⚡', xp: 20 },
  { id: 'practice_30min', name: 'Half Hour Hero', desc: 'Practice for 30 minutes total', icon: '⏱️', xp: 15 },
  { id: 'practice_5h', name: 'Dedicated', desc: 'Practice for 5 hours total', icon: '💪', xp: 100 },
  { id: 'level_5', name: 'Level 5!', desc: 'Reach level 5', icon: '🚀', xp: 50 }
];

const checkAchievements = (userData) => {
  const newAchievements = [];
  
  ACHIEVEMENTS.forEach(achievement => {
    if (userData.achievementsUnlocked.includes(achievement.id)) return;
    
    let unlocked = false;
    
    switch(achievement.id) {
      case 'first_practice': unlocked = userData.practiceMinutes > 0; break;
      case 'streak_3': unlocked = userData.streak >= 3; break;
      case 'streak_7': unlocked = userData.streak >= 7; break;
      case 'streak_30': unlocked = userData.streak >= 30; break;
      case 'first_song': unlocked = userData.lessonsCompleted.length >= 1; break;
      case 'songs_5': unlocked = userData.lessonsCompleted.length >= 5; break;
      case 'first_riff': unlocked = userData.riffsCompleted.length >= 1; break;
      case 'practice_30min': unlocked = userData.practiceMinutes >= 30; break;
      case 'practice_5h': unlocked = userData.practiceMinutes >= 300; break;
      case 'level_5': unlocked = userData.level >= 5; break;
    }
    
    if (unlocked) newAchievements.push(achievement);
  });
  
  return newAchievements;
};

// ============= GUITAR DATA =============

const TUNING = [
  { note: 'E2', freq: 82.41, string: 6, name: 'E', label: '6th (thickest)', color: '#ff6b6b' },
  { note: 'A2', freq: 110.00, string: 5, name: 'A', label: '5th', color: '#ffaa00' },
  { note: 'D3', freq: 146.83, string: 4, name: 'D', label: '4th', color: '#ffff00' },
  { note: 'G3', freq: 196.00, string: 3, name: 'G', label: '3rd', color: '#00ff88' },
  { note: 'B3', freq: 246.94, string: 2, name: 'B', label: '2nd', color: '#00aaff' },
  { note: 'E4', freq: 329.63, string: 1, name: 'E', label: '1st (thinnest)', color: '#aa66ff' }
];

const CHORDS = {
  'G': { name: 'G Major', fingers: [[6,3,2], [5,2,1], [1,3,3]], open: [4,3,2], muted: [], 
         notes: [196, 246.94, 293.66, 392, 493.88, 587.33] },
  'C': { name: 'C Major', fingers: [[5,3,3], [4,2,2], [2,1,1]], open: [3,1], muted: [6],
         notes: [130.81, 164.81, 196, 261.63, 329.63] },
  'D': { name: 'D Major', fingers: [[3,2,1], [1,2,2], [2,3,3]], open: [4], muted: [6,5],
         notes: [146.83, 220, 293.66, 369.99] },
  'Em': { name: 'E Minor', fingers: [[5,2,2], [4,2,3]], open: [6,3,2,1], muted: [],
          notes: [82.41, 123.47, 164.81, 196, 246.94, 329.63] },
  'Am': { name: 'A Minor', fingers: [[4,2,2], [3,2,3], [2,1,1]], open: [5,1], muted: [6],
          notes: [110, 164.81, 220, 261.63, 329.63] },
  'E': { name: 'E Major', fingers: [[5,2,2], [4,2,3], [3,1,1]], open: [6,2,1], muted: [],
         notes: [82.41, 123.47, 164.81, 196, 246.94, 329.63] },
  'A': { name: 'A Major', fingers: [[4,2,1], [3,2,2], [2,2,3]], open: [5,1], muted: [6],
         notes: [110, 164.81, 220, 277.18, 329.63] },
  'Dm': { name: 'D Minor', fingers: [[1,1,1], [3,2,3], [2,3,2]], open: [4], muted: [6,5],
          notes: [146.83, 220, 293.66, 349.23] }
};

// ============= CHORD DETECTION SYSTEM =============
// Chord templates for real-time detection (chromagram pattern matching)
// Each template maps to 12 pitch classes: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
const CHORD_TEMPLATES = {
  'G':  [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1],  // G, B, D
  'C':  [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],  // C, E, G
  'D':  [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],  // D, F#, A
  'Em': [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1],  // E, G, B
  'Am': [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],  // A, C, E
  'E':  [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],  // E, G#, B
  'A':  [0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],  // A, C#, E
  'Dm': [1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0],  // D, F, A
};

// Note names for chromagram
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Detect chord from frequency analysis
const detectChordFromFrequencies = (frequencies, sampleRate) => {
  // Build chromagram (12-bin pitch class profile)
  const chromagram = new Array(12).fill(0);
  const fftSize = frequencies.length;
  
  for (let i = 0; i < fftSize / 2; i++) {
    const freq = (i * sampleRate) / fftSize;
    if (freq < 80 || freq > 1000) continue; // Guitar range
    
    // Convert frequency to pitch class (0-11)
    const noteNum = 12 * Math.log2(freq / 440) + 69; // MIDI note number
    const pitchClass = Math.round(noteNum) % 12;
    
    if (pitchClass >= 0 && pitchClass < 12) {
      chromagram[pitchClass] += frequencies[i];
    }
  }
  
  // Normalize chromagram
  const maxVal = Math.max(...chromagram);
  if (maxVal === 0) return null;
  
  for (let i = 0; i < 12; i++) {
    chromagram[i] = chromagram[i] / maxVal;
  }
  
  // Match against chord templates
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [chordName, template] of Object.entries(CHORD_TEMPLATES)) {
    let score = 0;
    for (let i = 0; i < 12; i++) {
      if (template[i] === 1) {
        score += chromagram[i];
      }
    }
    
    if (score > bestScore && score > 0.5) {
      bestScore = score;
      bestMatch = chordName;
    }
  }
  
  return { chord: bestMatch, confidence: bestScore };
};

// 🎸 ICONIC BEGINNER RIFFS (research-backed!)
const RIFFS = [
  {
    id: 'smoke_on_water',
    name: 'Smoke on the Water',
    artist: 'Deep Purple',
    difficulty: 'Beginner',
    description: 'THE iconic beginner riff - just 4 notes!',
    tab: `
E|--------------------------|
B|--------------------------|
G|--------------------------|
D|--------------------------|
A|--0-3-5--0-3-6-5--0-3-5-3-0|
E|--------------------------|
    `,
    notes: 'Play on the A string. Numbers = frets. 0 = open string.'
  },
  {
    id: 'seven_nation',
    name: 'Seven Nation Army',
    artist: 'The White Stripes',
    difficulty: 'Beginner',
    description: 'One string, simple rhythm, everyone knows it!',
    tab: `
E|--7-7-10-7-5-3-2--|
B|------------------|
G|------------------|
D|------------------|
A|------------------|
E|------------------|
    `,
    notes: 'Play on the E string (thinnest). Goes 7-7-10-7-5-3-2.'
  },
  {
    id: 'iron_man',
    name: 'Iron Man',
    artist: 'Black Sabbath',
    difficulty: 'Easy',
    description: 'Heavy! Intro to power chords.',
    tab: `
E|------------------------|
B|------------------------|
G|--5--5--8--8--7--7--5-5-|
D|--5--5--8--8--7--7--5-5-|
A|--3--3--6--6--5--5--3-3-|
E|------------------------|
    `,
    notes: 'Play the same fret on G, D, and A strings together (power chords).'
  },
  {
    id: 'sunshine',
    name: 'Sunshine of Your Love',
    artist: 'Cream',
    difficulty: 'Easy',
    description: 'Classic rock riff with a bluesy feel',
    tab: `
E|-------------------------|
B|-------------------------|
G|-------------------------|
D|---------10-12-12--------|
A|--10-12---------12-10----|
E|-------------------------|
    `,
    notes: 'Play on D and A strings. Simple but sounds amazing!'
  }
];

// 🎵 SONG LIBRARY
const LESSONS = [
  {
    id: 1,
    title: "A Horse With No Name",
    artist: "America",
    youtube: "zSAJ0l4OBHM",
    difficulty: "Beginner",
    chords: ["Em", "D"],
    description: "Perfect first song - only 2 easy chords!",
    xpReward: 30,
    timeline: [
      { time: 0, chord: null, text: "🎸 Your first song! Just 2 chords!" },
      { time: 8, chord: "Em", text: "Start with Em - super easy!" },
      { time: 12, chord: "D", text: "Switch to D" },
      { time: 16, chord: "Em", text: "Back to Em" },
      { time: 20, chord: "D", text: "D again" },
      { time: 24, chord: "Em", text: "Em" },
      { time: 28, chord: "D", text: "D" }
    ]
  },
  {
    id: 2,
    title: "Love Me Do",
    artist: "The Beatles",
    youtube: "0pGOFX1D_jg",
    difficulty: "Easy",
    chords: ["G", "C", "D"],
    description: "Classic Beatles - 3 basic chords",
    xpReward: 40,
    timeline: [
      { time: 0, chord: null, text: "🎸 Beatles classic!" },
      { time: 5, chord: "G", text: "G chord" },
      { time: 13, chord: "C", text: "Switch to C" },
      { time: 21, chord: "G", text: "Back to G" },
      { time: 29, chord: "D", text: "D chord" },
      { time: 37, chord: "G", text: "G" }
    ]
  },
  {
    id: 3,
    title: "Knockin' on Heaven's Door",
    artist: "Bob Dylan",
    youtube: "lXJSVnX1UtQ",
    difficulty: "Beginner",
    chords: ["G", "D", "Am"],
    description: "Iconic song with easy chords",
    xpReward: 35,
    timeline: [
      { time: 0, chord: null, text: "🎸 Classic Dylan!" },
      { time: 10, chord: "G", text: "Start with G" },
      { time: 18, chord: "D", text: "D chord" },
      { time: 26, chord: "Am", text: "Am chord" },
      { time: 34, chord: "G", text: "Back to G" }
    ]
  },
  {
    id: 4,
    title: "Let It Be",
    artist: "The Beatles",
    youtube: "2xDzVZcqtYI",
    difficulty: "Easy",
    chords: ["C", "G", "Am"],
    description: "Beautiful Beatles ballad",
    xpReward: 40,
    timeline: [
      { time: 0, chord: null, text: "🎸 Let it be..." },
      { time: 8, chord: "C", text: "C chord" },
      { time: 12, chord: "G", text: "G chord" },
      { time: 16, chord: "Am", text: "Am chord" },
      { time: 20, chord: "C", text: "C" },
      { time: 24, chord: "G", text: "G" }
    ]
  },
  {
    id: 5,
    title: "Hey Joe",
    artist: "Jimi Hendrix",
    youtube: "W3JsuWz4xWc",
    difficulty: "Easy",
    chords: ["C", "G", "D", "Am"],
    description: "Hendrix classic with smooth changes",
    xpReward: 45,
    timeline: [
      { time: 0, chord: null, text: "🎸 Hey Joe!" },
      { time: 5, chord: "C", text: "C chord" },
      { time: 9, chord: "G", text: "G" },
      { time: 13, chord: "D", text: "D" },
      { time: 17, chord: "Am", text: "Am" },
      { time: 21, chord: "C", text: "C" }
    ]
  },
  {
    id: 6,
    title: "Wonderwall",
    artist: "Oasis",
    youtube: "bx1Bh8ZvH84",
    difficulty: "Medium",
    chords: ["Em", "G", "D", "A"],
    description: "Everyone knows this one!",
    xpReward: 60,
    timeline: [
      { time: 0, chord: null, text: "🎸 Today is gonna be..." },
      { time: 15, chord: "Em", text: "Em" },
      { time: 19, chord: "G", text: "G" },
      { time: 23, chord: "D", text: "D" },
      { time: 27, chord: "A", text: "A" }
    ]
  },
  {
    id: 7,
    title: "Wish You Were Here",
    artist: "Pink Floyd",
    youtube: "IXdNnw99-Ic",
    difficulty: "Medium",
    chords: ["Em", "G", "A", "C"],
    description: "Pink Floyd masterpiece",
    xpReward: 65,
    timeline: [
      { time: 0, chord: null, text: "🎸 So you think you can tell..." },
      { time: 58, chord: "Em", text: "Em" },
      { time: 62, chord: "G", text: "G" },
      { time: 66, chord: "Em", text: "Em" },
      { time: 70, chord: "A", text: "A" }
    ]
  },
  {
    id: 8,
    title: "Stand By Me",
    artist: "Ben E. King",
    youtube: "hwZNL7QVJjE",
    difficulty: "Easy",
    chords: ["G", "Em", "C", "D"],
    description: "Classic 4-chord song",
    xpReward: 45,
    timeline: [
      { time: 0, chord: null, text: "🎸 When the night..." },
      { time: 10, chord: "G", text: "G" },
      { time: 14, chord: "Em", text: "Em" },
      { time: 18, chord: "C", text: "C" },
      { time: 22, chord: "D", text: "D" },
      { time: 26, chord: "G", text: "G" }
    ]
  }
];

// 🎸 WARM-UP EXERCISES (research says these are critical!)
const WARMUPS = [
  {
    name: 'Finger Stretch',
    duration: 60,
    description: 'Play 1-2-3-4 on each string, then backwards 4-3-2-1',
    instruction: 'Use all 4 fingers. Index on 1st fret, middle on 2nd, ring on 3rd, pinky on 4th.'
  },
  {
    name: 'Spider Walk',
    duration: 90,
    description: 'Classic exercise to build finger independence',
    instruction: 'E string: 1-2-3-4, A string: 1-2-3-4, D string: 1-2-3-4...'
  },
  {
    name: 'Chord Changes',
    duration: 120,
    description: 'Practice switching between G and C',
    instruction: 'Hold each chord for 4 beats. Focus on smooth transitions!'
  }
];

export default function GuitarLearning() {
  const [userData, setUserData] = useState(initializeUserData());
  const [view, setView] = useState('home'); // home, lessons, riffs, tuner, progress, chords
  const [activeLesson, setActiveLesson] = useState(null);
  const [activeRiff, setActiveRiff] = useState(null);
  const [showAchievement, setShowAchievement] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  
  // Save userData whenever it changes
  useEffect(() => {
    saveUserData(userData);
  }, [userData]);
  
  // Check for new achievements
  useEffect(() => {
    const newAchievements = checkAchievements(userData);
    if (newAchievements.length > 0) {
      newAchievements.forEach((achievement, i) => {
        setTimeout(() => {
          setShowAchievement(achievement);
          setUserData(prev => addXP({
            ...prev,
            achievementsUnlocked: [...prev.achievementsUnlocked, achievement.id]
          }, achievement.xp, `Achievement: ${achievement.name}`));
          
          setTimeout(() => setShowAchievement(null), 3000);
        }, i * 3500);
      });
    }
  }, [userData.streak, userData.lessonsCompleted.length, userData.riffsCompleted.length, userData.practiceMinutes, userData.level]);
  
  // Start practice session
  const startSession = () => {
    setSessionStartTime(Date.now());
    setUserData(prev => updateStreak(prev));
  };
  
  // End practice session
  const endSession = () => {
    if (!sessionStartTime) return;
    const minutes = Math.round((Date.now() - sessionStartTime) / 60000);
    setUserData(prev => addPracticeTime(addXP(prev, minutes * 2, 'Practice time'), minutes));
    setSessionStartTime(null);
  };
  
  // Complete a lesson
  const completeLesson = (lessonId, stars) => {
    const lesson = LESSONS.find(l => l.id === lessonId);
    setUserData(prev => {
      const newData = addXP(prev, lesson.xpReward, `Completed ${lesson.title}`);
      return {
        ...newData,
        lessonsCompleted: [...new Set([...prev.lessonsCompleted, lessonId])],
        songsStars: { ...prev.songsStars, [lessonId]: Math.max(prev.songsStars[lessonId] || 0, stars) }
      };
    });
  };
  
  // Complete a riff
  const completeRiff = (riffId) => {
    setUserData(prev => {
      const newData = addXP(prev, 25, 'Learned new riff!');
      return {
        ...newData,
        riffsCompleted: [...new Set([...prev.riffsCompleted, riffId])]
      };
    });
  };

  // Render different views based on state
  if (activeLesson) {
    return <InteractiveLesson 
      lesson={activeLesson} 
      onExit={() => { setActiveLesson(null); endSession(); }}
      onComplete={completeLesson}
    />;
  }
  
  if (activeRiff) {
    return <RiffLesson 
      riff={activeRiff} 
      onExit={() => { setActiveRiff(null); endSession(); }}
      onComplete={completeRiff}
    />;
  }

  return (
    <div style={styles.page}>
      {/* ACHIEVEMENT POPUP */}
      {showAchievement && (
        <div style={styles.achievementPopup}>
          <div style={styles.achievementCard}>
            <div style={{fontSize: '48px'}}>{showAchievement.icon}</div>
            <h2>Achievement Unlocked!</h2>
            <h3>{showAchievement.name}</h3>
            <p>{showAchievement.desc}</p>
            <div style={{color: '#0af', fontWeight: 'bold'}}>+{showAchievement.xp} XP</div>
          </div>
        </div>
      )}
      
      {/* TOP BAR - User Stats */}
      <div style={styles.topBar}>
        <div style={styles.userStats}>
          <div style={styles.statItem}>
            <span style={{fontSize: '20px'}}>⚡</span>
            <div>
              <small>Level</small>
              <strong>{userData.level}</strong>
            </div>
          </div>
          
          <div style={styles.statItem}>
            <span style={{fontSize: '20px'}}>⭐</span>
            <div>
              <small>XP</small>
              <strong>{userData.totalXP}</strong>
            </div>
          </div>
          
          <div style={styles.statItem}>
            <span style={{fontSize: '20px'}}>🔥</span>
            <div>
              <small>Streak</small>
              <strong>{userData.streak} days</strong>
            </div>
          </div>
          
          <div style={styles.statItem}>
            <span style={{fontSize: '20px'}}>⏱️</span>
            <div>
              <small>Practice</small>
              <strong>{userData.practiceMinutes}min</strong>
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <div style={styles.nav}>
        {['home', 'lessons', 'riffs', 'playalong', 'tuner', 'chords', 'progress'].map(v => (
          <button 
            key={v} 
            onClick={() => setView(v)} 
            style={{...styles.navBtn, background: view === v ? '#0af' : '#333'}}
          >
            {v === 'home' && '🏠 Home'}
            {v === 'lessons' && '🎵 Songs'}
            {v === 'riffs' && '⚡ Riffs'}
            {v === 'playalong' && '🎮 Play Along'}
            {v === 'tuner' && '🎤 Tuner'}
            {v === 'chords' && '🎸 Chords'}
            {v === 'progress' && '📊 Progress'}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      {view === 'home' && <HomeView userData={userData} onStart={startSession} setView={setView} />}
      {view === 'lessons' && <LessonsView userData={userData} setActiveLesson={(l) => { setActiveLesson(l); startSession(); }} />}
      {view === 'riffs' && <RiffsView userData={userData} setActiveRiff={(r) => { setActiveRiff(r); startSession(); }} />}
      {view === 'tuner' && <GuitarTuner />}
      {view === 'chords' && <ChordsView />}
      {view === 'progress' && <ProgressView userData={userData} />}
    </div>
  );
}

// Will continue with components in next chunk...
// Continuing GuitarLearning.jsx - PART 2: COMPONENTS

// ========== HOME VIEW ==========
const HomeView = ({ userData, onStart, setView }) => {
  const todayPracticed = userData.lastPracticeDate === new Date().toISOString().split('T')[0];
  
  return (
    <div style={styles.section}>
      <h1 style={{textAlign: 'center', marginBottom: '30px'}}>🎸 Guitar Master</h1>
      
      {!todayPracticed && (
        <div style={{...styles.card, background: '#0af2', border: '2px solid #0af', textAlign: 'center'}}>
          <h2>⏱️ Ready to practice?</h2>
          <p>Keep your {userData.streak}-day streak alive!</p>
          <p style={{color: '#888', fontSize: '14px'}}>Research shows: 15-20 min daily sessions are perfect for beginners!</p>
        </div>
      )}
      
      {todayPracticed && (
        <div style={{...styles.card, background: '#0f82', border: '2px solid #0f8', textAlign: 'center'}}>
          <h2>✅ Great work today!</h2>
          <p>You've practiced {Object.values(userData.practiceHistory).reduce((a,b)=>a+b,0)} minutes total</p>
          <p style={{color: '#888', fontSize: '14px'}}>Keep it up! You're building real guitar skills!</p>
        </div>
      )}
      
      <div style={styles.quickActions}>
        <button onClick={() => { onStart(); setView('lessons'); }} style={styles.bigBtn}>
          <div style={{fontSize: '48px'}}>🎵</div>
          <h3>Learn Songs</h3>
          <small>{userData.lessonsCompleted.length}/8 completed</small>
        </button>
        
        <button onClick={() => { onStart(); setView('riffs'); }} style={styles.bigBtn}>
          <div style={{fontSize: '48px'}}>⚡</div>
          <h3>Learn Riffs</h3>
          <small>{userData.riffsCompleted.length}/4 mastered</small>
        </button>
        
        <button onClick={() => setView('tuner')} style={styles.bigBtn}>
          <div style={{fontSize: '48px'}}>🎤</div>
          <h3>Tune Guitar</h3>
          <small>Always tune first!</small>
        </button>
        
        <button onClick={() => setView('progress')} style={styles.bigBtn}>
          <div style={{fontSize: '48px'}}>📊</div>
          <h3>My Progress</h3>
          <small>Level {userData.level}</small>
        </button>
      </div>
      
      {/* WARM-UP REMINDER */}
      {!todayPracticed && (
        <div style={{...styles.card, marginTop: '30px'}}>
          <h3>💪 Don't Forget to Warm Up!</h3>
          <p style={{color: '#888'}}>Research shows warm-ups prevent injuries and improve learning:</p>
          {WARMUPS.slice(0,2).map(warmup => (
            <div key={warmup.name} style={{padding: '10px', background: '#222', borderRadius: '8px', marginTop: '10px'}}>
              <strong>{warmup.name}</strong> ({warmup.duration}s)
              <p style={{color: '#aaa', fontSize: '14px', marginTop: '5px'}}>{warmup.description}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* LATEST ACHIEVEMENTS */}
      {userData.achievementsUnlocked.length > 0 && (
        <div style={styles.card}>
          <h3>🏆 Recent Achievements</h3>
          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px'}}>
            {userData.achievementsUnlocked.slice(-5).map(id => {
              const ach = ACHIEVEMENTS.find(a => a.id === id);
              return (
                <div key={id} style={styles.achievementBadge} title={ach.desc}>
                  <div style={{fontSize: '24px'}}>{ach.icon}</div>
                  <small>{ach.name}</small>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ========== LESSONS VIEW ==========
const LessonsView = ({ userData, setActiveLesson }) => {
  return (
    <div style={styles.section}>
      <h2>🎵 Song Library</h2>
      <p style={{color: '#888', marginBottom: '20px'}}>
        Learn by playing songs! Videos pause so you can practice each chord.
      </p>
      
      <div style={styles.lessonGrid}>
        {LESSONS.map(lesson => {
          const completed = userData.lessonsCompleted.includes(lesson.id);
          const stars = userData.songsStars[lesson.id] || 0;
          
          return (
            <div key={lesson.id} style={styles.lessonCard} onClick={() => setActiveLesson(lesson)}>
              <div style={styles.thumbnail}>
                <img 
                  src={`https://img.youtube.com/vi/${lesson.youtube}/mqdefault.jpg`} 
                  alt={lesson.title} 
                  style={{width: '100%', borderRadius: '8px'}}
                />
                <div style={styles.playOverlay}>▶</div>
                {completed && <div style={styles.completedBadge}>✓</div>}
              </div>
              
              <div style={{padding: '10px'}}>
                <strong>{lesson.title}</strong>
                <div style={{color: '#888', fontSize: '12px'}}>{lesson.artist}</div>
                <div style={{color: '#aaa', fontSize: '11px', marginTop: '3px'}}>{lesson.description}</div>
                
                <div style={{marginTop: '5px'}}>
                  {lesson.chords.map(c => <span key={c} style={styles.chordTag}>{c}</span>)}
                </div>
                
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px'}}>
                  <div style={{...styles.difficultyBadge, background: lesson.difficulty === 'Beginner' ? '#0f8' : lesson.difficulty === 'Easy' ? '#4af' : '#fa0'}}>
                    {lesson.difficulty}
                  </div>
                  
                  {stars > 0 && (
                    <div>
                      {[1,2,3].map(s => (
                        <span key={s} style={{color: s <= stars ? '#ffa500' : '#333', fontSize: '16px'}}>★</span>
                      ))}
                    </div>
                  )}
                  
                  <div style={{color: '#0af', fontSize: '12px', fontWeight: 'bold'}}>+{lesson.xpReward} XP</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ========== RIFFS VIEW ==========
const RiffsView = ({ userData, setActiveRiff }) => {
  return (
    <div style={styles.section}>
      <h2>⚡ Iconic Riffs</h2>
      <p style={{color: '#888', marginBottom: '20px'}}>
        Learn legendary guitar riffs! These are research-backed perfect for beginners.
      </p>
      
      <div style={styles.riffGrid}>
        {RIFFS.map(riff => {
          const completed = userData.riffsCompleted.includes(riff.id);
          
          return (
            <div key={riff.id} style={styles.riffCard} onClick={() => setActiveRiff(riff)}>
              {completed && <div style={styles.completedBadge}>✓</div>}
              
              <div style={{fontSize: '48px', textAlign: 'center', marginBottom: '10px'}}>
                {riff.difficulty === 'Beginner' ? '🎸' : '⚡'}
              </div>
              
              <h3>{riff.name}</h3>
              <div style={{color: '#888', fontSize: '14px', marginBottom: '5px'}}>{riff.artist}</div>
              <p style={{color: '#aaa', fontSize: '13px'}}>{riff.description}</p>
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px'}}>
                <div style={{...styles.difficultyBadge, background: riff.difficulty === 'Beginner' ? '#0f8' : '#4af'}}>
                  {riff.difficulty}
                </div>
                <div style={{color: '#0af', fontWeight: 'bold'}}>+25 XP</div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div style={{...styles.card, marginTop: '30px'}}>
        <h3>💡 How to Read Tabs</h3>
        <p style={{color: '#888'}}>
          Each line represents a guitar string (E is thinnest on top, E is thickest on bottom).
          Numbers show which fret to press. 0 means play the string open (no frets pressed).
        </p>
        <pre style={{background: '#111', padding: '15px', borderRadius: '8px', marginTop: '10px', overflow: 'auto'}}>
{`E|--0--3--5--  (thinnest string)
B|----------
G|----------
D|----------
A|----------
E|----------  (thickest string)`}
        </pre>
        <p style={{color: '#888', marginTop: '10px'}}>
          Read left to right. Play each note in order!
        </p>
      </div>
    </div>
  );
};

// ========== CHORDS VIEW ==========
const ChordsView = () => {
  return (
    <div style={styles.section}>
      <h2>🎸 Essential Chords</h2>
      <p style={{color: '#888', marginBottom: '20px'}}>
        Master these 8 chords and you can play 90% of popular songs!
      </p>
      
      <div style={styles.chordGrid}>
        {Object.entries(CHORDS).map(([key, chord]) => (
          <div key={key} style={styles.chordCard}>
            <ChordDiagram chord={chord} name={key}/>
            <small style={{color: '#888', display: 'block', marginTop: '5px'}}>{chord.name}</small>
          </div>
        ))}
      </div>
    </div>
  );
};

// ========== PROGRESS VIEW ==========
const ProgressView = ({ userData }) => {
  // Generate heat map data (last 60 days)
  const today = new Date();
  const heatmapDays = [];
  for (let i = 59; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const minutes = userData.practiceHistory[dateStr] || 0;
    heatmapDays.push({ date: dateStr, minutes, day: date.getDay() });
  }
  
  const getHeatColor = (minutes) => {
    if (minutes === 0) return '#1a1a2a';
    if (minutes < 10) return '#0f84';
    if (minutes < 20) return '#0f86';
    if (minutes < 30) return '#0f88';
    return '#0f8';
  };
  
  const xpToNextLevel = (userData.level * 100) - userData.totalXP;
  const levelProgress = ((userData.totalXP % 100) / 100) * 100;
  
  return (
    <div style={styles.section}>
      <h2>📊 Your Progress</h2>
      
      {/* XP Progress */}
      <div style={styles.card}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
          <h3>Level {userData.level}</h3>
          <span style={{color: '#0af', fontWeight: 'bold'}}>{userData.totalXP} XP</span>
        </div>
        <div style={{height: '30px', background: '#222', borderRadius: '15px', overflow: 'hidden'}}>
          <div style={{height: '100%', width: `${levelProgress}%`, background: 'linear-gradient(90deg, #0af, #0f8)', transition: '0.5s'}}/>
        </div>
        <small style={{color: '#888', marginTop: '5px'}}>{xpToNextLevel} XP to Level {userData.level + 1}</small>
      </div>
      
      {/* Stats Grid */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '20px'}}>
        <div style={styles.statCard}>
          <div style={{fontSize: '32px'}}>🔥</div>
          <h2>{userData.streak}</h2>
          <small>Day Streak</small>
        </div>
        
        <div style={styles.statCard}>
          <div style={{fontSize: '32px'}}>⏱️</div>
          <h2>{userData.practiceMinutes}</h2>
          <small>Total Minutes</small>
        </div>
        
        <div style={styles.statCard}>
          <div style={{fontSize: '32px'}}>🎵</div>
          <h2>{userData.lessonsCompleted.length}</h2>
          <small>Songs Completed</small>
        </div>
        
        <div style={styles.statCard}>
          <div style={{fontSize: '32px'}}>⚡</div>
          <h2>{userData.riffsCompleted.length}</h2>
          <small>Riffs Mastered</small>
        </div>
      </div>
      
      {/* Practice Heat Map */}
      <div style={{...styles.card, marginTop: '20px'}}>
        <h3>📅 Practice Heat Map (Last 60 Days)</h3>
        <small style={{color: '#888'}}>Keep your streak alive! Research shows daily practice = 3.6x better results!</small>
        
        <div style={{marginTop: '15px', display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px'}}>
          {heatmapDays.map((day, i) => (
            <div 
              key={i}
              style={{
                aspectRatio: '1',
                background: getHeatColor(day.minutes),
                borderRadius: '3px',
                border: '1px solid #333'
              }}
              title={`${day.date}: ${day.minutes} min`}
            />
          ))}
        </div>
        
        <div style={{display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px', fontSize: '12px', color: '#888'}}>
          <span>Less</span>
          <div style={{width: '15px', height: '15px', background: '#1a1a2a', borderRadius: '3px'}}/>
          <div style={{width: '15px', height: '15px', background: '#0f84', borderRadius: '3px'}}/>
          <div style={{width: '15px', height: '15px', background: '#0f88', borderRadius: '3px'}}/>
          <div style={{width: '15px', height: '15px', background: '#0f8', borderRadius: '3px'}}/>
          <span>More</span>
        </div>
      </div>
      
      {/* Achievements */}
      <div style={{...styles.card, marginTop: '20px'}}>
        <h3>🏆 Achievements ({userData.achievementsUnlocked.length}/{ACHIEVEMENTS.length})</h3>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px', marginTop: '15px'}}>
          {ACHIEVEMENTS.map(ach => {
            const unlocked = userData.achievementsUnlocked.includes(ach.id);
            
            return (
              <div key={ach.id} style={{
                ...styles.achievementCard,
                opacity: unlocked ? 1 : 0.3,
                background: unlocked ? '#0af2' : '#222'
              }}>
                <div style={{fontSize: '32px'}}>{ach.icon}</div>
                <strong style={{fontSize: '12px'}}>{ach.name}</strong>
                <small style={{color: '#888', fontSize: '10px'}}>{ach.desc}</small>
                {unlocked && <div style={{color: '#0f8', fontSize: '11px', fontWeight: 'bold', marginTop: '5px'}}>+{ach.xp} XP</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Continue to PART 3...
// Continuing GuitarLearning.jsx - PART 3: RIFF LESSON & INTERACTIVE COMPONENTS

// ========== RIFF LESSON COMPONENT ==========
const RiffLesson = ({ riff, onExit, onComplete }) => {
  const [completed, setCompleted] = useState(false);
  
  const handleComplete = () => {
    setCompleted(true);
    onComplete(riff.id);
    
    setTimeout(() => {
      onExit();
    }, 2000);
  };
  
  return (
    <div style={styles.lessonPage}>
      {/* HEADER */}
      <div style={styles.lessonHeader}>
        <button onClick={onExit} style={styles.backBtn}>← Back</button>
        <div style={{flex: 1, textAlign: 'center'}}>
          <h2>{riff.name}</h2>
          <small style={{color: '#888'}}>{riff.artist}</small>
        </div>
        <div style={{width: '80px'}}/>
      </div>
      
      {/* SUCCESS SCREEN */}
      {completed && (
        <div style={styles.successOverlay}>
          <div style={styles.successCard}>
            <div style={{fontSize: '64px'}}>⚡</div>
            <h1>Riff Mastered!</h1>
            <p>{riff.name}</p>
            <div style={{color: '#0af', fontSize: '24px', fontWeight: 'bold'}}>+25 XP</div>
          </div>
        </div>
      )}
      
      {/* MAIN CONTENT */}
      <div style={styles.riffContent}>
        <div style={{...styles.card, maxWidth: '800px', margin: '0 auto'}}>
          <div style={{fontSize: '48px', textAlign: 'center', marginBottom: '15px'}}>🎸</div>
          <h3 style={{textAlign: 'center', marginBottom: '10px'}}>{riff.description}</h3>
          
          {/* DIFFICULTY */}
          <div style={{textAlign: 'center', marginBottom: '20px'}}>
            <span style={{...styles.difficultyBadge, background: riff.difficulty === 'Beginner' ? '#0f8' : '#4af', fontSize: '14px', padding: '8px 16px'}}>
              {riff.difficulty}
            </span>
          </div>
          
          {/* INSTRUCTIONS */}
          <div style={{background: '#1a1a2a', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
            <strong style={{color: '#0af'}}>📝 How to play:</strong>
            <p style={{color: '#ccc', marginTop: '8px'}}>{riff.notes}</p>
          </div>
          
          {/* THE TAB */}
          <div style={{background: '#000', padding: '20px', borderRadius: '12px', border: '2px solid #0af'}}>
            <div style={{textAlign: 'center', marginBottom: '10px'}}>
              <strong style={{color: '#0af'}}>🎼 TAB</strong>
            </div>
            <pre style={{
              fontFamily: 'Courier New, monospace',
              fontSize: '16px',
              color: '#0f8',
              lineHeight: '1.8',
              overflow: 'auto'
            }}>
              {riff.tab}
            </pre>
          </div>
          
          {/* TIPS */}
          <div style={{...styles.card, background: '#0f82', marginTop: '20px'}}>
            <strong>💡 Pro Tips:</strong>
            <ul style={{marginTop: '10px', paddingLeft: '20px', color: '#ccc'}}>
              <li>Start SLOW! Speed comes with practice</li>
              <li>Make sure each note rings clearly</li>
              <li>Use a metronome to keep steady rhythm</li>
              <li>Practice the hard parts in small sections</li>
            </ul>
          </div>
          
          {/* COMPLETE BUTTON */}
          <button onClick={handleComplete} style={{...styles.primaryBtn, width: '100%', marginTop: '20px', padding: '15px', fontSize: '18px'}}>
            ✅ I've Got It! Mark as Complete
          </button>
        </div>
      </div>
    </div>
  );
};

// ========== REAL-TIME CHORD DETECTOR COMPONENT ==========
const ChordDetector = ({ expectedChord, onChordDetected }) => {
  const [detectedChord, setDetectedChord] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [confidence, setConfidence] = useState(0);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);
  
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096; // Higher resolution for better chord detection
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      setIsListening(true);
      detectChord();
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Please allow microphone access to detect chords!');
    }
  };
  
  const stopListening = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsListening(false);
  };
  
  const detectChord = () => {
    if (!analyserRef.current) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    analyser.getByteFrequencyData(dataArray);
    
    // Detect chord from frequency data
    const result = detectChordFromFrequencies(dataArray, audioContextRef.current.sampleRate);
    
    if (result && result.chord) {
      setDetectedChord(result.chord);
      setConfidence(result.confidence);
      
      // Check if it matches expected chord
      if (expectedChord && result.chord === expectedChord && result.confidence > 0.6) {
        onChordDetected && onChordDetected(true, result.confidence * 100);
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(detectChord);
  };
  
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  const isCorrect = detectedChord === expectedChord;
  const confidencePercent = Math.round(confidence * 100);
  
  return (
    <div style={styles.detectorCard}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px'}}>
        <h4>🎤 Chord Detection</h4>
        <button onClick={toggleListening} style={{
          ...styles.primaryBtn,
          background: isListening ? '#f44' : '#0f8'
        }}>
          {isListening ? '⏹ Stop' : '▶️ Start'} Listening
        </button>
      </div>
      
      {expectedChord && (
        <div style={{marginBottom: '15px'}}>
          <div style={{color: '#888'}}>Target Chord:</div>
          <div style={{fontSize: '32px', fontWeight: 'bold', color: '#0af'}}>{expectedChord}</div>
        </div>
      )}
      
      {isListening && (
        <div>
          <div style={{color: '#888'}}>Detected:</div>
          <div style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: isCorrect ? '#0f8' : '#f44',
            marginBottom: '10px'
          }}>
            {detectedChord || '...'}</div>
          
          {detectedChord && (
            <div>
              <div style={{color: '#888', fontSize: '14px'}}>Confidence: {confidencePercent}%</div>
              <div style={styles.progressBar}>
                <div style={{
                  width: `${confidencePercent}%`,
                  height: '8px',
                  background: isCorrect ? '#0f8' : '#f44',
                  borderRadius: '4px',
                  transition: '0.3s'
                }}/>
              </div>
            </div>
          )}
          
          {isCorrect && (
            <div style={{
              marginTop: '15px',
              padding: '15px',
              background: '#0f82',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '24px'}}>✅</div>
              <strong>Perfect! Great job!</strong>
            </div>
          )}
        </div>
      )}
      
      {!isListening && (
        <div style={{color: '#888', textAlign: 'center', padding: '20px'}}>
          Click "Start Listening" to detect your chord
        </div>
      )}
    </div>
  );
};

// ========== INTERACTIVE LESSON WITH LOOP & SPEED CONTROLS ==========
const InteractiveLesson = ({ lesson, onExit, onComplete }) => {
  const [mode, setMode] = useState('practice'); // practice or playalong
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [detectionResult, setDetectionResult] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0); // 0.5 to 1.5
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(null);
  const [loopEnd, setLoopEnd] = useState(null);
  const [accuracyHistory, setAccuracyHistory] = useState([]);
  const [sessionTime, setSessionTime] = useState(0);
  const [completed, setCompleted] = useState(false);
  
  const playerRef = useRef(null);
  const timerRef = useRef(null);
  const sessionTimerRef = useRef(null);
  
  const currentEvent = lesson.timeline[currentEventIndex];
  
  // Session timer (15-20 min recommended!)
  useEffect(() => {
    sessionTimerRef.current = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(sessionTimerRef.current);
  }, []);
  
  // Micro-break reminder at 10 seconds (research shows this helps!)
  useEffect(() => {
    if (sessionTime === 10) {
      // Could show a quick "Take a 10-sec break!" message
    }
  }, [sessionTime]);
  
  // Auto-speed adjustment based on accuracy
  useEffect(() => {
    if (accuracyHistory.length < 3) return;
    
    const recentAccuracy = accuracyHistory.slice(-3);
    const avgAccuracy = recentAccuracy.reduce((a, b) => a + b, 0) / recentAccuracy.length;
    
    if (avgAccuracy > 85 && playbackSpeed < 1.5) {
      // User is nailing it - speed up!
      setPlaybackSpeed(prev => Math.min(prev + 0.1, 1.5));
    } else if (avgAccuracy < 70 && playbackSpeed > 0.5) {
      // User struggling - slow down
      setPlaybackSpeed(prev => Math.max(prev - 0.1, 0.5));
    }
  }, [accuracyHistory]);
  
  const handleChordDetected = (isCorrect, accuracy) => {
    setAccuracyHistory(prev => [...prev, accuracy].slice(-10)); // Keep last 10
    
    if (isCorrect && mode === 'practice') {
      // Move to next event
      if (currentEventIndex < lesson.timeline.length - 1) {
        setCurrentEventIndex(prev => prev + 1);
      } else {
        // Song complete!
        handleComplete();
      }
    }
  };
  
  const handleComplete = () => {
    const avgAccuracy = accuracyHistory.length > 0 
      ? accuracyHistory.reduce((a, b) => a + b, 0) / accuracyHistory.length 
      : 50;
    
    let stars = 1;
    if (avgAccuracy >= 70) stars = 2;
    if (avgAccuracy >= 85) stars = 3;
    
    setCompleted(true);
    onComplete(lesson.id, stars);
  };
  
  const setLoopPoint = (type) => {
    if (!playerRef.current) return;
    const currentTime = playerRef.current.getCurrentTime();
    
    if (type === 'start') {
      setLoopStart(currentTime);
    } else {
      setLoopEnd(currentTime);
      setLoopEnabled(true);
    }
  };
  
  const clearLoop = () => {
    setLoopEnabled(false);
    setLoopStart(null);
    setLoopEnd(null);
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (completed) {
    const avgAccuracy = accuracyHistory.reduce((a, b) => a + b, 0) / accuracyHistory.length;
    const stars = avgAccuracy >= 85 ? 3 : avgAccuracy >= 70 ? 2 : 1;
    
    return (
      <div style={styles.successOverlay}>
        <div style={styles.successCard}>
          <div style={{fontSize: '64px'}}>🎉</div>
          <h1>Song Complete!</h1>
          <p>{lesson.title} - {lesson.artist}</p>
          
          <div style={{margin: '20px 0'}}>
            {[1,2,3].map(s => (
              <span key={s} style={{fontSize: '48px', color: s <= stars ? '#ffa500' : '#333'}}>★</span>
            ))}
          </div>
          
          <div style={{color: '#0af', fontSize: '24px', fontWeight: 'bold', marginBottom: '10px'}}>+{lesson.xpReward} XP</div>
          <div style={{color: '#888'}}>Average Accuracy: {Math.round(avgAccuracy)}%</div>
          
          <button onClick={onExit} style={{...styles.primaryBtn, marginTop: '30px', padding: '15px 40px', fontSize: '18px'}}>
            Continue
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div style={styles.lessonPage}>
      {/* HEADER */}
      <div style={styles.lessonHeader}>
        <button onClick={onExit} style={styles.backBtn}>← Exit</button>
        
        <div style={{flex: 1, textAlign: 'center'}}>
          <h3>{lesson.title}</h3>
          <small style={{color: '#888'}}>{lesson.artist}</small>
        </div>
        
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <div style={{color: '#888', fontSize: '14px'}}>
            ⏱️ {formatTime(sessionTime)}
          </div>
          
          <select value={mode} onChange={(e) => setMode(e.target.value)} style={styles.modeSelect}>
            <option value="practice">Practice Mode</option>
            <option value="playalong">Play Along</option>
          </select>
        </div>
      </div>
      
      {/* LOOP & SPEED CONTROLS */}
      <div style={styles.controlsBar}>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          <strong style={{color: '#888', fontSize: '14px'}}>Speed:</strong>
          <button onClick={() => setPlaybackSpeed(prev => Math.max(prev - 0.1, 0.5))} style={styles.smallBtn}>-</button>
          <span style={{color: '#0af', fontWeight: 'bold', minWidth: '50px', textAlign: 'center'}}>{Math.round(playbackSpeed * 100)}%</span>
          <button onClick={() => setPlaybackSpeed(prev => Math.min(prev + 0.1, 1.5))} style={styles.smallBtn}>+</button>
        </div>
        
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          <button onClick={() => setLoopPoint('start')} style={styles.smallBtn}>Set Loop Start</button>
          <button onClick={() => setLoopPoint('end')} style={styles.smallBtn}>Set Loop End</button>
          {loopEnabled && (
            <>
              <span style={{color: '#0f8', fontSize: '12px'}}>🔁 Loop Active</span>
              <button onClick={clearLoop} style={{...styles.smallBtn, background: '#f44'}}>Clear</button>
            </>
          )}
        </div>
        
        {accuracyHistory.length > 0 && (
          <div style={{color: '#888', fontSize: '14px'}}>
            Accuracy: <span style={{color: '#0af', fontWeight: 'bold'}}>
              {Math.round(accuracyHistory.slice(-5).reduce((a, b) => a + b, 0) / Math.min(accuracyHistory.length, 5))}%
            </span>
          </div>
        )}
      </div>
      
      {/* MAIN LESSON AREA */}
      <div style={styles.lessonContent}>
        <VideoPlayer 
          lesson={lesson} 
          currentEventIndex={currentEventIndex}
          setCurrentEventIndex={setCurrentEventIndex}
          mode={mode}
          playbackSpeed={playbackSpeed}
          loopEnabled={loopEnabled}
          loopStart={loopStart}
          loopEnd={loopEnd}
          playerRef={playerRef}
          timerRef={timerRef}
        />
        
        {currentEvent && currentEvent.chord && (
          <div style={{marginTop: '30px'}}>
            <ChordDetectorWithFeedback 
              targetChord={currentEvent.chord}
              onChordDetected={handleChordDetected}
              mode={mode}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Continue with VideoPlayer and ChordDetector...
// Continuing GuitarLearning.jsx - PART 4: VIDEO PLAYER & CHORD DETECTOR

// ========== VIDEO PLAYER WITH LOOP SUPPORT ==========
const VideoPlayer = ({ lesson, currentEventIndex, setCurrentEventIndex, mode, playbackSpeed, loopEnabled, loopStart, loopEnd, playerRef, timerRef }) => {
  const [player, setPlayer] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const initRef = useRef(false);
  
  const currentEvent = lesson.timeline[currentEventIndex];
  
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(tag, firstScript);
    
    window.onYouTubeIframeAPIReady = () => {
      try {
        const newPlayer = new window.YT.Player('youtube-player', {
          videoId: lesson.youtube,
          playerVars: { controls: 1, modestbranding: 1 },
          events: {
            onReady: (event) => {
              setPlayer(event.target);
              playerRef.current = event.target;
              setIsReady(true);
            }
          }
        });
      } catch (error) {
        console.error('YouTube player error:', error);
      }
    };
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }
    };
  }, []);
  
  // Handle playback speed
  useEffect(() => {
    if (player && isReady) {
      try {
        player.setPlaybackRate(playbackSpeed);
      } catch (e) {}
    }
  }, [playbackSpeed, player, isReady]);
  
  // Handle loop
  useEffect(() => {
    if (!player || !isReady || !loopEnabled || loopStart === null || loopEnd === null) return;
    
    const loopInterval = setInterval(() => {
      try {
        const currentTime = player.getCurrentTime();
        if (currentTime >= loopEnd) {
          player.seekTo(loopStart, true);
        }
      } catch (e) {}
    }, 100);
    
    return () => clearInterval(loopInterval);
  }, [player, isReady, loopEnabled, loopStart, loopEnd]);
  
  // Handle timeline events
  useEffect(() => {
    if (!player || !isReady) return;
    
    timerRef.current = setInterval(() => {
      try {
        const currentTime = player.getCurrentTime();
        
        // Check if we need to move to next event
        if (currentEventIndex < lesson.timeline.length - 1) {
          const nextEvent = lesson.timeline[currentEventIndex + 1];
          if (currentTime >= nextEvent.time && mode === 'playalong') {
            setCurrentEventIndex(prev => prev + 1);
          }
        }
        
        // Pause in practice mode at chord changes
        if (currentEvent && currentEvent.chord && mode === 'practice') {
          if (Math.abs(currentTime - currentEvent.time) < 0.5) {
            player.pauseVideo();
          }
        }
      } catch (e) {}
    }, 100);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [player, isReady, currentEventIndex, mode]);
  
  return (
    <div>
      <div id="youtube-player" style={{width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden'}}></div>
      
      {currentEvent && (
        <div style={{...styles.eventCard, background: currentEvent.chord ? '#0af2' : '#f0f2'}}>
          <h3>{currentEvent.text}</h3>
          {currentEvent.chord && (
            <div style={{marginTop: '10px'}}>
              <span style={{fontSize: '32px', fontWeight: 'bold', color: '#0af'}}>{currentEvent.chord}</span>
              <div style={{color: '#888', fontSize: '14px', marginTop: '5px'}}>
                {mode === 'practice' ? 'Play this chord to continue →' : 'Play along!'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ========== ENHANCED CHORD DETECTOR WITH BETTER FEEDBACK ==========
const ChordDetectorWithFeedback = ({ targetChord, onChordDetected, mode }) => {
  const [listening, setListening] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [stringResults, setStringResults] = useState([]);
  const hasDetectedRef = useRef(false);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(null);
  
  const targetChordData = CHORDS[targetChord];
  
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);
  
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 8192;
      
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      setListening(true);
      hasDetectedRef.current = false;
      detectChord();
    } catch (error) {
      console.error('Microphone error:', error);
    }
  };
  
  const stopListening = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
        sourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
      } catch (e) {}
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
    }
    setListening(false);
  };
  
  const detectChord = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;
    
    try {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      const volume = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
      
      if (volume > 15) {
        const detectedFreqs = findPeaks(dataArrayRef.current, analyserRef.current);
        const result = compareWithTarget(detectedFreqs, targetChordData.notes);
        
        setDetectionResult(result);
        setStringResults(result.stringDetails);
        
        // Success condition with wiggle room
        if (result.matchPercentage >= 65 && !hasDetectedRef.current) {
          hasDetectedRef.current = true;
          playSuccessSound(result.matchPercentage);
          onChordDetected(true, result.matchPercentage);
        }
      }
      
      animationRef.current = requestAnimationFrame(detectChord);
    } catch (e) {
      console.error('Detection error:', e);
    }
  };
  
  const findPeaks = (dataArray, analyser) => {
    const peaks = [];
    const sampleRate = audioContextRef.current.sampleRate;
    const nyquist = sampleRate / 2;
    const binSize = nyquist / dataArray.length;
    
    for (let i = 10; i < dataArray.length; i++) {
      if (dataArray[i] > 100 && dataArray[i] > dataArray[i-1] && dataArray[i] > dataArray[i+1]) {
        const freq = i * binSize;
        if (freq >= 80 && freq <= 1200) {
          peaks.push(freq);
        }
      }
    }
    
    return peaks.slice(0, 6);
  };
  
  const compareWithTarget = (detected, target) => {
    let matchCount = 0;
    const tolerance = 0.08; // 8% wiggle room
    const stringDetails = [];
    
    target.forEach((targetFreq, index) => {
      const match = detected.some(detectedFreq => {
        const diff = Math.abs(detectedFreq - targetFreq) / targetFreq;
        return diff < tolerance;
      });
      
      stringDetails.push({ string: 6 - index, expected: targetFreq, detected: match });
      if (match) matchCount++;
    });
    
    const matchPercentage = (matchCount / target.length) * 100;
    
    return {
      isCorrect: matchPercentage >= 65,
      matchPercentage,
      matchCount,
      totalStrings: target.length,
      stringDetails
    };
  };
  
  const playSuccessSound = (accuracy) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      if (accuracy >= 85) {
        // Perfect! Play happy arpeggio
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.1 + 0.3);
          osc.start(audioCtx.currentTime + i * 0.1);
          osc.stop(audioCtx.currentTime + i * 0.1 + 0.3);
        });
      } else {
        // Close! Play gentle tone
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 440;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {}
  };
  
  return (
    <div style={styles.detectorCard}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h3>Target: {targetChord} ({targetChordData.name})</h3>
        {!listening ? (
          <button onClick={startListening} style={styles.primaryBtn}>
            🎤 Start Detection
          </button>
        ) : (
          <button onClick={stopListening} style={{...styles.primaryBtn, background: '#f44'}}>
            ⏹️ Stop
          </button>
        )}
      </div>
      
      {listening && (
        <>
          <ChordDiagram chord={targetChordData} name={targetChord} />
          
          {detectionResult && (
            <div style={{marginTop: '20px'}}>
              <div style={{...styles.progressBar, height: '30px', marginBottom: '10px'}}>
                <div style={{
                  height: '100%',
                  width: `${detectionResult.matchPercentage}%`,
                  background: detectionResult.matchPercentage >= 85 ? '#0f8' : detectionResult.matchPercentage >= 65 ? '#fa0' : '#f44',
                  transition: '0.3s',
                  borderRadius: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {Math.round(detectionResult.matchPercentage)}%
                </div>
              </div>
              
              <div style={{textAlign: 'center', marginBottom: '15px'}}>
                {detectionResult.matchPercentage >= 85 && <span style={{color: '#0f8', fontSize: '18px', fontWeight: 'bold'}}>🎉 Perfect! Great job!</span>}
                {detectionResult.matchPercentage >= 65 && detectionResult.matchPercentage < 85 && <span style={{color: '#fa0', fontSize: '18px', fontWeight: 'bold'}}>👍 Almost there! Keep going!</span>}
                {detectionResult.matchPercentage < 65 && <span style={{color: '#f44', fontSize: '18px', fontWeight: 'bold'}}>🎸 Try again - you got this!</span>}
              </div>
              
              <div style={{display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap'}}>
                {stringResults.map((result, i) => (
                  <div key={i} style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: result.detected ? '#0f8' : '#333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid ' + (result.detected ? '#0f8' : '#666')
                  }}>
                    {result.detected ? '✓' : i + 1}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Continue with GuitarTuner and helpers...
// Continuing GuitarLearning.jsx - PART 5: GUITAR TUNER, HELPERS & STYLES

// Helper function for reference tones
const playTone = (freq) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 2);
  } catch (e) {
    console.error('Audio error:', e);
  }
};

// ========== GUITAR TUNER (GOOD OLD VERSION!) ==========
const GuitarTuner = () => {
  const [selected, setSelected] = useState(null);
  const [listening, setListening] = useState(false);
  const [cents, setCents] = useState(0);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState(null);
  
  const audioCtx = useRef(null);
  const analyser = useRef(null);
  const stream = useRef(null);
  const animFrame = useRef(null);
  const smoothedCents = useRef(0);
  const readings = useRef([]);

  const start = async () => {
    if (!selected) return setError('Pick a string first!');
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      analyser.current = audioCtx.current.createAnalyser();
      analyser.current.fftSize = 4096;
      audioCtx.current.createMediaStreamSource(stream.current).connect(analyser.current);
      setListening(true);
      setError(null);
      readings.current = [];
      smoothedCents.current = 0;
      analyze();
    } catch (e) { setError('Mic error: ' + e.message); }
  };

  const stop = () => {
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    if (stream.current) stream.current.getTracks().forEach(t => t.stop());
    if (audioCtx.current) audioCtx.current.close();
    setListening(false);
    setCents(0);
    setVolume(0);
  };

  const analyze = () => {
    if (!analyser.current) return;
    const buf = new Uint8Array(analyser.current.fftSize);
    analyser.current.getByteTimeDomainData(buf);
    
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += Math.abs(buf[i] - 128);
    const vol = Math.min(100, (sum / buf.length) * 4);
    setVolume(vol);
    
    if (vol > 10 && selected) {
      const size = buf.length;
      const half = size / 2;
      let bestOff = -1, bestCorr = 0;
      
      for (let off = 30; off < half; off++) {
        let corr = 0;
        for (let i = 0; i < half; i++) {
          corr += Math.abs((buf[i] - 128) - (buf[i + off] - 128));
        }
        corr = 1 - corr / half / 128;
        if (corr > bestCorr) { bestCorr = corr; bestOff = off; }
      }
      
      if (bestCorr > 0.5 && bestOff > 0) {
        const freq = audioCtx.current.sampleRate / bestOff;
        const target = selected.freq;
        
        if (freq > target * 0.5 && freq < target * 2) {
          let c = 1200 * Math.log2(freq / target);
          if (c > 600) c -= 1200;
          if (c < -600) c += 1200;
          
          readings.current.push(c);
          if (readings.current.length > 15) readings.current.shift();
          
          const sorted = [...readings.current].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          
          smoothedCents.current = smoothedCents.current * 0.92 + median * 0.08;
          setCents(Math.round(smoothedCents.current));
        }
      }
    }
    animFrame.current = requestAnimationFrame(analyze);
  };

  useEffect(() => () => stop(), []);

  const getColor = () => {
    const c = Math.abs(cents);
    if (c <= 5) return '#00ff88';
    if (c <= 15) return '#aaff00';
    if (c <= 30) return '#ffaa00';
    return '#ff6b6b';
  };
  
  return (
    <div style={styles.section}>
      <h2>🎸 Guitar Tuner</h2>
      <p style={{color: '#888', marginBottom: '20px'}}>
        Select a string, then play it and tune until the needle is centered!
      </p>
      
      {error && <div style={{background: '#f442', padding: '10px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center'}}>{error}</div>}
      
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '15px', marginBottom: '30px'}}>
        {TUNING.map(s => (
          <div key={s.note} onClick={() => !listening && setSelected(s)} style={{
            padding: '15px',
            borderRadius: '12px',
            textAlign: 'center',
            background: selected?.note === s.note ? s.color : 'rgba(255,255,255,0.05)',
            color: selected?.note === s.note ? '#000' : '#fff',
            opacity: listening && selected?.note !== s.note ? 0.4 : 1,
            cursor: listening ? 'default' : 'pointer',
            transition: '0.3s',
            border: '2px solid ' + (selected?.note === s.note ? s.color : 'transparent'),
            position: 'relative'
          }}>
            <div style={{fontSize: '10px', color: selected?.note === s.note ? '#000' : '#888'}}>String {s.string}</div>
            <div style={{fontSize: '28px', fontWeight: 'bold', margin: '5px 0'}}>{s.name}</div>
            <div style={{fontSize: '11px', color: selected?.note === s.note ? '#000' : '#888'}}>{Math.round(s.freq)}Hz</div>
            <button onClick={e => { e.stopPropagation(); playTone(s.freq); }} style={{
              marginTop: '8px',
              padding: '5px 10px',
              background: 'rgba(0,0,0,0.2)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              🔊
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <div style={{...styles.card, maxWidth: '600px', margin: '0 auto'}}>
          <div style={{textAlign: 'center', marginBottom: '20px'}}>
            <span style={{display: 'inline-block', padding: '8px 20px', borderRadius: '20px', background: selected.color, color: '#000', fontWeight: 'bold', fontSize: '18px'}}>
              {selected.name} - {selected.label}
            </span>
          </div>
          
          {listening ? (
            <>
              <div style={{height: '30px', background: '#222', borderRadius: '15px', overflow: 'hidden', marginBottom: '10px'}}>
                <div style={{height: '100%', width: `${volume}%`, background: volume > 10 ? '#0f8' : '#666', transition: '0.1s'}}/>
              </div>
              <div style={{textAlign: 'center', fontSize: '12px', color: volume > 10 ? '#0f8' : '#666', marginBottom: '20px'}}>
                {volume > 10 ? '🎤 Sound detected!' : '🎤 Play the string...'}
              </div>
              
              <div style={{marginBottom: '15px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '5px'}}>
                  <span>♭ TOO LOW</span>
                  <span>✓ PERFECT</span>
                  <span>TOO HIGH ♯</span>
                </div>
                
                <div style={{position: 'relative', height: '60px', background: '#222', borderRadius: '30px', overflow: 'hidden'}}>
                  <div style={{position: 'absolute', left: '45%', right: '45%', top: 0, bottom: 0, background: 'rgba(0,255,136,0.2)'}}/>
                  <div style={{position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: '#0f8'}}/>
                  <div style={{
                    position: 'absolute',
                    left: `${50 + Math.max(-45, Math.min(45, cents))}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '24px',
                    height: '44px',
                    background: getColor(),
                    borderRadius: '12px',
                    boxShadow: `0 0 20px ${getColor()}`,
                    transition: '0.15s'
                  }}/>
                </div>
              </div>
              
              <div style={{textAlign: 'center', marginTop: '20px'}}>
                <div style={{fontSize: '32px', fontWeight: 'bold', color: getColor(), marginBottom: '5px'}}>
                  {Math.abs(cents) <= 5 ? '✅ IN TUNE!' : Math.abs(cents) <= 15 ? '👍 Almost!' : cents > 0 ? '⬇️ Too HIGH' : '⬆️ Too LOW'}
                </div>
                <div style={{fontSize: '18px', color: '#888'}}>{cents > 0 ? '+' : ''}{cents} cents</div>
              </div>
            </>
          ) : (
            <p style={{textAlign: 'center', color: '#888', padding: '40px 0'}}>
              Click START and play the {selected.name} string
            </p>
          )}
          
          <div style={{display: 'flex', gap: '10px', marginTop: '30px'}}>
            <button onClick={listening ? stop : start} style={{
              flex: 1,
              padding: '15px',
              background: listening ? '#f44' : '#0f8',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer'
            }}>
              {listening ? '⏹ STOP' : '▶ START'}
            </button>
            <button onClick={() => { stop(); setSelected(null); }} style={{
              flex: 1,
              padding: '15px',
              background: '#555',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer'
            }}>
              ↩ Reset
            </button>
          </div>
        </div>
      )}
      
      {!selected && (
        <p style={{textAlign: 'center', color: '#888', padding: '40px 0', fontSize: '16px'}}>
          👆 Click a string above to start tuning
        </p>
      )}
    </div>
  );
};

// ========== CHORD DIAGRAM HELPER ==========
const ChordDiagram = ({ chord, name }) => {
  return (
    <div style={{textAlign: 'center'}}>
      <div style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#0af'}}>
        {name}
      </div>
      
      <svg width="120" height="150" viewBox="0 0 120 150" style={{margin: '0 auto'}}>
        {/* Frets */}
        {[0, 1, 2, 3, 4].map(fret => (
          <line key={`fret-${fret}`} x1="20" y1={20 + fret * 25} x2="100" y2={20 + fret * 25} stroke="#666" strokeWidth="2"/>
        ))}
        
        {/* Strings */}
        {[0, 1, 2, 3, 4, 5].map(string => (
          <line key={`string-${string}`} x1={20 + string * 16} y1="20" x2={20 + string * 16} y2="120" stroke="#888" strokeWidth="1.5"/>
        ))}
        
        {/* Finger positions */}
        {chord.fingers.map(([string, fret, finger], i) => (
          <circle key={i} cx={20 + (6 - string) * 16} cy={20 + (fret - 0.5) * 25} r="6" fill="#0af"/>
        ))}
        
        {/* Open strings */}
        {chord.open.map((string, i) => (
          <circle key={`open-${i}`} cx={20 + (6 - string) * 16} cy="10" r="4" fill="none" stroke="#0f8" strokeWidth="2"/>
        ))}
        
        {/* Muted strings */}
        {chord.muted.map((string, i) => (
          <text key={`muted-${i}`} x={20 + (6 - string) * 16} y="12" fontSize="14" fill="#f44" textAnchor="middle">×</text>
        ))}
      </svg>
    </div>
  );
};

// ========== STYLES ==========
const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2a 100%)',
    color: '#fff',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  
  topBar: {
    background: 'rgba(0,0,0,0.3)',
    padding: '15px 20px',
    borderRadius: '12px',
    marginBottom: '20px',
    backdropFilter: 'blur(10px)'
  },
  
  userStats: {
    display: 'flex',
    gap: '30px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  
  nav: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  
  navBtn: {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: '0.3s',
    fontSize: '14px'
  },
  
  section: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  
  card: {
    background: 'rgba(255,255,255,0.05)',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginTop: '30px'
  },
  
  bigBtn: {
    background: 'rgba(0,170,255,0.2)',
    border: '2px solid #0af',
    borderRadius: '16px',
    padding: '30px 20px',
    color: '#fff',
    cursor: 'pointer',
    transition: '0.3s',
    textAlign: 'center'
  },
  
  lessonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px'
  },
  
  lessonCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: '0.3s',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  
  thumbnail: {
    position: 'relative'
  },
  
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '48px',
    color: '#fff',
    textShadow: '0 0 10px rgba(0,0,0,0.5)'
  },
  
  completedBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: '#0f8',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold'
  },
  
  chordTag: {
    display: 'inline-block',
    background: '#0af2',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    marginRight: '5px',
    marginTop: '5px'
  },
  
  difficultyBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold'
  },
  
  riffGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px'
  },
  
  riffCard: {
    background: 'rgba(255,255,255,0.05)',
    padding: '25px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: '0.3s',
    border: '1px solid rgba(255,255,255,0.1)',
    position: 'relative'
  },
  
  chordGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '20px'
  },
  
  chordCard: {
    background: 'rgba(255,255,255,0.05)',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  
  statCard: {
    background: 'rgba(255,255,255,0.05)',
    padding: '25px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  
  achievementBadge: {
    background: 'rgba(0,170,255,0.2)',
    border: '2px solid #0af',
    padding: '10px',
    borderRadius: '8px',
    textAlign: 'center',
    minWidth: '80px'
  },
  
  achievementCard: {
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px'
  },
  
  achievementPopup: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'fadeIn 0.3s'
  },
  
  achievementCard: {
    background: 'linear-gradient(135deg, #0af 0%, #0f8 100%)',
    padding: '40px',
    borderRadius: '20px',
    textAlign: 'center',
    maxWidth: '400px',
    animation: 'bounceIn 0.5s'
  },
  
  lessonPage: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2a 100%)',
    color: '#fff',
    padding: '20px'
  },
  
  lessonHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '20px'
  },
  
  backBtn: {
    padding: '10px 20px',
    background: '#333',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px'
  },
  
  modeSelect: {
    padding: '8px 15px',
    background: '#333',
    border: '1px solid #666',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer'
  },
  
  controlsBar: {
    background: 'rgba(0,0,0,0.3)',
    padding: '15px 20px',
    borderRadius: '12px',
    display: 'flex',
    gap: '20px',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: '20px'
  },
  
  smallBtn: {
    padding: '6px 12px',
    background: '#444',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px'
  },
  
  lessonContent: {
    maxWidth: '900px',
    margin: '0 auto'
  },
  
  eventCard: {
    padding: '20px',
    borderRadius: '12px',
    marginTop: '20px',
    textAlign: 'center'
  },
  
  detectorCard: {
    background: 'rgba(255,255,255,0.05)',
    padding: '25px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  
  progressBar: {
    background: '#222',
    borderRadius: '15px',
    overflow: 'hidden'
  },
  
  primaryBtn: {
    padding: '10px 20px',
    background: '#0af',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
    transition: '0.3s'
  },
  
  successOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  
  successCard: {
    background: 'linear-gradient(135deg, #0af 0%, #0f8 100%)',
    padding: '50px',
    borderRadius: '20px',
    textAlign: 'center',
    maxWidth: '500px'
  },
  
  riffContent: {
    padding: '20px'
  }
};
