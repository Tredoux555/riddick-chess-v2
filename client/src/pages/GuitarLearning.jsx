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
  'G': { name: 'G Major', fingers: [[6,3,2], [5,2,1], [1,3,3]], open: [4,3,2], muted: [], 
         notes: [196, 246.94, 293.66, 392, 493.88, 587.33] }, // G B D G B D
  'C': { name: 'C Major', fingers: [[5,3,3], [4,2,2], [2,1,1]], open: [3,1], muted: [6],
         notes: [130.81, 164.81, 196, 261.63, 329.63] }, // C E G C E
  'D': { name: 'D Major', fingers: [[3,2,1], [1,2,2], [2,3,3]], open: [4], muted: [6,5],
         notes: [146.83, 220, 293.66, 369.99] }, // D A D F#
  'Em': { name: 'E Minor', fingers: [[5,2,2], [4,2,3]], open: [6,3,2,1], muted: [],
          notes: [82.41, 123.47, 164.81, 196, 246.94, 329.63] }, // E B E G B E
  'Am': { name: 'A Minor', fingers: [[4,2,2], [3,2,3], [2,1,1]], open: [5,1], muted: [6],
          notes: [110, 164.81, 220, 261.63, 329.63] }, // A E A C E
  'E': { name: 'E Major', fingers: [[5,2,2], [4,2,3], [3,1,1]], open: [6,2,1], muted: [],
         notes: [82.41, 123.47, 164.81, 196, 246.94, 329.63] }, // E B E G# B E
  'A': { name: 'A Major', fingers: [[4,2,1], [3,2,2], [2,2,3]], open: [5,1], muted: [6],
         notes: [110, 164.81, 220, 277.18, 329.63] }, // A E A C# E
  'Dm': { name: 'D Minor', fingers: [[1,1,1], [3,2,3], [2,3,2]], open: [4], muted: [6,5],
          notes: [146.83, 220, 293.66, 349.23] } // D A D F
};

// 🎵 EXPANDED SONG LIBRARY - 8 songs!
const LESSONS = [
  {
    id: 1,
    title: "A Horse With No Name",
    artist: "America",
    youtube: "zSAJ0l4OBHM",
    difficulty: "Beginner",
    chords: ["Em", "D"],
    description: "Perfect first song - only 2 easy chords!",
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

// 🔊 SOUND EFFECTS
const playSoundEffect = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    if (type === 'correct') {
      // Happy ascending arpeggio
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.3);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.1);
        o.stop(ctx.currentTime + i * 0.1 + 0.3);
      });
    } else if (type === 'almost') {
      // Gentle encouraging tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {
    console.error('Sound effect error:', e);
  }
};


// 🎸 IMPROVED CHORD DETECTOR WITH WIGGLE ROOM
const ChordDetector = ({ targetChord, onDetected, isListening }) => {
  const [detectedNotes, setDetectedNotes] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [volume, setVolume] = useState(0);
  const [stringStatus, setStringStatus] = useState({});
  
  const audioCtx = useRef(null);
  const analyser = useRef(null);
  const stream = useRef(null);
  const animFrame = useRef(null);
  const hasDetected = useRef(false);

  const start = async () => {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      analyser.current = audioCtx.current.createAnalyser();
      analyser.current.fftSize = 8192;
      audioCtx.current.createMediaStreamSource(stream.current).connect(analyser.current);
      hasDetected.current = false;
      analyze();
    } catch (e) {
      console.error('Mic error:', e);
    }
  };

  const stop = () => {
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    if (stream.current) stream.current.getTracks().forEach(t => t.stop());
    if (audioCtx.current) audioCtx.current.close();
    setDetectedNotes([]);
    setVolume(0);
    setConfidence(0);
    setStringStatus({});
    hasDetected.current = false;
  };

  const analyze = () => {
    if (!analyser.current) return;
    
    const freqData = new Uint8Array(analyser.current.frequencyBinCount);
    analyser.current.getByteFrequencyData(freqData);
    
    // Calculate volume
    let sum = 0;
    for (let i = 0; i < freqData.length; i++) sum += freqData[i];
    const vol = Math.min(100, (sum / freqData.length) * 2);
    setVolume(vol);
    
    if (vol > 15) {
      // Find peaks
      const peaks = [];
      const sampleRate = audioCtx.current.sampleRate;
      const binSize = sampleRate / analyser.current.fftSize;
      
      for (let i = 5; i < freqData.length / 2; i++) {
        if (freqData[i] > 100 && freqData[i] > freqData[i-1] && freqData[i] > freqData[i+1]) {
          peaks.push({ freq: i * binSize, strength: freqData[i] });
        }
      }
      
      peaks.sort((a, b) => b.strength - a.strength);
      const topPeaks = peaks.slice(0, 6).map(p => p.freq);
      setDetectedNotes(topPeaks);
      
      // Compare with target (WIGGLE ROOM: 8% tolerance)
      if (targetChord && CHORDS[targetChord]) {
        const targetNotes = CHORDS[targetChord].notes;
        let matches = 0;
        const matchedStrings = {};
        
        for (let peak of topPeaks) {
          for (let i = 0; i < targetNotes.length; i++) {
            const note = targetNotes[i];
            if (Math.abs(peak - note) < note * 0.08) {
              matches++;
              matchedStrings[i] = true;
              break;
            }
          }
        }
        
        setStringStatus(matchedStrings);
        
        // WIGGLE ROOM: Need 60% match, trigger at 65%
        const requiredNotes = Math.max(2, Math.ceil(targetNotes.length * 0.6));
        const conf = Math.min(100, (matches / requiredNotes) * 100);
        setConfidence(conf);
        
        if (conf >= 65 && !hasDetected.current) {
          hasDetected.current = true;
          playSoundEffect('correct');
          setTimeout(() => {
            if (onDetected) onDetected();
          }, 300);
        } else if (conf >= 40 && conf < 65 && Math.random() < 0.05) {
          playSoundEffect('almost');
        }
      }
    }
    
    animFrame.current = requestAnimationFrame(analyze);
  };

  useEffect(() => {
    if (isListening) start();
    else stop();
    return () => stop();
  }, [isListening, targetChord]);

  return (
    <div style={styles.detector}>
      <div style={styles.volBar}>
        <div style={{...styles.volFill, width: `${volume}%`, background: volume > 15 ? '#0f8' : '#666'}}/>
      </div>
      <small style={{color: volume > 15 ? '#0f8' : '#666'}}>
        {volume > 15 ? '🎤 Listening...' : '🎤 Strum your guitar'}
      </small>
      
      {targetChord && (
        <div style={{marginTop: '15px'}}>
          <div style={styles.confidenceBar}>
            <div style={{
              ...styles.confidenceFill, 
              width: `${confidence}%`,
              background: confidence >= 65 ? '#0f8' : confidence > 40 ? '#fa0' : '#f66'
            }}/>
          </div>
          <div style={{fontSize: '28px', fontWeight: 'bold', color: confidence >= 65 ? '#0f8' : confidence > 40 ? '#fa0' : '#fff', marginTop: '10px'}}>
            {confidence >= 65 ? '✅ Perfect! Great job!' : 
             confidence > 40 ? '👍 Almost there! Keep going!' : 
             '🎸 Try again - you got this!'}
          </div>
          <small style={{color: '#888'}}>{Math.round(confidence)}% match</small>
          
          {/* Visual string feedback */}
          <div style={{marginTop: '15px', display: 'flex', gap: '5px', justifyContent: 'center'}}>
            {CHORDS[targetChord].notes.map((note, i) => (
              <div key={i} style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: stringStatus[i] ? '#0f8' : '#333',
                border: '2px solid ' + (stringStatus[i] ? '#0f8' : '#666'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                color: stringStatus[i] ? '#000' : '#666',
                transition: '0.2s'
              }}>
                {stringStatus[i] ? '✓' : (6-i)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


// 🎥 INTERACTIVE LESSON COMPONENT  
const InteractiveLesson = ({ lesson, onExit }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waitingForChord, setWaitingForChord] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState('practice');
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const initRef = useRef(false);
  
  const currentEvent = lesson.timeline[currentStep];
  const nextEvent = lesson.timeline[currentStep + 1];

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    // Load YouTube API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
      
      window.onYouTubeIframeAPIReady = () => {
        createPlayer();
      };
    } else {
      createPlayer();
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }
    };
  }, []);

  const createPlayer = () => {
    try {
      playerRef.current = new window.YT.Player('youtube-player', {
        videoId: lesson.youtube,
        playerVars: { controls: 1, modestbranding: 1 },
        events: {
          onReady: () => {
            intervalRef.current = setInterval(() => {
              try {
                if (playerRef.current && playerRef.current.getCurrentTime) {
                  const time = playerRef.current.getCurrentTime();
                  
                  if (mode === 'practice' && nextEvent && time >= nextEvent.time && !waitingForChord) {
                    playerRef.current.pauseVideo();
                    setIsPlaying(false);
                    setWaitingForChord(true);
                    setIsListening(true);
                  }
                }
              } catch (e) {}
            }, 100);
          }
        }
      });
    } catch (e) {
      console.error('Player error:', e);
    }
  };

  const handleChordDetected = () => {
    setWaitingForChord(false);
    setIsListening(false);
    setCurrentStep(currentStep + 1);
    
    setTimeout(() => {
      try {
        if (playerRef.current) {
          playerRef.current.playVideo();
          setIsPlaying(true);
        }
      } catch (e) {}
    }, 800);
  };

  const togglePlay = () => {
    try {
      if (!playerRef.current) return;
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
      setIsPlaying(!isPlaying);
    } catch (e) {}
  };

  const skip = () => {
    setWaitingForChord(false);
    setIsListening(false);
    setCurrentStep(currentStep + 1);
    try {
      if (playerRef.current) {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch (e) {}
  };

  return (
    <div style={styles.lesson}>
      <div style={styles.lessonHeader}>
        <button onClick={onExit} style={styles.backBtn}>← Back</button>
        <div>
          <h2>{lesson.title}</h2>
          <small style={{color: '#888'}}>{lesson.artist} • {lesson.difficulty}</small>
        </div>
        <div style={{marginLeft: 'auto', display: 'flex', gap: '10px'}}>
          <button 
            onClick={() => setMode('practice')} 
            style={{...styles.modeBtn, background: mode === 'practice' ? '#0af' : '#333'}}
          >
            🎯 Practice
          </button>
          <button 
            onClick={() => setMode('playalong')} 
            style={{...styles.modeBtn, background: mode === 'playalong' ? '#0af' : '#333'}}
          >
            🎸 Play Along
          </button>
        </div>
      </div>

      <div style={styles.videoContainer}>
        <div id="youtube-player"></div>
        {waitingForChord && mode === 'practice' && currentEvent.chord && (
          <div style={styles.overlay}>
            <div style={styles.overlayContent}>
              <h1 style={{fontSize: '48px', marginBottom: '10px'}}>⏸️</h1>
              <h2>Play: {currentEvent.chord}</h2>
              <p style={{color: '#888'}}>{currentEvent.text}</p>
              
              <div style={{margin: '20px 0'}}>
                <ChordDiagram chord={CHORDS[currentEvent.chord]} name={currentEvent.chord}/>
              </div>
              
              <ChordDetector 
                targetChord={currentEvent.chord} 
                onDetected={handleChordDetected}
                isListening={isListening}
              />
              
              <button onClick={skip} style={{...styles.btn, background: '#555', marginTop: '20px'}}>
                Skip for now ⏭️
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={styles.controls}>
        <button onClick={togglePlay} style={{...styles.btn, background: isPlaying ? '#f66' : '#0f8'}}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>

      <div style={styles.timeline}>
        <h3>Lesson Progress</h3>
        <div style={styles.progressBar}>
          <div style={{...styles.progressFill, width: `${(currentStep / lesson.timeline.length) * 100}%`}}/>
        </div>
        <div style={styles.timelineSteps}>
          {lesson.timeline.map((event, i) => (
            <div key={i} style={{
              ...styles.timelineStep,
              background: i < currentStep ? '#0f8' : i === currentStep ? '#0af' : '#333'
            }}>
              <div style={{fontWeight: 'bold'}}>{event.chord || '🎵'}</div>
              <small>{event.time}s</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// MAIN TUNER COMPONENT
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
  const [tab, setTab] = useState('lessons');
  const [activeLesson, setActiveLesson] = useState(null);
  
  if (activeLesson) {
    return <InteractiveLesson lesson={activeLesson} onExit={() => setActiveLesson(null)}/>;
  }
  
  return (
    <div style={styles.page}>
      <h1 style={{textAlign: 'center', marginBottom: '20px'}}>🎸 Guitar Learning</h1>
      <div style={styles.tabs}>
        {['lessons', 'tuner', 'chords'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{...styles.tab, background: tab === t ? '#0af' : '#333'}}>
            {t === 'lessons' ? '🎥 Lessons' : t === 'tuner' ? '🎤 Tuner' : '🎵 Chords'}
          </button>
        ))}
      </div>
      
      {tab === 'lessons' && (
        <div style={styles.section}>
          <h3>Interactive Video Lessons</h3>
          <p style={{color: '#888', marginBottom: '20px'}}>
            🎸 Learn by doing! Videos pause when it's time to play a chord. We'll listen and only continue when you nail it!<br/>
            Choose <strong>Practice Mode</strong> (pause & wait) or <strong>Play Along Mode</strong> (keep playing!)
          </p>
          <div style={styles.lessonGrid}>
            {LESSONS.map(lesson => (
              <div key={lesson.id} style={styles.lessonCard} onClick={() => setActiveLesson(lesson)}>
                <div style={styles.thumbnail}>
                  <img src={`https://img.youtube.com/vi/${lesson.youtube}/mqdefault.jpg`} alt={lesson.title} style={{width: '100%', borderRadius: '8px'}}/>
                  <div style={styles.playOverlay}>▶</div>
                </div>
                <div style={{padding: '10px'}}>
                  <strong>{lesson.title}</strong>
                  <div style={{color: '#888', fontSize: '12px'}}>{lesson.artist}</div>
                  <div style={{color: '#aaa', fontSize: '11px', marginTop: '3px'}}>{lesson.description}</div>
                  <div style={{marginTop: '5px'}}>
                    {lesson.chords.map(c => <span key={c} style={styles.chordTag}>{c}</span>)}
                  </div>
                  <div style={{...styles.difficultyBadge, background: lesson.difficulty === 'Beginner' ? '#0f8' : lesson.difficulty === 'Easy' ? '#4af' : '#fa0'}}>
                    {lesson.difficulty}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {tab === 'tuner' && <GuitarTuner />}
      
      {tab === 'chords' && (
        <div style={styles.section}>
          <h3>Essential Chords</h3>
          <div style={styles.chordGrid}>
            {Object.entries(CHORDS).map(([k, v]) => (
              <div key={k} style={styles.chordCard}>
                <ChordDiagram chord={v} name={k}/>
                <small style={{color: '#888', display: 'block', marginTop: '5px'}}>{v.name}</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


const styles = {
  page: { minHeight: '100vh', padding: '20px', background: 'var(--background)', maxWidth: '1200px', margin: '0 auto' },
  tabs: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' },
  tab: { padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#fff' },
  section: { background: 'var(--surface)', borderRadius: '12px', padding: '20px' },
  
  lessonGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  lessonCard: { background: '#1a1a2a', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: '0.2s' },
  thumbnail: { position: 'relative' },
  playOverlay: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '48px', color: '#fff', background: '#0008', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  difficultyBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', marginTop: '8px', color: '#000' },
  
  lesson: { background: 'var(--surface)', borderRadius: '12px', padding: '20px', maxWidth: '900px', margin: '0 auto' },
  lessonHeader: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' },
  backBtn: { padding: '10px 20px', background: '#333', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 'bold' },
  modeBtn: { padding: '8px 15px', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' },
  videoContainer: { position: 'relative', background: '#000', borderRadius: '12px', overflow: 'hidden', aspectRatio: '16/9' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#000e', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  overlayContent: { textAlign: 'center', padding: '20px', background: '#1a1a2a', borderRadius: '12px', maxWidth: '400px' },
  controls: { display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' },
  timeline: { marginTop: '30px' },
  progressBar: { height: '10px', background: '#333', borderRadius: '5px', overflow: 'hidden', marginBottom: '15px' },
  progressFill: { height: '100%', background: '#0af', transition: '0.3s' },
  timelineSteps: { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' },
  timelineStep: { minWidth: '80px', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '12px' },
  
  detector: { background: '#222', borderRadius: '10px', padding: '15px', marginTop: '15px' },
  confidenceBar: { height: '30px', background: '#333', borderRadius: '15px', overflow: 'hidden', marginBottom: '10px' },
  confidenceFill: { height: '100%', transition: '0.3s' },
  
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
  needle: { position: 'absolute', top: '5px', width: '8px', height: '30px', borderRadius: '4px', transform: 'translateX(-50%)', transition: 'left 0.4s ease-out, background 0.3s, box-shadow 0.3s' },
  btn: { padding: '12px 25px', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', color: '#000', fontSize: '16px' },
  
  chordGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '15px' },
  chordCard: { background: '#1a1a2a', borderRadius: '8px', padding: '10px', textAlign: 'center' },
  chordTag: { display: 'inline-block', background: '#0af', color: '#000', padding: '2px 8px', borderRadius: '4px', margin: '5px 3px 5px 0', fontSize: '12px', fontWeight: 'bold' }
};

export default GuitarLearning;