import React, { useState, useEffect, useRef, useCallback } from 'react';

// Standard tuning frequencies
const TUNING = {
  'E2': { freq: 82.41, string: 6, name: 'E', octave: 2 },
  'A2': { freq: 110.00, string: 5, name: 'A', octave: 2 },
  'D3': { freq: 146.83, string: 4, name: 'D', octave: 3 },
  'G3': { freq: 196.00, string: 3, name: 'G', octave: 3 },
  'B3': { freq: 246.94, string: 2, name: 'B', octave: 3 },
  'E4': { freq: 329.63, string: 1, name: 'E', octave: 4 }
};

const NOTE_STRINGS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Chord diagrams data
const CHORDS = {
  'G': {
    name: 'G Major',
    fingers: [
      { string: 6, fret: 3, finger: 2 },
      { string: 5, fret: 2, finger: 1 },
      { string: 1, fret: 3, finger: 3 }
    ],
    open: [4, 3, 2],
    difficulty: 1,
    sound: 'happy'
  },
  'C': {
    name: 'C Major',
    fingers: [
      { string: 5, fret: 3, finger: 3 },
      { string: 4, fret: 2, finger: 2 },
      { string: 2, fret: 1, finger: 1 }
    ],
    open: [3, 1],
    muted: [6],
    difficulty: 2,
    sound: 'happy'
  },
  'D': {
    name: 'D Major',
    fingers: [
      { string: 3, fret: 2, finger: 1 },
      { string: 1, fret: 2, finger: 2 },
      { string: 2, fret: 3, finger: 3 }
    ],
    open: [4],
    muted: [6, 5],
    difficulty: 2,
    sound: 'happy'
  },
  'Em': {
    name: 'E Minor',
    fingers: [
      { string: 5, fret: 2, finger: 2 },
      { string: 4, fret: 2, finger: 3 }
    ],
    open: [6, 3, 2, 1],
    difficulty: 1,
    sound: 'sad'
  },
  'Am': {
    name: 'A Minor',
    fingers: [
      { string: 4, fret: 2, finger: 2 },
      { string: 3, fret: 2, finger: 3 },
      { string: 2, fret: 1, finger: 1 }
    ],
    open: [5, 1],
    muted: [6],
    difficulty: 2,
    sound: 'sad'
  },
  'E': {
    name: 'E Major',
    fingers: [
      { string: 5, fret: 2, finger: 2 },
      { string: 4, fret: 2, finger: 3 },
      { string: 3, fret: 1, finger: 1 }
    ],
    open: [6, 2, 1],
    difficulty: 2,
    sound: 'happy'
  },
  'A': {
    name: 'A Major',
    fingers: [
      { string: 4, fret: 2, finger: 1 },
      { string: 3, fret: 2, finger: 2 },
      { string: 2, fret: 2, finger: 3 }
    ],
    open: [5, 1],
    muted: [6],
    difficulty: 2,
    sound: 'happy'
  },
  'Dm': {
    name: 'D Minor',
    fingers: [
      { string: 3, fret: 2, finger: 2 },
      { string: 2, fret: 3, finger: 3 },
      { string: 1, fret: 1, finger: 1 }
    ],
    open: [4],
    muted: [6, 5],
    difficulty: 2,
    sound: 'sad'
  }
};

// Beginner songs organized by difficulty
const SONGS = {
  level1: [
    { title: "Horse With No Name", artist: "America", chords: ["Em", "D"], tip: "Just 2 chords the whole song!", youtube: "https://www.youtube.com/watch?v=zSAJ0l4OBHM" },
    { title: "Eleanor Rigby", artist: "Beatles", chords: ["Em", "C"], tip: "Beautiful sad song", youtube: "https://www.youtube.com/watch?v=HuS5NuXRb5Y" },
    { title: "Achy Breaky Heart", artist: "Billy Ray Cyrus", chords: ["A", "E"], tip: "Fun country song!", youtube: "https://www.youtube.com/watch?v=byQIPdHMpjc" }
  ],
  level2: [
    { title: "Three Little Birds", artist: "Bob Marley", chords: ["A", "D", "E"], tip: "Don't worry! 🎶", youtube: "https://www.youtube.com/watch?v=zaGUr6wzyT8" },
    { title: "Love Me Do", artist: "Beatles", chords: ["G", "C", "D"], tip: "Classic Beatles!", youtube: "https://www.youtube.com/watch?v=0pGOFX1D_jg" },
    { title: "Bad Moon Rising", artist: "CCR", chords: ["D", "A", "G"], tip: "Rock energy!", youtube: "https://www.youtube.com/watch?v=zUQiUFZ5RDw" },
    { title: "Happy Birthday", artist: "Traditional", chords: ["G", "C", "D"], tip: "Everyone needs this!", youtube: null }
  ],
  level3: [
    { title: "Zombie", artist: "Cranberries", chords: ["Em", "C", "G", "D"], tip: "Intense and powerful", youtube: "https://www.youtube.com/watch?v=6Ejga4kJUts" },
    { title: "Stand By Me", artist: "Ben E. King", chords: ["G", "Em", "C", "D"], tip: "Timeless classic", youtube: "https://www.youtube.com/watch?v=hwZNL7QVJjE" },
    { title: "Perfect", artist: "Ed Sheeran", chords: ["G", "Em", "C", "D"], tip: "Modern hit!", youtube: "https://www.youtube.com/watch?v=2Vv-BfVoq4g" },
    { title: "Wonderwall", artist: "Oasis", chords: ["Em", "G", "D", "A"], tip: "Everyone knows this one!", youtube: "https://www.youtube.com/watch?v=bx1Bh8ZvH84" },
    { title: "Let It Be", artist: "Beatles", chords: ["C", "G", "Am", "Em"], tip: "Beautiful and easy", youtube: "https://www.youtube.com/watch?v=QDYfEBY9NM4" }
  ]
};

// Pitch detection using autocorrelation
function autoCorrelate(buffer, sampleRate) {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;
  let foundGoodCorrelation = false;
  const correlations = new Array(MAX_SAMPLES);

  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  if (rms < 0.01) return -1; // Not enough signal

  let lastCorrelation = 1;
  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;

    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }
    correlation = 1 - correlation / MAX_SAMPLES;
    correlations[offset] = correlation;

    if (correlation > 0.9 && correlation > lastCorrelation) {
      foundGoodCorrelation = true;
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    } else if (foundGoodCorrelation) {
      const shift = (correlations[bestOffset + 1] - correlations[bestOffset - 1]) / correlations[bestOffset];
      return sampleRate / (bestOffset + 8 * shift);
    }
    lastCorrelation = correlation;
  }

  if (bestCorrelation > 0.01) {
    return sampleRate / bestOffset;
  }
  return -1;
}

// Get note name from frequency
function getNoteFromFrequency(frequency) {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  const note = Math.round(noteNum) + 69;
  const octave = Math.floor((note - 12) / 12);
  const noteName = NOTE_STRINGS[note % 12];
  return { note: noteName, octave, noteNum: note };
}

// Get cents off from target
function getCentsOffFromPitch(frequency, targetFreq) {
  return Math.floor(1200 * Math.log(frequency / targetFreq) / Math.log(2));
}

// Chord Diagram Component
const ChordDiagram = ({ chord, size = 150 }) => {
  const data = CHORDS[chord];
  if (!data) return null;

  const stringSpacing = size / 7;
  const fretSpacing = size / 5;
  const startX = stringSpacing;
  const startY = 30;

  return (
    <svg width={size} height={size + 40} style={{ background: 'transparent' }}>
      {/* Chord name */}
      <text x={size/2} y="18" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
        {chord}
      </text>
      
      {/* Nut */}
      <rect x={startX - 5} y={startY} width={stringSpacing * 5 + 10} height="4" fill="white" rx="2" />
      
      {/* Frets */}
      {[1, 2, 3, 4].map(fret => (
        <line 
          key={fret}
          x1={startX - 5} 
          y1={startY + fret * fretSpacing} 
          x2={startX + stringSpacing * 5 + 5} 
          y2={startY + fret * fretSpacing}
          stroke="#666" 
          strokeWidth="2"
        />
      ))}
      
      {/* Strings */}
      {[0, 1, 2, 3, 4, 5].map(string => (
        <line 
          key={string}
          x1={startX + string * stringSpacing} 
          y1={startY} 
          x2={startX + string * stringSpacing} 
          y2={startY + 4 * fretSpacing}
          stroke="#999" 
          strokeWidth="1.5"
        />
      ))}
      
      {/* Open strings */}
      {data.open?.map(string => (
        <circle 
          key={`open-${string}`}
          cx={startX + (6 - string) * stringSpacing} 
          cy={startY - 10}
          r="6"
          fill="none"
          stroke="#00ff88"
          strokeWidth="2"
        />
      ))}
      
      {/* Muted strings */}
      {data.muted?.map(string => (
        <text 
          key={`mute-${string}`}
          x={startX + (6 - string) * stringSpacing} 
          y={startY - 5}
          textAnchor="middle"
          fill="#ff6b6b"
          fontSize="14"
          fontWeight="bold"
        >
          ✕
        </text>
      ))}
      
      {/* Finger positions */}
      {data.fingers.map((f, i) => (
        <g key={i}>
          <circle 
            cx={startX + (6 - f.string) * stringSpacing} 
            cy={startY + (f.fret - 0.5) * fretSpacing}
            r="10"
            fill="#00aaff"
          />
          <text 
            x={startX + (6 - f.string) * stringSpacing} 
            y={startY + (f.fret - 0.5) * fretSpacing + 4}
            textAnchor="middle"
            fill="white"
            fontSize="11"
            fontWeight="bold"
          >
            {f.finger}
          </text>
        </g>
      ))}
      
      {/* String labels */}
      <text x={startX} y={startY + 4.5 * fretSpacing + 15} textAnchor="middle" fill="#666" fontSize="10">E</text>
      <text x={startX + stringSpacing} y={startY + 4.5 * fretSpacing + 15} textAnchor="middle" fill="#666" fontSize="10">A</text>
      <text x={startX + 2*stringSpacing} y={startY + 4.5 * fretSpacing + 15} textAnchor="middle" fill="#666" fontSize="10">D</text>
      <text x={startX + 3*stringSpacing} y={startY + 4.5 * fretSpacing + 15} textAnchor="middle" fill="#666" fontSize="10">G</text>
      <text x={startX + 4*stringSpacing} y={startY + 4.5 * fretSpacing + 15} textAnchor="middle" fill="#666" fontSize="10">B</text>
      <text x={startX + 5*stringSpacing} y={startY + 4.5 * fretSpacing + 15} textAnchor="middle" fill="#666" fontSize="10">E</text>
    </svg>
  );
};

// Tuner Component
const GuitarTuner = () => {
  const [isListening, setIsListening] = useState(false);
  const [currentNote, setCurrentNote] = useState(null);
  const [frequency, setFrequency] = useState(0);
  const [cents, setCents] = useState(0);
  const [targetString, setTargetString] = useState(null);
  const [tuningStatus, setTuningStatus] = useState('waiting');
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const rafIdRef = useRef(null);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      setIsListening(true);
      detectPitch();
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Please allow microphone access to use the tuner!');
    }
  };

  const stopListening = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsListening(false);
    setCurrentNote(null);
    setFrequency(0);
    setCents(0);
  };

  const detectPitch = useCallback(() => {
    if (!analyserRef.current) return;
    
    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);
    
    const detectedFreq = autoCorrelate(buffer, audioContextRef.current.sampleRate);
    
    if (detectedFreq > 50 && detectedFreq < 500) {
      setFrequency(Math.round(detectedFreq * 10) / 10);
      const noteInfo = getNoteFromFrequency(detectedFreq);
      setCurrentNote(noteInfo);
      
      // Find closest guitar string
      let closestString = null;
      let minDiff = Infinity;
      
      Object.entries(TUNING).forEach(([key, data]) => {
        const diff = Math.abs(detectedFreq - data.freq);
        if (diff < minDiff && diff < 20) {
          minDiff = diff;
          closestString = key;
        }
      });
      
      if (closestString) {
        const targetFreq = TUNING[closestString].freq;
        const centsOff = getCentsOffFromPitch(detectedFreq, targetFreq);
        setCents(centsOff);
        setTargetString(closestString);
        
        if (Math.abs(centsOff) <= 5) {
          setTuningStatus('perfect');
        } else if (Math.abs(centsOff) <= 15) {
          setTuningStatus('close');
        } else if (centsOff > 0) {
          setTuningStatus('sharp');
        } else {
          setTuningStatus('flat');
        }
      }
    }
    
    rafIdRef.current = requestAnimationFrame(detectPitch);
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const getStatusColor = () => {
    switch (tuningStatus) {
      case 'perfect': return '#00ff88';
      case 'close': return '#ffaa00';
      case 'sharp': return '#ff6b6b';
      case 'flat': return '#ff6b6b';
      default: return '#666';
    }
  };

  const getStatusText = () => {
    switch (tuningStatus) {
      case 'perfect': return '✓ IN TUNE!';
      case 'close': return '≈ Almost there...';
      case 'sharp': return '↓ Too HIGH - loosen string';
      case 'flat': return '↑ Too LOW - tighten string';
      default: return 'Play a string...';
    }
  };

  return (
    <div style={styles.tunerContainer}>
      <h3 style={styles.sectionTitle}>🎸 Guitar Tuner</h3>
      
      {/* String buttons */}
      <div style={styles.stringButtons}>
        {Object.entries(TUNING).map(([key, data]) => (
          <div 
            key={key}
            style={{
              ...styles.stringButton,
              background: targetString === key ? getStatusColor() : '#2a2a3a',
              color: targetString === key ? '#000' : '#fff'
            }}
          >
            <div style={styles.stringName}>{data.name}{data.octave}</div>
            <div style={styles.stringFreq}>{data.freq} Hz</div>
            <div style={styles.stringNum}>String {data.string}</div>
          </div>
        ))}
      </div>

      {/* Tuner display */}
      <div style={styles.tunerDisplay}>
        {isListening ? (
          <>
            <div style={styles.noteDisplay}>
              {currentNote ? `${currentNote.note}${currentNote.octave}` : '--'}
            </div>
            <div style={styles.freqDisplay}>{frequency} Hz</div>
            
            {/* Cents meter */}
            <div style={styles.centsMeter}>
              <div style={styles.centsScale}>
                <span>-50</span>
                <span>0</span>
                <span>+50</span>
              </div>
              <div style={styles.centsTrack}>
                <div 
                  style={{
                    ...styles.centsNeedle,
                    left: `${50 + Math.max(-50, Math.min(50, cents))}%`,
                    background: getStatusColor()
                  }}
                />
                <div style={styles.centsCenter} />
              </div>
            </div>
            
            <div style={{ ...styles.statusText, color: getStatusColor() }}>
              {getStatusText()}
            </div>
          </>
        ) : (
          <div style={styles.tunerInstructions}>
            <p>🎤 Click START to begin tuning</p>
            <p style={{ fontSize: '14px', color: '#888' }}>Make sure your guitar is near the microphone!</p>
          </div>
        )}
      </div>

      <button 
        onClick={isListening ? stopListening : startListening}
        style={{
          ...styles.tunerButton,
          background: isListening ? '#ff6b6b' : '#00ff88'
        }}
      >
        {isListening ? '⏹ STOP' : '🎤 START TUNER'}
      </button>
    </div>
  );
};

// Main Component
const GuitarLearning = () => {
  const [activeTab, setActiveTab] = useState('tuner');
  const [selectedChord, setSelectedChord] = useState('G');
  const [practiceStreak, setPracticeStreak] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('guitarStreak');
    if (saved) setPracticeStreak(parseInt(saved));
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🎸 Guitar Learning Center</h1>
        <p style={styles.subtitle}>Dust off those cobwebs and let's rock!</p>
        <div style={styles.streakBadge}>
          🔥 {practiceStreak} day streak
        </div>
      </div>

      {/* Tab navigation */}
      <div style={styles.tabs}>
        {[
          { id: 'tuner', label: '🎤 Tuner', desc: 'Tune your guitar' },
          { id: 'chords', label: '🎵 Chords', desc: 'Learn chord shapes' },
          { id: 'songs', label: '🎶 Songs', desc: 'Easy songs to play' },
          { id: 'lessons', label: '📚 Lessons', desc: 'Step by step guide' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tab,
              background: activeTab === tab.id ? 'var(--primary)' : 'var(--surface)',
              borderColor: activeTab === tab.id ? 'var(--primary)' : 'transparent'
            }}
          >
            <span style={styles.tabLabel}>{tab.label}</span>
            <span style={styles.tabDesc}>{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'tuner' && <GuitarTuner />}

        {activeTab === 'chords' && (
          <div style={styles.chordsSection}>
            <h3 style={styles.sectionTitle}>Essential Beginner Chords</h3>
            <p style={styles.sectionDesc}>Master these 8 chords and you can play thousands of songs!</p>
            
            <div style={styles.chordGrid}>
              {Object.keys(CHORDS).map(chord => (
                <div 
                  key={chord}
                  onClick={() => setSelectedChord(chord)}
                  style={{
                    ...styles.chordCard,
                    border: selectedChord === chord ? '2px solid var(--primary)' : '2px solid transparent'
                  }}
                >
                  <ChordDiagram chord={chord} size={140} />
                  <div style={styles.chordInfo}>
                    <span style={styles.chordName}>{CHORDS[chord].name}</span>
                    <span style={{
                      ...styles.chordDifficulty,
                      color: CHORDS[chord].difficulty === 1 ? '#00ff88' : '#ffaa00'
                    }}>
                      {'⭐'.repeat(CHORDS[chord].difficulty)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {selectedChord && (
              <div style={styles.chordDetail}>
                <h4>{CHORDS[selectedChord].name}</h4>
                <p>Sound: {CHORDS[selectedChord].sound === 'happy' ? '😊 Happy/Bright' : '😢 Sad/Mellow'}</p>
                <div style={styles.fingerTips}>
                  <strong>Finger placement:</strong>
                  <ul>
                    {CHORDS[selectedChord].fingers.map((f, i) => (
                      <li key={i}>Finger {f.finger} → String {f.string}, Fret {f.fret}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'songs' && (
          <div style={styles.songsSection}>
            <h3 style={styles.sectionTitle}>🎵 Easy Songs to Learn</h3>
            
            {/* Level 1 */}
            <div style={styles.songLevel}>
              <h4 style={styles.levelTitle}>
                <span style={styles.levelBadge}>Level 1</span>
                2-Chord Songs (Start Here!)
              </h4>
              <div style={styles.songGrid}>
                {SONGS.level1.map((song, i) => (
                  <div key={i} style={styles.songCard}>
                    <div style={styles.songTitle}>{song.title}</div>
                    <div style={styles.songArtist}>{song.artist}</div>
                    <div style={styles.songChords}>
                      {song.chords.map(c => (
                        <span key={c} style={styles.chordBadge}>{c}</span>
                      ))}
                    </div>
                    <div style={styles.songTip}>💡 {song.tip}</div>
                    {song.youtube && (
                      <a href={song.youtube} target="_blank" rel="noopener noreferrer" style={styles.youtubeLink}>
                        ▶️ Watch Tutorial
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Level 2 */}
            <div style={styles.songLevel}>
              <h4 style={styles.levelTitle}>
                <span style={{...styles.levelBadge, background: '#ffaa00'}}>Level 2</span>
                3-Chord Songs
              </h4>
              <div style={styles.songGrid}>
                {SONGS.level2.map((song, i) => (
                  <div key={i} style={styles.songCard}>
                    <div style={styles.songTitle}>{song.title}</div>
                    <div style={styles.songArtist}>{song.artist}</div>
                    <div style={styles.songChords}>
                      {song.chords.map(c => (
                        <span key={c} style={styles.chordBadge}>{c}</span>
                      ))}
                    </div>
                    <div style={styles.songTip}>💡 {song.tip}</div>
                    {song.youtube && (
                      <a href={song.youtube} target="_blank" rel="noopener noreferrer" style={styles.youtubeLink}>
                        ▶️ Watch Tutorial
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Level 3 */}
            <div style={styles.songLevel}>
              <h4 style={styles.levelTitle}>
                <span style={{...styles.levelBadge, background: '#ff6b6b'}}>Level 3</span>
                4-Chord Songs
              </h4>
              <div style={styles.songGrid}>
                {SONGS.level3.map((song, i) => (
                  <div key={i} style={styles.songCard}>
                    <div style={styles.songTitle}>{song.title}</div>
                    <div style={styles.songArtist}>{song.artist}</div>
                    <div style={styles.songChords}>
                      {song.chords.map(c => (
                        <span key={c} style={styles.chordBadge}>{c}</span>
                      ))}
                    </div>
                    <div style={styles.songTip}>💡 {song.tip}</div>
                    {song.youtube && (
                      <a href={song.youtube} target="_blank" rel="noopener noreferrer" style={styles.youtubeLink}>
                        ▶️ Watch Tutorial
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'lessons' && (
          <div style={styles.lessonsSection}>
            <h3 style={styles.sectionTitle}>📚 Learning Path</h3>
            
            <div style={styles.lessonPath}>
              <div style={styles.lessonCard}>
                <div style={styles.lessonNum}>Week 1</div>
                <h4>Getting Started</h4>
                <ul style={styles.lessonList}>
                  <li>✓ Learn to hold the guitar properly</li>
                  <li>✓ Tune your guitar (use the tuner tab!)</li>
                  <li>✓ Learn G and Em chords</li>
                  <li>✓ Practice switching between them</li>
                  <li>🎵 Song: "Horse With No Name"</li>
                </ul>
                <div style={styles.practiceTime}>⏱️ Practice: 15 min/day</div>
              </div>

              <div style={styles.lessonCard}>
                <div style={styles.lessonNum}>Week 2</div>
                <h4>Adding More Chords</h4>
                <ul style={styles.lessonList}>
                  <li>✓ Learn C and D chords</li>
                  <li>✓ Practice G → C → D transitions</li>
                  <li>✓ Basic down strumming pattern</li>
                  <li>🎵 Songs: "Love Me Do", "Bad Moon Rising"</li>
                </ul>
                <div style={styles.practiceTime}>⏱️ Practice: 20 min/day</div>
              </div>

              <div style={styles.lessonCard}>
                <div style={styles.lessonNum}>Week 3</div>
                <h4>Minor Chords</h4>
                <ul style={styles.lessonList}>
                  <li>✓ Learn Am and Dm chords</li>
                  <li>✓ Understand major vs minor sound</li>
                  <li>✓ Practice all 6 chords</li>
                  <li>🎵 Songs: "Stand By Me", "Let It Be"</li>
                </ul>
                <div style={styles.practiceTime}>⏱️ Practice: 20 min/day</div>
              </div>

              <div style={styles.lessonCard}>
                <div style={styles.lessonNum}>Week 4</div>
                <h4>Putting It All Together</h4>
                <ul style={styles.lessonList}>
                  <li>✓ Learn A and E chords</li>
                  <li>✓ All 8 essential chords mastered!</li>
                  <li>✓ Strumming patterns: D DU UDU</li>
                  <li>🎵 Pick ANY song from the list!</li>
                </ul>
                <div style={styles.practiceTime}>⏱️ Practice: 20 min/day</div>
              </div>
            </div>

            <div style={styles.tips}>
              <h4>🎯 Pro Tips for Beginners</h4>
              <div style={styles.tipGrid}>
                <div style={styles.tipCard}>
                  <span style={styles.tipIcon}>👆</span>
                  <strong>Press with fingertips</strong>
                  <p>Not the flat part - fingertips give cleaner sound</p>
                </div>
                <div style={styles.tipCard}>
                  <span style={styles.tipIcon}>🎸</span>
                  <strong>Press behind the fret</strong>
                  <p>Not on top of it - gives cleaner notes</p>
                </div>
                <div style={styles.tipCard}>
                  <span style={styles.tipIcon}>🐢</span>
                  <strong>Start SLOW</strong>
                  <p>Speed comes later - accuracy first!</p>
                </div>
                <div style={styles.tipCard}>
                  <span style={styles.tipIcon}>📅</span>
                  <strong>Daily beats weekly</strong>
                  <p>15 min every day > 2 hours once a week</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'var(--background)',
    padding: '20px'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '2.5em',
    marginBottom: '10px',
    background: 'linear-gradient(90deg, #ff6b6b, #ffaa00, #00ff88)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '1.1em'
  },
  streakBadge: {
    display: 'inline-block',
    background: 'linear-gradient(90deg, #ff6b6b, #ffaa00)',
    padding: '8px 20px',
    borderRadius: '20px',
    marginTop: '15px',
    fontWeight: 'bold'
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  tab: {
    padding: '15px 25px',
    borderRadius: '12px',
    border: '2px solid',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '140px'
  },
  tabLabel: {
    fontSize: '1.1em',
    fontWeight: 'bold'
  },
  tabDesc: {
    fontSize: '0.8em',
    color: 'var(--text-secondary)',
    marginTop: '4px'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  sectionTitle: {
    fontSize: '1.5em',
    marginBottom: '10px',
    textAlign: 'center'
  },
  sectionDesc: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    marginBottom: '25px'
  },

  // Tuner styles
  tunerContainer: {
    background: 'var(--surface)',
    borderRadius: '16px',
    padding: '30px',
    textAlign: 'center'
  },
  stringButtons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '30px',
    flexWrap: 'wrap'
  },
  stringButton: {
    padding: '12px 15px',
    borderRadius: '10px',
    minWidth: '70px',
    transition: 'all 0.2s'
  },
  stringName: {
    fontSize: '1.2em',
    fontWeight: 'bold'
  },
  stringFreq: {
    fontSize: '0.75em',
    opacity: 0.8
  },
  stringNum: {
    fontSize: '0.7em',
    opacity: 0.6
  },
  tunerDisplay: {
    background: '#1a1a2a',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '20px'
  },
  noteDisplay: {
    fontSize: '4em',
    fontWeight: 'bold',
    marginBottom: '10px'
  },
  freqDisplay: {
    fontSize: '1.2em',
    color: '#888',
    marginBottom: '20px'
  },
  centsMeter: {
    maxWidth: '400px',
    margin: '0 auto 20px'
  },
  centsScale: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '5px',
    color: '#666',
    fontSize: '12px'
  },
  centsTrack: {
    height: '20px',
    background: '#333',
    borderRadius: '10px',
    position: 'relative',
    overflow: 'hidden'
  },
  centsNeedle: {
    position: 'absolute',
    width: '4px',
    height: '100%',
    transform: 'translateX(-50%)',
    transition: 'left 0.1s ease-out',
    borderRadius: '2px'
  },
  centsCenter: {
    position: 'absolute',
    left: '50%',
    top: '0',
    width: '2px',
    height: '100%',
    background: '#00ff88',
    transform: 'translateX(-50%)'
  },
  statusText: {
    fontSize: '1.3em',
    fontWeight: 'bold'
  },
  tunerInstructions: {
    padding: '40px'
  },
  tunerButton: {
    padding: '15px 40px',
    fontSize: '1.2em',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '30px',
    cursor: 'pointer',
    color: '#000',
    transition: 'transform 0.2s'
  },

  // Chord styles
  chordsSection: {
    background: 'var(--surface)',
    borderRadius: '16px',
    padding: '30px'
  },
  chordGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '15px',
    marginBottom: '30px'
  },
  chordCard: {
    background: '#1a1a2a',
    borderRadius: '12px',
    padding: '15px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center'
  },
  chordInfo: {
    marginTop: '10px'
  },
  chordName: {
    display: 'block',
    fontWeight: 'bold'
  },
  chordDifficulty: {
    fontSize: '0.9em'
  },
  chordDetail: {
    background: '#1a1a2a',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'left'
  },
  fingerTips: {
    marginTop: '15px'
  },

  // Songs styles
  songsSection: {
    background: 'var(--surface)',
    borderRadius: '16px',
    padding: '30px'
  },
  songLevel: {
    marginBottom: '30px'
  },
  levelTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '15px'
  },
  levelBadge: {
    background: '#00ff88',
    color: '#000',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.8em',
    fontWeight: 'bold'
  },
  songGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '15px'
  },
  songCard: {
    background: '#1a1a2a',
    borderRadius: '12px',
    padding: '20px'
  },
  songTitle: {
    fontSize: '1.1em',
    fontWeight: 'bold',
    marginBottom: '5px'
  },
  songArtist: {
    color: '#888',
    marginBottom: '10px'
  },
  songChords: {
    display: 'flex',
    gap: '8px',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  chordBadge: {
    background: 'var(--primary)',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.85em',
    fontWeight: 'bold'
  },
  songTip: {
    fontSize: '0.9em',
    color: '#aaa',
    marginBottom: '10px'
  },
  youtubeLink: {
    display: 'inline-block',
    color: '#ff6b6b',
    textDecoration: 'none',
    fontWeight: 'bold'
  },

  // Lessons styles
  lessonsSection: {
    background: 'var(--surface)',
    borderRadius: '16px',
    padding: '30px'
  },
  lessonPath: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  lessonCard: {
    background: '#1a1a2a',
    borderRadius: '12px',
    padding: '20px',
    position: 'relative'
  },
  lessonNum: {
    position: 'absolute',
    top: '-10px',
    left: '20px',
    background: 'var(--primary)',
    padding: '4px 12px',
    borderRadius: '10px',
    fontSize: '0.85em',
    fontWeight: 'bold'
  },
  lessonList: {
    listStyle: 'none',
    padding: '0',
    marginTop: '15px'
  },
  practiceTime: {
    marginTop: '15px',
    padding: '10px',
    background: 'rgba(0,255,136,0.1)',
    borderRadius: '8px',
    fontSize: '0.9em'
  },
  tips: {
    marginTop: '30px'
  },
  tipGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginTop: '15px'
  },
  tipCard: {
    background: '#1a1a2a',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center'
  },
  tipIcon: {
    fontSize: '2em',
    display: 'block',
    marginBottom: '10px'
  }
};

export default GuitarLearning;
