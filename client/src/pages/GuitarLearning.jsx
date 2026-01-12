import React, { useState, useEffect, useRef } from 'react';

// Standard tuning frequencies
const TUNING = [
  { note: 'E2', freq: 82.41, string: 6, name: 'E', label: '6th string (thickest)', color: '#ff6b6b' },
  { note: 'A2', freq: 110.00, string: 5, name: 'A', label: '5th string', color: '#ffaa00' },
  { note: 'D3', freq: 146.83, string: 4, name: 'D', label: '4th string', color: '#ffff00' },
  { note: 'G3', freq: 196.00, string: 3, name: 'G', label: '3rd string', color: '#00ff88' },
  { note: 'B3', freq: 246.94, string: 2, name: 'B', label: '2nd string', color: '#00aaff' },
  { note: 'E4', freq: 329.63, string: 1, name: 'E', label: '1st string (thinnest)', color: '#aa66ff' }
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

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
  { level: 1, title: "Horse With No Name", artist: "America", chords: ["Em", "D"], youtube: "zSAJ0l4OBHM" },
  { level: 1, title: "Eleanor Rigby", artist: "Beatles", chords: ["Em", "C"], youtube: "HuS5NuXRb5Y" },
  { level: 2, title: "Three Little Birds", artist: "Bob Marley", chords: ["A", "D", "E"], youtube: "zaGUr6wzyT8" },
  { level: 2, title: "Love Me Do", artist: "Beatles", chords: ["G", "C", "D"], youtube: "0pGOFX1D_jg" },
  { level: 3, title: "Stand By Me", artist: "Ben E. King", chords: ["G", "Em", "C", "D"], youtube: "hwZNL7QVJjE" },
  { level: 3, title: "Wonderwall", artist: "Oasis", chords: ["Em", "G", "D", "A"], youtube: "bx1Bh8ZvH84" }
];


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

// Calculate cents difference from target
const getCents = (frequency, targetFreq) => {
  return Math.round(1200 * Math.log2(frequency / targetFreq));
};

// Beginner Tuning Guide Component
const TuningGuide = () => (
  <div style={styles.guideBox}>
    <h4 style={{marginBottom: '15px', textAlign: 'center'}}>🎸 How to Tune Your Guitar</h4>
    
    <div style={styles.guitarDiagram}>
      {/* Guitar headstock diagram */}
      <svg viewBox="0 0 200 280" style={{width: '100%', maxWidth: '200px'}}>
        {/* Headstock */}
        <rect x="60" y="0" width="80" height="180" fill="#8B4513" rx="10"/>
        <rect x="70" y="180" width="60" height="100" fill="#8B4513"/>
        
        {/* Tuning pegs - left side */}
        <circle cx="45" cy="30" r="12" fill="#gold" stroke="#333" strokeWidth="2"/>
        <circle cx="45" cy="80" r="12" fill="#gold" stroke="#333" strokeWidth="2"/>
        <circle cx="45" cy="130" r="12" fill="#gold" stroke="#333" strokeWidth="2"/>
        
        {/* Tuning pegs - right side */}
        <circle cx="155" cy="30" r="12" fill="#gold" stroke="#333" strokeWidth="2"/>
        <circle cx="155" cy="80" r="12" fill="#gold" stroke="#333" strokeWidth="2"/>
        <circle cx="155" cy="130" r="12" fill="#gold" stroke="#333" strokeWidth="2"/>
        
        {/* Strings with colors */}
        <line x1="75" y1="30" x2="75" y2="280" stroke="#ff6b6b" strokeWidth="4"/>
        <line x1="85" y1="80" x2="85" y2="280" stroke="#ffaa00" strokeWidth="3.5"/>
        <line x1="95" y1="130" x2="95" y2="280" stroke="#ffff00" strokeWidth="3"/>
        <line x1="105" y1="130" x2="105" y2="280" stroke="#00ff88" strokeWidth="2.5"/>
        <line x1="115" y1="80" x2="115" y2="280" stroke="#00aaff" strokeWidth="2"/>
        <line x1="125" y1="30" x2="125" y2="280" stroke="#aa66ff" strokeWidth="1.5"/>
        
        {/* Labels */}
        <text x="45" y="35" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">E</text>
        <text x="45" y="85" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">A</text>
        <text x="45" y="135" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">D</text>
        <text x="155" y="35" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">e</text>
        <text x="155" y="85" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">B</text>
        <text x="155" y="135" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">G</text>
      </svg>
    </div>
    
    <div style={styles.guideSteps}>
      <div style={styles.step}>
        <span style={styles.stepNum}>1</span>
        <span>Pick a string below (start with thickest E)</span>
      </div>
      <div style={styles.step}>
        <span style={styles.stepNum}>2</span>
        <span>Click 🔊 to hear what it SHOULD sound like</span>
      </div>
      <div style={styles.step}>
        <span style={styles.stepNum}>3</span>
        <span>Play that string on your guitar</span>
      </div>
      <div style={styles.step}>
        <span style={styles.stepNum}>4</span>
        <span>Turn the tuning peg until the needle is GREEN</span>
      </div>
    </div>
    
    <div style={styles.tipBox}>
      <strong>💡 Tips:</strong><br/>
      • Too LOW (flat)? Tighten the peg (turn away from you)<br/>
      • Too HIGH (sharp)? Loosen the peg (turn toward you)<br/>
      • Go SLOWLY - small turns make big changes!
    </div>
  </div>
);


// Main Guitar Tuner Component - String Selection Mode
const GuitarTuner = () => {
  const [selectedString, setSelectedString] = useState(null);
  const [listening, setListening] = useState(false);
  const [cents, setCents] = useState(0);
  const [volume, setVolume] = useState(0);
  const [status, setStatus] = useState('select'); // select, listening, tuning
  const [error, setError] = useState(null);
  const [showGuide, setShowGuide] = useState(true);
  
  const audioCtx = useRef(null);
  const analyser = useRef(null);
  const stream = useRef(null);
  const animFrame = useRef(null);

  const selectString = (stringData) => {
    setSelectedString(stringData);
    setStatus('listening');
    setCents(0);
  };

  const start = async () => {
    if (!selectedString) {
      setError('Please select a string first!');
      return;
    }
    setError(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      analyser.current = audioCtx.current.createAnalyser();
      analyser.current.fftSize = 2048;
      
      const source = audioCtx.current.createMediaStreamSource(stream.current);
      source.connect(analyser.current);
      
      setListening(true);
      setStatus('tuning');
      analyze();
    } catch (err) {
      setError('Mic error: ' + err.message);
    }
  };

  const stop = () => {
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    if (stream.current) stream.current.getTracks().forEach(t => t.stop());
    if (audioCtx.current && audioCtx.current.state !== 'closed') audioCtx.current.close();
    setListening(false);
    setStatus(selectedString ? 'listening' : 'select');
    setCents(0);
    setVolume(0);
  };

  const reset = () => {
    stop();
    setSelectedString(null);
    setStatus('select');
  };

  const analyze = () => {
    if (!analyser.current || !audioCtx.current || !selectedString) return;
    
    const buffer = new Uint8Array(analyser.current.fftSize);
    analyser.current.getByteTimeDomainData(buffer);
    
    // Calculate volume
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += Math.abs(buffer[i] - 128);
    }
    const avgVolume = sum / buffer.length;
    const volumePercent = Math.min(100, Math.round(avgVolume * 3));
    setVolume(volumePercent);
    
    // Only try to detect pitch if there's enough volume
    if (volumePercent > 5) {
      // Simple zero-crossing frequency detection
      let crossings = 0;
      for (let i = 1; i < buffer.length; i++) {
        if ((buffer[i-1] < 128 && buffer[i] >= 128)) {
          crossings++;
        }
      }
      
      const duration = buffer.length / audioCtx.current.sampleRate;
      const detectedFreq = crossings / duration;
      
      // Check if detected frequency is close to our target
      const targetFreq = selectedString.freq;
      const minFreq = targetFreq * 0.7;
      const maxFreq = targetFreq * 1.4;
      
      if (detectedFreq >= minFreq && detectedFreq <= maxFreq) {
        const c = getCents(detectedFreq, targetFreq);
        setCents(c);
      }
    }
    
    animFrame.current = requestAnimationFrame(analyze);
  };

  useEffect(() => () => stop(), []);

  const getColor = () => {
    if (Math.abs(cents) <= 5) return '#00ff88';
    if (Math.abs(cents) <= 15) return '#ffaa00';
    return '#ff6b6b';
  };

  const getMessage = () => {
    if (Math.abs(cents) <= 5) return '✓ PERFECT!';
    if (Math.abs(cents) <= 15) return '≈ Almost...';
    if (cents > 0) return '↓ Too HIGH - loosen peg';
    return '↑ Too LOW - tighten peg';
  };


  return (
    <div style={styles.tunerBox}>
      <div style={styles.tunerHeader}>
        <h3 style={styles.tunerTitle}>🎸 Guitar Tuner</h3>
        <button onClick={() => setShowGuide(!showGuide)} style={styles.helpBtn}>
          {showGuide ? '📖 Hide Guide' : '📖 Show Guide'}
        </button>
      </div>
      
      {error && <div style={styles.error}>{error}</div>}
      
      {showGuide && <TuningGuide />}
      
      {/* String Selection */}
      <div style={styles.stringSelectSection}>
        <h4 style={{marginBottom: '10px', textAlign: 'center'}}>
          {selectedString ? `Tuning: ${selectedString.label}` : '👇 Select a string to tune'}
        </h4>
        
        <div style={styles.stringRow}>
          {TUNING.map((s) => (
            <div 
              key={s.note} 
              onClick={() => selectString(s)}
              style={{
                ...styles.stringBtn,
                background: selectedString?.note === s.note ? s.color : '#2a2a3a',
                color: selectedString?.note === s.note ? '#000' : '#fff',
                border: selectedString?.note === s.note ? '3px solid white' : '3px solid transparent',
                cursor: 'pointer'
              }}
            >
              <div style={styles.stringNum}>String {s.string}</div>
              <div style={styles.stringNote}>{s.name}</div>
              <div style={styles.stringHz}>{s.freq} Hz</div>
              <button 
                onClick={(e) => { e.stopPropagation(); playReferenceTone(s.freq); }}
                style={styles.playBtn}
              >🔊 Hear it</button>
            </div>
          ))}
        </div>
      </div>

      {/* Tuning Display - only show when string is selected */}
      {selectedString && (
        <div style={styles.tuningDisplay}>
          <div style={{...styles.selectedStringBig, background: selectedString.color}}>
            {selectedString.name} String
          </div>
          
          {listening && (
            <>
              {/* Volume meter */}
              <div style={styles.volumeSection}>
                <div style={styles.volumeLabel}>🎤 {volume > 5 ? 'Sound detected!' : 'Play the string...'}</div>
                <div style={styles.volumeBarBg}>
                  <div style={{
                    ...styles.volumeBar, 
                    width: `${volume}%`, 
                    background: volume > 30 ? '#00ff88' : volume > 10 ? '#ffaa00' : '#666'
                  }}/>
                </div>
              </div>
              
              {/* Tuning meter */}
              <div style={styles.meterSection}>
                <div style={styles.meterLabels}>
                  <span>♭ TOO LOW</span>
                  <span>PERFECT</span>
                  <span>TOO HIGH ♯</span>
                </div>
                <div style={styles.bigMeter}>
                  <div style={styles.meterZone}/>
                  <div style={styles.meterCenterLine}/>
                  <div style={{
                    ...styles.meterNeedle,
                    left: `${50 + Math.max(-45, Math.min(45, cents))}%`,
                    background: getColor(),
                    boxShadow: `0 0 20px ${getColor()}`
                  }}/>
                </div>
                <div style={{...styles.statusMsg, color: getColor()}}>
                  {volume > 5 ? getMessage() : 'Play the string...'}
                </div>
                {volume > 5 && <div style={styles.centsDisplay}>{cents > 0 ? '+' : ''}{cents} cents</div>}
              </div>
            </>
          )}
          
          {!listening && (
            <div style={styles.readyMsg}>
              <p>Ready to tune {selectedString.name} string!</p>
              <p style={{fontSize: '14px', color: '#888'}}>Click START and play the string</p>
            </div>
          )}
          
          <div style={styles.buttonRow}>
            <button onClick={listening ? stop : start} style={{
              ...styles.tunerBtn,
              background: listening ? '#ff6b6b' : '#00ff88'
            }}>
              {listening ? '⏹ STOP' : '🎤 START'}
            </button>
            <button onClick={reset} style={styles.resetBtn}>
              🔄 Different String
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


const ChordDiagram = ({ chordKey }) => {
  const chord = CHORDS[chordKey];
  if (!chord) return null;
  return (
    <svg width="120" height="150" viewBox="0 0 120 150">
      <text x="60" y="15" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{chordKey}</text>
      <rect x="20" y="25" width="80" height="4" fill="white" rx="1"/>
      {[1,2,3,4].map(f => <line key={f} x1="20" y1={25 + f*25} x2="100" y2={25 + f*25} stroke="#555" strokeWidth="2"/>)}
      {[0,1,2,3,4,5].map(s => <line key={s} x1={20 + s*16} y1="25" x2={20 + s*16} y2="125" stroke="#888" strokeWidth="1"/>)}
      {chord.open?.map(s => <circle key={`o${s}`} cx={20 + (6-s)*16} cy="18" r="5" fill="none" stroke="#0f0" strokeWidth="2"/>)}
      {chord.muted?.map(s => <text key={`m${s}`} x={20 + (6-s)*16} y="20" textAnchor="middle" fill="#f66" fontSize="12">✕</text>)}
      {chord.fingers.map(([str, fret, finger], i) => (
        <g key={i}>
          <circle cx={20 + (6-str)*16} cy={25 + (fret-0.5)*25} r="9" fill="#0af"/>
          <text x={20 + (6-str)*16} y={25 + (fret-0.5)*25 + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{finger}</text>
        </g>
      ))}
      {['E','A','D','G','B','E'].map((n, i) => <text key={i} x={20 + i*16} y="140" textAnchor="middle" fill="#666" fontSize="9">{n}</text>)}
    </svg>
  );
};

const GuitarLearning = () => {
  const [tab, setTab] = useState('tuner');
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🎸 Guitar Learning Center</h1>
      </div>
      <div style={styles.tabs}>
        {[{id:'tuner',icon:'🎤',label:'Tuner'},{id:'chords',icon:'🎵',label:'Chords'},{id:'songs',icon:'🎶',label:'Songs'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            ...styles.tabBtn, 
            background: tab === t.id ? 'var(--primary)' : 'var(--surface)'
          }}>
            <span style={{fontSize:'20px'}}>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>
      <div style={styles.content}>
        {tab === 'tuner' && <GuitarTuner />}
        {tab === 'chords' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Beginner Chords</h3>
            <div style={styles.chordGrid}>
              {Object.keys(CHORDS).map(key => (
                <div key={key} style={styles.chordCard}>
                  <ChordDiagram chordKey={key} />
                  <div style={styles.chordName}>{CHORDS[key].name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'songs' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Easy Songs</h3>
            <div style={styles.songGrid}>
              {SONGS.map((song, i) => (
                <div key={i} style={styles.songCard}>
                  <div style={styles.songTitle}>{song.title}</div>
                  <div style={styles.songArtist}>{song.artist}</div>
                  <div style={styles.songChords}>{song.chords.map(c => <span key={c} style={styles.chordBadge}>{c}</span>)}</div>
                  <a href={`https://youtube.com/watch?v=${song.youtube}`} target="_blank" rel="noopener noreferrer" style={styles.ytLink}>▶️ Tutorial</a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


const styles = {
  page: { minHeight: '100vh', padding: '20px', background: 'var(--background)' },
  header: { textAlign: 'center', marginBottom: '20px' },
  title: { fontSize: '1.8em', marginBottom: '5px' },
  tabs: { display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' },
  tabBtn: { padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 'bold', border: 'none' },
  content: { maxWidth: '900px', margin: '0 auto' },
  section: { background: 'var(--surface)', borderRadius: '16px', padding: '25px' },
  sectionTitle: { textAlign: 'center', fontSize: '1.4em', marginBottom: '20px' },
  
  // Tuner
  tunerBox: { background: 'var(--surface)', borderRadius: '16px', padding: '20px' },
  tunerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  tunerTitle: { fontSize: '1.3em', margin: 0 },
  helpBtn: { background: '#333', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: 'white', fontSize: '13px' },
  error: { background: '#ff6b6b33', color: '#ff6b6b', padding: '10px', borderRadius: '8px', marginBottom: '15px' },
  
  // Guide
  guideBox: { background: '#1a1a2a', borderRadius: '12px', padding: '20px', marginBottom: '20px' },
  guitarDiagram: { display: 'flex', justifyContent: 'center', marginBottom: '15px' },
  guideSteps: { marginBottom: '15px' },
  step: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', fontSize: '14px' },
  stepNum: { width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' },
  tipBox: { background: '#0003', padding: '12px', borderRadius: '8px', fontSize: '13px', lineHeight: '1.6' },
  
  // String selection
  stringSelectSection: { marginBottom: '20px' },
  stringRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '10px' },
  stringBtn: { padding: '12px 8px', borderRadius: '10px', textAlign: 'center', transition: 'all 0.2s' },
  stringNum: { fontSize: '10px', opacity: 0.8, marginBottom: '2px' },
  stringNote: { fontWeight: 'bold', fontSize: '20px' },
  stringHz: { fontSize: '11px', opacity: 0.7, marginBottom: '8px' },
  playBtn: { background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: 'white' },
  
  // Tuning display
  tuningDisplay: { background: '#1a1a2a', borderRadius: '12px', padding: '20px', textAlign: 'center' },
  selectedStringBig: { display: 'inline-block', padding: '10px 30px', borderRadius: '10px', fontSize: '24px', fontWeight: 'bold', color: '#000', marginBottom: '20px' },
  volumeSection: { marginBottom: '20px' },
  volumeLabel: { fontSize: '14px', marginBottom: '8px', color: '#0f0' },
  volumeBarBg: { height: '15px', background: '#333', borderRadius: '8px', overflow: 'hidden' },
  volumeBar: { height: '100%', transition: 'width 0.1s', borderRadius: '8px' },
  
  // Meter
  meterSection: { marginBottom: '20px' },
  meterLabels: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888', marginBottom: '5px' },
  bigMeter: { height: '50px', background: '#222', borderRadius: '25px', position: 'relative', overflow: 'hidden' },
  meterZone: { position: 'absolute', left: '40%', width: '20%', height: '100%', background: 'rgba(0,255,136,0.2)' },
  meterCenterLine: { position: 'absolute', left: '50%', top: '0', width: '3px', height: '100%', background: '#00ff88', transform: 'translateX(-50%)' },
  meterNeedle: { position: 'absolute', top: '5px', width: '8px', height: '40px', borderRadius: '4px', transition: 'left 0.15s', transform: 'translateX(-50%)' },
  statusMsg: { fontSize: '1.5em', fontWeight: 'bold', margin: '15px 0 5px' },
  centsDisplay: { fontSize: '14px', color: '#888' },
  readyMsg: { padding: '30px', fontSize: '18px' },
  
  // Buttons
  buttonRow: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' },
  tunerBtn: { padding: '15px 30px', fontSize: '1.1em', fontWeight: 'bold', border: 'none', borderRadius: '25px', cursor: 'pointer', color: '#000' },
  resetBtn: { padding: '15px 20px', fontSize: '1em', background: '#444', border: 'none', borderRadius: '25px', cursor: 'pointer', color: 'white' },
  
  // Chords & Songs
  chordGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '15px' },
  chordCard: { background: '#1a1a2a', borderRadius: '12px', padding: '10px', textAlign: 'center' },
  chordName: { fontSize: '12px', marginTop: '5px' },
  songGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' },
  songCard: { background: '#1a1a2a', borderRadius: '10px', padding: '15px' },
  songTitle: { fontWeight: 'bold', marginBottom: '3px' },
  songArtist: { color: '#888', fontSize: '13px', marginBottom: '8px' },
  songChords: { display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' },
  chordBadge: { background: 'var(--primary)', padding: '3px 8px', borderRadius: '5px', fontSize: '12px', fontWeight: 'bold' },
  ytLink: { color: '#ff6b6b', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' },
};

export default GuitarLearning;
