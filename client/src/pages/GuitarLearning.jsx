import React, { useState, useEffect, useRef } from 'react';

const TUNING = [
  { note: 'E2', freq: 82.41, string: 6, name: 'E', label: '6th (thickest)', color: '#ff6b6b' },
  { note: 'A2', freq: 110.00, string: 5, name: 'A', label: '5th', color: '#ffaa00' },
  { note: 'D3', freq: 146.83, string: 4, name: 'D', label: '4th', color: '#ffff00' },
  { note: 'G3', freq: 196.00, string: 3, name: 'G', label: '3rd', color: '#00ff88' },
  { note: 'B3', freq: 246.94, string: 2, name: 'B', label: '2nd', color: '#00aaff' },
  { note: 'E4', freq: 329.63, string: 1, name: 'E', label: '1st (thinnest)', color: '#aa66ff' }
];

const CHORDS = {
  'G': { name: 'G Major', fingers: [[6,3,2], [5,2,1], [1,3,3]], open: [4,3,2], muted: [] },
  'C': { name: 'C Major', fingers: [[5,3,3], [4,2,2], [2,1,1]], open: [3,1], muted: [6] },
  'D': { name: 'D Major', fingers: [[3,2,1], [1,2,2], [2,3,3]], open: [4], muted: [6,5] },
  'Em': { name: 'E Minor', fingers: [[5,2,2], [4,2,3]], open: [6,3,2,1], muted: [] },
  'Am': { name: 'A Minor', fingers: [[4,2,2], [3,2,3], [2,1,1]], open: [5,1], muted: [6] }
};

const SONGS = [
  { level: 1, title: "Horse With No Name", artist: "America", chords: ["Em", "D"], youtube: "zSAJ0l4OBHM" },
  { level: 2, title: "Love Me Do", artist: "Beatles", chords: ["G", "C", "D"], youtube: "0pGOFX1D_jg" },
  { level: 3, title: "Stand By Me", artist: "Ben E. King", chords: ["G", "Em", "C", "D"], youtube: "hwZNL7QVJjE" }
];

const playTone = (freq) => {
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
};


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
    animFrame.current && cancelAnimationFrame(animFrame.current);
    stream.current?.getTracks().forEach(t => t.stop());
    audioCtx.current?.close();
    setListening(false);
    setCents(0);
    setVolume(0);
  };

  const analyze = () => {
    if (!analyser.current) return;
    const buf = new Uint8Array(analyser.current.fftSize);
    analyser.current.getByteTimeDomainData(buf);
    
    // Volume
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += Math.abs(buf[i] - 128);
    const vol = Math.min(100, (sum / buf.length) * 4);
    setVolume(vol);
    
    if (vol > 10 && selected) {
      // Autocorrelation pitch detection
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
        
        // Only accept if in reasonable range
        if (freq > target * 0.5 && freq < target * 2) {
          let c = 1200 * Math.log2(freq / target);
          if (c > 600) c -= 1200;
          if (c < -600) c += 1200;
          
          // Buffer readings
          readings.current.push(c);
          if (readings.current.length > 15) readings.current.shift();
          
          // Median filter (removes outliers)
          const sorted = [...readings.current].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          
          // VERY heavy smoothing: 92% old, 8% new
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
    <div style={styles.tuner}>
      <h3>🎸 Guitar Tuner</h3>
      {error && <div style={styles.error}>{error}</div>}
      
      <div style={styles.strings}>
        {TUNING.map(s => (
          <div key={s.note} onClick={() => !listening && setSelected(s)} style={{
            ...styles.stringBtn,
            background: selected?.note === s.note ? s.color : '#2a2a3a',
            color: selected?.note === s.note ? '#000' : '#fff',
            opacity: listening && selected?.note !== s.note ? 0.4 : 1,
            cursor: listening ? 'default' : 'pointer'
          }}>
            <small>String {s.string}</small>
            <div style={{fontSize: '22px', fontWeight: 'bold'}}>{s.name}</div>
            <small>{s.freq}Hz</small>
            <button onClick={e => { e.stopPropagation(); playTone(s.freq); }} style={styles.hearBtn}>🔊</button>
          </div>
        ))}
      </div>

      {selected && (
        <div style={styles.tunerDisplay}>
          <div style={{...styles.badge, background: selected.color}}>{selected.name} - {selected.label}</div>
          
          {listening ? (
            <>
              <div style={styles.volBar}><div style={{...styles.volFill, width: `${volume}%`}}/></div>
              <small style={{color: volume > 10 ? '#0f0' : '#666'}}>{volume > 10 ? '🎤 Sound detected' : '🎤 Play string...'}</small>
              
              <div style={styles.meterBox}>
                <div style={styles.meterLabels}><span>♭ LOW</span><span>✓</span><span>HIGH ♯</span></div>
                <div style={styles.meter}>
                  <div style={styles.greenZone}/>
                  <div style={styles.centerLine}/>
                  <div style={{
                    ...styles.needle,
                    left: `${50 + Math.max(-45, Math.min(45, cents))}%`,
                    background: getColor(),
                    boxShadow: `0 0 15px ${getColor()}`
                  }}/>
                </div>
              </div>
              
              <div style={{fontSize: '28px', fontWeight: 'bold', color: getColor(), marginTop: '10px'}}>
                {Math.abs(cents) <= 5 ? '✅ IN TUNE!' : Math.abs(cents) <= 15 ? '👍 Almost!' : cents > 0 ? '⬇️ Too HIGH' : '⬆️ Too LOW'}
              </div>
              <div style={{color: '#888'}}>{cents > 0 ? '+' : ''}{cents} cents</div>
            </>
          ) : (
            <p style={{color: '#888', margin: '30px 0'}}>Click START and play the {selected.name} string</p>
          )}
          
          <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
            <button onClick={listening ? stop : start} style={{...styles.btn, background: listening ? '#f66' : '#0f8'}}>
              {listening ? '⏹ STOP' : '▶ START'}
            </button>
            <button onClick={() => { stop(); setSelected(null); }} style={{...styles.btn, background: '#555'}}>↩ Reset</button>
          </div>
        </div>
      )}
      
      {!selected && <p style={{color: '#888', textAlign: 'center', marginTop: '20px'}}>👆 Select a string to tune</p>}
    </div>
  );
};


const ChordDiagram = ({ chord, name }) => (
  <svg width="100" height="120" viewBox="0 0 100 120">
    <text x="50" y="12" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{name}</text>
    <rect x="15" y="20" width="70" height="3" fill="white"/>
    {[1,2,3,4].map(f => <line key={f} x1="15" y1={20+f*20} x2="85" y2={20+f*20} stroke="#555" strokeWidth="1.5"/>)}
    {[0,1,2,3,4,5].map(s => <line key={s} x1={15+s*14} y1="20" x2={15+s*14} y2="100" stroke="#777" strokeWidth="1"/>)}
    {chord.muted?.map(s => <text key={s} x={15+(6-s)*14} y="16" textAnchor="middle" fill="#f55" fontSize="10">✕</text>)}
    {chord.open?.map(s => <circle key={s} cx={15+(6-s)*14} cy="15" r="4" fill="none" stroke="#0f0" strokeWidth="1.5"/>)}
    {chord.fingers.map(([str,fret,fin], i) => (
      <g key={i}>
        <circle cx={15+(6-str)*14} cy={20+(fret-0.5)*20} r="7" fill="#0af"/>
        <text x={15+(6-str)*14} y={20+(fret-0.5)*20+4} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">{fin}</text>
      </g>
    ))}
  </svg>
);

const GuitarLearning = () => {
  const [tab, setTab] = useState('tuner');
  return (
    <div style={styles.page}>
      <h1 style={{textAlign: 'center', marginBottom: '20px'}}>🎸 Guitar Learning</h1>
      <div style={styles.tabs}>
        {['tuner', 'chords', 'songs'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{...styles.tab, background: tab === t ? '#0af' : '#333'}}>
            {t === 'tuner' ? '🎤 Tuner' : t === 'chords' ? '🎵 Chords' : '🎶 Songs'}
          </button>
        ))}
      </div>
      
      {tab === 'tuner' && <GuitarTuner />}
      
      {tab === 'chords' && (
        <div style={styles.section}>
          <h3>Essential Chords</h3>
          <div style={styles.chordGrid}>
            {Object.entries(CHORDS).map(([k, v]) => (
              <div key={k} style={styles.chordCard}><ChordDiagram chord={v} name={k}/></div>
            ))}
          </div>
        </div>
      )}
      
      {tab === 'songs' && (
        <div style={styles.section}>
          <h3>Easy Songs</h3>
          {SONGS.map((s, i) => (
            <div key={i} style={styles.songCard}>
              <strong>{s.title}</strong> - {s.artist}
              <div>{s.chords.map(c => <span key={c} style={styles.chordTag}>{c}</span>)}</div>
              <a href={`https://youtube.com/watch?v=${s.youtube}`} target="_blank" rel="noreferrer" style={{color: '#f66'}}>▶ Tutorial</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


const styles = {
  page: { minHeight: '100vh', padding: '20px', background: 'var(--background)', maxWidth: '900px', margin: '0 auto' },
  tabs: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' },
  tab: { padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#fff' },
  section: { background: 'var(--surface)', borderRadius: '12px', padding: '20px' },
  
  tuner: { background: 'var(--surface)', borderRadius: '12px', padding: '20px', textAlign: 'center' },
  error: { background: '#f662', color: '#f66', padding: '10px', borderRadius: '8px', marginBottom: '10px' },
  strings: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '20px' },
  stringBtn: { padding: '10px 5px', borderRadius: '8px', textAlign: 'center', transition: '0.2s' },
  hearBtn: { marginTop: '5px', background: '#0003', border: 'none', borderRadius: '5px', padding: '4px 8px', cursor: 'pointer' },
  
  tunerDisplay: { background: '#1a1a2a', borderRadius: '10px', padding: '20px' },
  badge: { display: 'inline-block', padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold', color: '#000', marginBottom: '15px' },
  volBar: { height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden', marginBottom: '5px' },
  volFill: { height: '100%', background: '#0f8', transition: 'width 0.1s' },
  
  meterBox: { margin: '20px 0' },
  meterLabels: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '5px' },
  meter: { height: '40px', background: '#222', borderRadius: '20px', position: 'relative', overflow: 'hidden' },
  greenZone: { position: 'absolute', left: '40%', width: '20%', height: '100%', background: '#0f83' },
  centerLine: { position: 'absolute', left: '50%', width: '2px', height: '100%', background: '#0f8', transform: 'translateX(-50%)' },
  needle: { 
    position: 'absolute', 
    top: '5px', 
    width: '8px', 
    height: '30px', 
    borderRadius: '4px', 
    transform: 'translateX(-50%)',
    transition: 'left 0.4s ease-out, background 0.3s, box-shadow 0.3s'  // SLOW transition!
  },
  
  btn: { padding: '12px 25px', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', color: '#000', fontSize: '16px' },
  
  chordGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' },
  chordCard: { background: '#1a1a2a', borderRadius: '8px', padding: '5px', textAlign: 'center' },
  
  songCard: { background: '#1a1a2a', borderRadius: '8px', padding: '15px', marginBottom: '10px' },
  chordTag: { display: 'inline-block', background: '#0af', color: '#000', padding: '2px 8px', borderRadius: '4px', margin: '5px 3px 5px 0', fontSize: '12px', fontWeight: 'bold' }
};

export default GuitarLearning;
