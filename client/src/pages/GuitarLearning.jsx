import React, { useState, useEffect, useRef } from 'react';

// Standard tuning frequencies
const TUNING = [
  { note: 'E2', freq: 82.41, string: 6, name: 'E', label: '6th (thickest)' },
  { note: 'A2', freq: 110.00, string: 5, name: 'A', label: '5th' },
  { note: 'D3', freq: 146.83, string: 4, name: 'D', label: '4th' },
  { note: 'G3', freq: 196.00, string: 3, name: 'G', label: '3rd' },
  { note: 'B3', freq: 246.94, string: 2, name: 'B', label: '2nd' },
  { note: 'E4', freq: 329.63, string: 1, name: 'E', label: '1st (thinnest)' }
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Chord diagrams data
const CHORDS = {
  'G': { name: 'G Major', fingers: [[6,3,2], [5,2,1], [1,3,3]], open: [4,3,2], muted: [], difficulty: 1 },
  'C': { name: 'C Major', fingers: [[5,3,3], [4,2,2], [2,1,1]], open: [3,1], muted: [6], difficulty: 2 },
  'D': { name: 'D Major', fingers: [[3,2,1], [1,2,2], [2,3,3]], open: [4], muted: [6,5], difficulty: 2 },
  'Em': { name: 'E Minor', fingers: [[5,2,2], [4,2,3]], open: [6,3,2,1], muted: [], difficulty: 1 },
  'Am': { name: 'A Minor', fingers: [[4,2,2], [3,2,3], [2,1,1]], open: [5,1], muted: [6], difficulty: 2 },
  'E': { name: 'E Major', fingers: [[5,2,2], [4,2,3], [3,1,1]], open: [6,2,1], muted: [], difficulty: 2 },
  'A': { name: 'A Major', fingers: [[4,2,1], [3,2,2], [2,2,3]], open: [5,1], muted: [6], difficulty: 2 },
  'Dm': { name: 'D Minor', fingers: [[3,2,2], [2,3,3], [1,1,1]], open: [4], muted: [6,5], difficulty: 2 }
};

const SONGS = [
  { level: 1, title: "Horse With No Name", artist: "America", chords: ["Em", "D"], tip: "Just 2 chords!", youtube: "zSAJ0l4OBHM" },
  { level: 1, title: "Eleanor Rigby", artist: "Beatles", chords: ["Em", "C"], tip: "Beautiful melody", youtube: "HuS5NuXRb5Y" },
  { level: 2, title: "Three Little Birds", artist: "Bob Marley", chords: ["A", "D", "E"], tip: "Don't worry! 🎶", youtube: "zaGUr6wzyT8" },
  { level: 2, title: "Love Me Do", artist: "Beatles", chords: ["G", "C", "D"], tip: "Classic!", youtube: "0pGOFX1D_jg" },
  { level: 2, title: "Bad Moon Rising", artist: "CCR", chords: ["D", "A", "G"], tip: "Rock energy!", youtube: "zUQiUFZ5RDw" },
  { level: 3, title: "Zombie", artist: "Cranberries", chords: ["Em", "C", "G", "D"], tip: "Powerful!", youtube: "6Ejga4kJUts" },
  { level: 3, title: "Stand By Me", artist: "Ben E. King", chords: ["G", "Em", "C", "D"], tip: "Timeless", youtube: "hwZNL7QVJjE" },
  { level: 3, title: "Perfect", artist: "Ed Sheeran", chords: ["G", "Em", "C", "D"], tip: "Modern hit!", youtube: "2Vv-BfVoq4g" },
  { level: 3, title: "Wonderwall", artist: "Oasis", chords: ["Em", "G", "D", "A"], tip: "Everyone knows it!", youtube: "bx1Bh8ZvH84" }
];


// Simple autocorrelation pitch detection
function autoCorrelate(buffer, sampleRate) {
  // Check if there's enough signal
  let rms = 0;
  for (let i = 0; i < buffer.length; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / buffer.length);
  
  // Return -1 if too quiet (lowered threshold!)
  if (rms < 0.001) return { freq: -1, rms };

  // Autocorrelation
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let foundGoodCorrelation = false;

  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }
    correlation = 1 - correlation / MAX_SAMPLES;
    
    if (correlation > 0.9 && correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
      foundGoodCorrelation = true;
    } else if (foundGoodCorrelation) {
      break;
    }
  }

  if (bestCorrelation > 0.01 && bestOffset > 0) {
    const frequency = sampleRate / bestOffset;
    if (frequency >= 60 && frequency <= 500) {
      return { freq: frequency, rms };
    }
  }
  
  return { freq: -1, rms };
}

function getNoteName(frequency) {
  if (frequency <= 0) return { note: '--', octave: 0 };
  const noteNum = 12 * Math.log2(frequency / 440) + 69;
  const roundedNote = Math.round(noteNum);
  const octave = Math.floor((roundedNote - 12) / 12);
  const noteName = NOTE_NAMES[((roundedNote % 12) + 12) % 12];
  return { note: noteName, octave };
}

function getCents(frequency, targetFreq) {
  return Math.round(1200 * Math.log2(frequency / targetFreq));
}

function findClosestString(frequency) {
  let closest = null;
  let minCents = Infinity;
  
  for (const string of TUNING) {
    const cents = Math.abs(1200 * Math.log2(frequency / string.freq));
    if (cents < minCents && cents < 100) {
      minCents = cents;
      closest = string;
    }
  }
  return closest;
}

// Reference tone player
const playReferenceTone = (frequency) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 2);
};


// Chord Diagram Component
const ChordDiagram = ({ chordKey }) => {
  const chord = CHORDS[chordKey];
  if (!chord) return null;

  return (
    <svg width="120" height="150" viewBox="0 0 120 150">
      <text x="60" y="15" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{chordKey}</text>
      <rect x="20" y="25" width="80" height="4" fill="white" rx="1"/>
      {[1,2,3,4].map(f => (
        <line key={f} x1="20" y1={25 + f*25} x2="100" y2={25 + f*25} stroke="#555" strokeWidth="2"/>
      ))}
      {[0,1,2,3,4,5].map(s => (
        <line key={s} x1={20 + s*16} y1="25" x2={20 + s*16} y2="125" stroke="#888" strokeWidth="1"/>
      ))}
      {chord.open?.map(s => (
        <circle key={`o${s}`} cx={20 + (6-s)*16} cy="18" r="5" fill="none" stroke="#0f0" strokeWidth="2"/>
      ))}
      {chord.muted?.map(s => (
        <text key={`m${s}`} x={20 + (6-s)*16} y="20" textAnchor="middle" fill="#f66" fontSize="12">✕</text>
      ))}
      {chord.fingers.map(([str, fret, finger], i) => (
        <g key={i}>
          <circle cx={20 + (6-str)*16} cy={25 + (fret-0.5)*25} r="9" fill="#0af"/>
          <text x={20 + (6-str)*16} y={25 + (fret-0.5)*25 + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{finger}</text>
        </g>
      ))}
      {['E','A','D','G','B','E'].map((n, i) => (
        <text key={i} x={20 + i*16} y="140" textAnchor="middle" fill="#666" fontSize="9">{n}</text>
      ))}
    </svg>
  );
};


// Main Guitar Tuner Component
const GuitarTuner = () => {
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState('--');
  const [octave, setOctave] = useState(0);
  const [freq, setFreq] = useState(0);
  const [cents, setCents] = useState(0);
  const [matchedString, setMatchedString] = useState(null);
  const [status, setStatus] = useState('waiting');
  const [error, setError] = useState(null);
  const [volume, setVolume] = useState(0);
  const [micActive, setMicActive] = useState(false);
  
  const audioCtx = useRef(null);
  const analyser = useRef(null);
  const stream = useRef(null);
  const animFrame = useRef(null);

  const start = async () => {
    setError(null);
    try {
      console.log("Requesting microphone...");
      stream.current = await navigator.mediaDevices.getUserMedia({ 
        audio: true
      });
      console.log("Microphone granted!");
      
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      analyser.current = audioCtx.current.createAnalyser();
      analyser.current.fftSize = 2048;
      
      const source = audioCtx.current.createMediaStreamSource(stream.current);
      source.connect(analyser.current);
      
      setListening(true);
      setMicActive(true);
      analyze();
    } catch (err) {
      console.error('Mic error:', err);
      setError('Could not access microphone: ' + err.message);
    }
  };

  const stop = () => {
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    if (stream.current) stream.current.getTracks().forEach(t => t.stop());
    if (audioCtx.current && audioCtx.current.state !== 'closed') audioCtx.current.close();
    setListening(false);
    setMicActive(false);
    setNote('--');
    setFreq(0);
    setCents(0);
    setVolume(0);
    setMatchedString(null);
    setStatus('waiting');
  };

  const analyze = () => {
    if (!analyser.current || !audioCtx.current) return;
    
    const buffer = new Float32Array(analyser.current.fftSize);
    analyser.current.getFloatTimeDomainData(buffer);
    
    const result = autoCorrelate(buffer, audioCtx.current.sampleRate);
    
    // Always update volume so user can see mic is working
    const volumeLevel = Math.min(100, Math.round(result.rms * 500));
    setVolume(volumeLevel);
    
    if (result.freq > 0) {
      setFreq(Math.round(result.freq * 10) / 10);
      
      const noteInfo = getNoteName(result.freq);
      setNote(noteInfo.note);
      setOctave(noteInfo.octave);
      
      const closest = findClosestString(result.freq);
      if (closest) {
        setMatchedString(closest);
        const c = getCents(result.freq, closest.freq);
        setCents(c);
        
        if (Math.abs(c) <= 5) setStatus('perfect');
        else if (Math.abs(c) <= 15) setStatus('close');
        else if (c > 0) setStatus('sharp');
        else setStatus('flat');
      } else {
        setMatchedString(null);
        setStatus('waiting');
      }
    }
    
    animFrame.current = requestAnimationFrame(analyze);
  };

  useEffect(() => {
    return () => stop();
  }, []);

  const getColor = () => {
    if (status === 'perfect') return '#00ff88';
    if (status === 'close') return '#ffaa00';
    if (status === 'sharp' || status === 'flat') return '#ff6b6b';
    return '#666';
  };

  const getMessage = () => {
    if (status === 'perfect') return '✓ IN TUNE!';
    if (status === 'close') return '≈ Almost there...';
    if (status === 'sharp') return '↓ Too HIGH - loosen';
    if (status === 'flat') return '↑ Too LOW - tighten';
    return '🎸 Play a string...';
  };


  return (
    <div style={styles.tunerBox}>
      <h3 style={styles.tunerTitle}>🎤 Guitar Tuner</h3>
      
      {error && <div style={styles.error}>{error}</div>}
      
      {/* String buttons with reference tones */}
      <div style={styles.stringRow}>
        {TUNING.map((s) => (
          <div key={s.note} style={{
            ...styles.stringBtn,
            background: matchedString?.note === s.note ? getColor() : '#2a2a3a',
            color: matchedString?.note === s.note ? '#000' : '#fff'
          }}>
            <div style={styles.stringNote}>{s.name}{s.note.slice(-1)}</div>
            <div style={styles.stringHz}>{s.freq}Hz</div>
            <button 
              onClick={() => playReferenceTone(s.freq)}
              style={styles.playBtn}
              title="Play reference tone"
            >🔊</button>
          </div>
        ))}
      </div>

      {/* Main display */}
      <div style={styles.display}>
        {listening ? (
          <>
            {/* VOLUME METER - shows if mic is working */}
            <div style={styles.volumeSection}>
              <div style={styles.volumeLabel}>
                {micActive ? '🎤 MIC ACTIVE' : '🎤 MIC OFF'} 
                {volume > 0 && ' - Sound detected!'}
              </div>
              <div style={styles.volumeBarBg}>
                <div style={{
                  ...styles.volumeBar,
                  width: `${volume}%`,
                  background: volume > 50 ? '#00ff88' : volume > 20 ? '#ffaa00' : '#666'
                }}/>
              </div>
              <div style={styles.volumeText}>Volume: {volume}%</div>
            </div>
            
            <div style={{...styles.bigNote, color: getColor()}}>{note}{octave > 0 ? octave : ''}</div>
            <div style={styles.freqText}>{freq > 0 ? `${freq} Hz` : 'Waiting for sound...'}</div>
            
            {matchedString && (
              <div style={styles.targetText}>
                Target: {matchedString.name}{matchedString.note.slice(-1)} ({matchedString.freq}Hz)
              </div>
            )}
            
            {/* Cents meter */}
            {freq > 0 && (
              <div style={styles.meterWrap}>
                <div style={styles.meterLabels}>
                  <span>♭ -50</span><span>0</span><span>+50 ♯</span>
                </div>
                <div style={styles.meter}>
                  <div style={styles.meterCenter}/>
                  <div style={{
                    ...styles.needle,
                    left: `${50 + Math.max(-50, Math.min(50, cents))}%`,
                    background: getColor()
                  }}/>
                </div>
                <div style={styles.centsText}>{cents > 0 ? '+' : ''}{cents} cents</div>
              </div>
            )}
            
            <div style={{...styles.statusMsg, color: getColor()}}>{getMessage()}</div>
          </>
        ) : (
          <div style={styles.instructions}>
            <p style={{fontSize: '18px'}}>🎸 Click START to tune your guitar</p>
            <p style={{color: '#888', marginTop: '10px'}}>Make sure to allow microphone access!</p>
            <p style={{color: '#666', marginTop: '10px', fontSize: '14px'}}>
              💡 Click 🔊 on any string to hear the reference tone
            </p>
          </div>
        )}
      </div>

      <button onClick={listening ? stop : start} style={{
        ...styles.tunerBtn,
        background: listening ? '#ff6b6b' : '#00ff88'
      }}>
        {listening ? '⏹ STOP' : '🎤 START TUNER'}
      </button>
    </div>
  );
};


// Main Component
const GuitarLearning = () => {
  const [tab, setTab] = useState('tuner');

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🎸 Guitar Learning Center</h1>
        <p style={styles.subtitle}>Dust off those cobwebs and let's rock!</p>
      </div>

      <div style={styles.tabs}>
        {[
          { id: 'tuner', icon: '🎤', label: 'Tuner' },
          { id: 'chords', icon: '🎵', label: 'Chords' },
          { id: 'songs', icon: '🎶', label: 'Songs' },
          { id: 'lessons', icon: '📚', label: 'Lessons' }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            ...styles.tabBtn,
            background: tab === t.id ? 'var(--primary)' : 'var(--surface)',
            border: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent'
          }}>
            <span style={{fontSize: '20px'}}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {tab === 'tuner' && <GuitarTuner />}

        {tab === 'chords' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Essential Beginner Chords</h3>
            <p style={styles.sectionSub}>Master these 8 chords to play thousands of songs!</p>
            <div style={styles.chordGrid}>
              {Object.keys(CHORDS).map(key => (
                <div key={key} style={styles.chordCard}>
                  <ChordDiagram chordKey={key} />
                  <div style={styles.chordName}>{CHORDS[key].name}</div>
                  <div style={styles.chordDiff}>{'⭐'.repeat(CHORDS[key].difficulty)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'songs' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Easy Songs to Learn</h3>
            {[1, 2, 3].map(level => (
              <div key={level} style={styles.levelSection}>
                <h4 style={styles.levelTitle}>
                  <span style={{
                    ...styles.levelBadge,
                    background: level === 1 ? '#00ff88' : level === 2 ? '#ffaa00' : '#ff6b6b'
                  }}>Level {level}</span>
                  {level === 1 ? '2-Chord Songs' : level === 2 ? '3-Chord Songs' : '4-Chord Songs'}
                </h4>
                <div style={styles.songGrid}>
                  {SONGS.filter(s => s.level === level).map((song, i) => (
                    <div key={i} style={styles.songCard}>
                      <div style={styles.songTitle}>{song.title}</div>
                      <div style={styles.songArtist}>{song.artist}</div>
                      <div style={styles.songChords}>
                        {song.chords.map(c => <span key={c} style={styles.chordBadge}>{c}</span>)}
                      </div>
                      <div style={styles.songTip}>💡 {song.tip}</div>
                      {song.youtube && (
                        <a href={`https://www.youtube.com/watch?v=${song.youtube}`} target="_blank" rel="noopener noreferrer" style={styles.ytLink}>
                          ▶️ Tutorial
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'lessons' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>4-Week Learning Path</h3>
            <div style={styles.lessonGrid}>
              {[
                { week: 1, title: 'Getting Started', tasks: ['Hold guitar correctly', 'Tune with tuner', 'Learn G and Em', 'Switch between them'], song: 'Horse With No Name' },
                { week: 2, title: 'More Chords', tasks: ['Learn C and D', 'G → C → D transitions', 'Down strumming'], song: 'Love Me Do' },
                { week: 3, title: 'Minor Chords', tasks: ['Learn Am and Dm', 'Major vs minor sound', 'All 6 chords'], song: 'Stand By Me' },
                { week: 4, title: 'All Together', tasks: ['Learn A and E', '8 chords mastered!', 'Strumming patterns'], song: 'Any song!' }
              ].map(w => (
                <div key={w.week} style={styles.lessonCard}>
                  <div style={styles.weekBadge}>Week {w.week}</div>
                  <h4 style={{marginTop: '15px'}}>{w.title}</h4>
                  <ul style={styles.taskList}>
                    {w.tasks.map((t, i) => <li key={i}>✓ {t}</li>)}
                  </ul>
                  <div style={styles.songGoal}>🎵 Goal: {w.song}</div>
                </div>
              ))}
            </div>
            <div style={styles.tips}>
              <h4>🎯 Pro Tips</h4>
              <div style={styles.tipGrid}>
                <div style={styles.tipCard}><span style={styles.tipIcon}>👆</span><strong>Use fingertips</strong><br/>Not the flat part</div>
                <div style={styles.tipCard}><span style={styles.tipIcon}>🎸</span><strong>Behind the fret</strong><br/>Not on top of it</div>
                <div style={styles.tipCard}><span style={styles.tipIcon}>🐢</span><strong>Start SLOW</strong><br/>Speed comes later</div>
                <div style={styles.tipCard}><span style={styles.tipIcon}>📅</span><strong>15 min daily</strong><br/>Better than 2hr weekly</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


const styles = {
  page: { minHeight: '100vh', padding: '20px', background: 'var(--background)' },
  header: { textAlign: 'center', marginBottom: '25px' },
  title: { fontSize: '2em', marginBottom: '5px' },
  subtitle: { color: 'var(--text-secondary)' },
  
  tabs: { display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '25px', flexWrap: 'wrap' },
  tabBtn: { padding: '12px 20px', borderRadius: '10px', border: '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 'bold' },
  
  content: { maxWidth: '1000px', margin: '0 auto' },
  section: { background: 'var(--surface)', borderRadius: '16px', padding: '25px' },
  sectionTitle: { textAlign: 'center', fontSize: '1.4em', marginBottom: '5px' },
  sectionSub: { textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '20px' },

  // Tuner styles
  tunerBox: { background: 'var(--surface)', borderRadius: '16px', padding: '25px', textAlign: 'center' },
  tunerTitle: { marginBottom: '20px', fontSize: '1.3em' },
  error: { background: '#ff6b6b33', color: '#ff6b6b', padding: '10px', borderRadius: '8px', marginBottom: '15px' },
  stringRow: { display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' },
  stringBtn: { padding: '10px 8px', borderRadius: '8px', minWidth: '60px', transition: 'all 0.2s' },
  stringNote: { fontWeight: 'bold', fontSize: '14px' },
  stringHz: { fontSize: '10px', opacity: 0.7, marginBottom: '5px' },
  playBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' },
  display: { background: '#1a1a2a', borderRadius: '12px', padding: '25px', marginBottom: '20px', minHeight: '280px' },
  
  // Volume meter styles
  volumeSection: { marginBottom: '20px', padding: '10px', background: '#0003', borderRadius: '8px' },
  volumeLabel: { fontSize: '12px', color: '#0f0', marginBottom: '5px', fontWeight: 'bold' },
  volumeBarBg: { height: '10px', background: '#333', borderRadius: '5px', overflow: 'hidden' },
  volumeBar: { height: '100%', transition: 'width 0.1s, background 0.3s', borderRadius: '5px' },
  volumeText: { fontSize: '11px', color: '#888', marginTop: '3px' },
  
  bigNote: { fontSize: '3.5em', fontWeight: 'bold' },
  freqText: { color: '#888', marginBottom: '5px' },
  targetText: { color: '#0af', fontSize: '14px', marginBottom: '15px' },
  meterWrap: { maxWidth: '300px', margin: '0 auto 15px' },
  meterLabels: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginBottom: '3px' },
  meter: { height: '20px', background: '#333', borderRadius: '10px', position: 'relative', overflow: 'hidden' },
  meterCenter: { position: 'absolute', left: '50%', top: 0, width: '2px', height: '100%', background: '#00ff88', transform: 'translateX(-50%)', zIndex: 2 },
  needle: { position: 'absolute', width: '6px', height: '100%', borderRadius: '3px', transition: 'left 0.1s', transform: 'translateX(-50%)', zIndex: 3 },
  centsText: { fontSize: '12px', color: '#888', marginTop: '5px' },
  statusMsg: { fontSize: '1.2em', fontWeight: 'bold', marginTop: '10px' },
  instructions: { padding: '30px' },
  tunerBtn: { padding: '15px 35px', fontSize: '1.1em', fontWeight: 'bold', border: 'none', borderRadius: '25px', cursor: 'pointer', color: '#000' },

  // Chord styles
  chordGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' },
  chordCard: { background: '#1a1a2a', borderRadius: '12px', padding: '10px', textAlign: 'center' },
  chordName: { fontSize: '12px', marginTop: '5px' },
  chordDiff: { fontSize: '11px', color: '#ffaa00' },

  // Songs styles
  levelSection: { marginBottom: '25px' },
  levelTitle: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  levelBadge: { padding: '4px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', color: '#000' },
  songGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' },
  songCard: { background: '#1a1a2a', borderRadius: '10px', padding: '15px' },
  songTitle: { fontWeight: 'bold', marginBottom: '3px' },
  songArtist: { color: '#888', fontSize: '13px', marginBottom: '8px' },
  songChords: { display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' },
  chordBadge: { background: 'var(--primary)', padding: '3px 8px', borderRadius: '5px', fontSize: '12px', fontWeight: 'bold' },
  songTip: { fontSize: '12px', color: '#aaa', marginBottom: '8px' },
  ytLink: { color: '#ff6b6b', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' },

  // Lessons styles
  lessonGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' },
  lessonCard: { background: '#1a1a2a', borderRadius: '12px', padding: '15px', position: 'relative' },
  weekBadge: { position: 'absolute', top: '-8px', left: '15px', background: 'var(--primary)', padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' },
  taskList: { listStyle: 'none', padding: 0, margin: '10px 0', fontSize: '13px', lineHeight: '1.8' },
  songGoal: { background: 'rgba(0,255,136,0.1)', padding: '8px', borderRadius: '6px', fontSize: '12px', marginTop: '10px' },
  tips: { marginTop: '25px' },
  tipGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '12px' },
  tipCard: { background: '#1a1a2a', borderRadius: '10px', padding: '15px', textAlign: 'center', fontSize: '13px', lineHeight: '1.4' },
  tipIcon: { fontSize: '1.8em', display: 'block', marginBottom: '8px' }
};

export default GuitarLearning;
