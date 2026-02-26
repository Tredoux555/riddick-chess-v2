import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { FaUndo, FaTrash, FaSyncAlt, FaChessBoard, FaTimes, FaVideo, FaArrowLeft, FaStop, FaDownload, FaCircle, FaCamera } from 'react-icons/fa';

const STARTING_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const EMPTY_POSITION = '8/8/8/8/8/8/8/8';

const PIECES = {
  white: ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP'],
  black: ['bK', 'bQ', 'bR', 'bB', 'bN', 'bP']
};

const PIP_POSITIONS = {
  'top-right': { top: '20px', right: '20px' },
  'top-left': { top: '20px', left: '20px' },
  'bottom-right': { bottom: '20px', right: '20px' },
  'bottom-left': { bottom: '20px', left: '20px' }
};

const PIP_SIZES = {
  small: { width: '150px' },
  medium: { width: '220px' },
  large: { width: '300px' }
};

const PIECE_IMAGES = {
  wP: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png',
  wN: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png',
  wB: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png',
  wR: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png',
  wQ: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png',
  wK: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png',
  bP: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png',
  bN: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png',
  bB: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png',
  bR: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png',
  bQ: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png',
  bK: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png',
};

const customPieces = () => {
  const pieces = {};
  Object.keys(PIECE_IMAGES).forEach(piece => {
    pieces[piece] = ({ squareWidth }) => (
      <img src={PIECE_IMAGES[piece]} alt={piece} style={{ width: squareWidth, height: squareWidth }} />
    );
  });
  return pieces;
};

const TestBoard = () => {
  const { isAdmin } = useAuth();
  const { theme } = useTheme();
  const successGreen = theme === 'light' ? '#0a6e2e' : '#22c55e';
  const navigate = useNavigate();
  const [position, setPosition] = useState(STARTING_POSITION);
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [history, setHistory] = useState([STARTING_POSITION]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  
  const [pipPosition, setPipPosition] = useState('top-right');
  const [pipSize, setPipSize] = useState('large');
  
  const [recordingMode, setRecordingMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [webcamReady, setWebcamReady] = useState(false);
  
  const [arrows, setArrows] = useState([]);
  const [arrowStart, setArrowStart] = useState(null);
  
  const webcamRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Start webcam when entering recording mode
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 }, 
        audio: true 
      });
      webcamStreamRef.current = stream;
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
      }
      setWebcamReady(true);
    } catch (err) {
      console.error('Webcam error:', err);
      alert('Could not access webcam. Please allow camera access!');
    }
  };

  const stopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null;
    }
    setWebcamReady(false);
  };

  // Start recording using screen capture + webcam audio
  const startRecording = async () => {
    try {
      recordedChunksRef.current = [];
      setRecordedVideoUrl(null);

      // Get screen capture
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser', cursor: 'always' },
        audio: false,
        preferCurrentTab: true
      });

      // Combine screen video with webcam audio
      let finalStream;
      if (webcamStreamRef.current) {
        const audioTrack = webcamStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          finalStream = new MediaStream([
            ...displayStream.getVideoTracks(),
            audioTrack
          ]);
        } else {
          finalStream = displayStream;
        }
      } else {
        finalStream = displayStream;
      }

      const mediaRecorder = new MediaRecorder(finalStream, { mimeType: 'video/webm;codecs=vp9' });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setRecordedVideoUrl(URL.createObjectURL(blob));
        displayStream.getTracks().forEach(track => track.stop());
      };

      displayStream.getVideoTracks()[0].onended = () => stopRecording();

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      console.error('Recording error:', err);
      alert('Select "This Tab" when prompted to record!');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const downloadRecording = () => {
    if (recordedVideoUrl) {
      const a = document.createElement('a');
      a.href = recordedVideoUrl;
      a.download = `chess-lesson-${Date.now()}.webm`;
      a.click();
    }
  };

  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  // Keyboard shortcuts
  const handleKeyPress = useCallback((e) => {
    if (!recordingMode) return;
    const key = e.key;
    if (key === '1') { setPosition(STARTING_POSITION); setArrows([]); }
    else if (key === '2') { setPosition('8/8/8/8/4P3/8/8/8'); setArrows([]); }
    else if (key === '3') { setPosition('8/8/8/8/4R3/8/8/8'); setArrows([]); }
    else if (key === '4') { setPosition('8/8/8/8/4N3/8/8/8'); setArrows([]); }
    else if (key === '5') { setPosition('8/8/8/8/4B3/8/8/8'); setArrows([]); }
    else if (key === '6') { setPosition('8/8/8/8/4Q3/8/8/8'); setArrows([]); }
    else if (key === '7') { setPosition('8/8/8/8/4K3/8/8/8'); setArrows([]); }
    else if (key === '0' || key === 'Escape') { setArrows([]); }
  }, [recordingMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Handle recording mode changes
  useEffect(() => {
    const navbar = document.querySelector('.navbar, nav, header');
    const main = document.querySelector('.main-content, main');
    
    if (recordingMode) {
      if (navbar) navbar.style.display = 'none';
      if (main) main.style.padding = '0';
      document.body.style.overflow = 'hidden';
      startWebcam();
    } else {
      if (navbar) navbar.style.display = '';
      if (main) main.style.padding = '';
      document.body.style.overflow = '';
      stopWebcam();
    }
    
    return () => {
      if (navbar) navbar.style.display = '';
      if (main) main.style.padding = '';
      document.body.style.overflow = '';
      clearInterval(timerRef.current);
      stopWebcam();
    };
  }, [recordingMode]);

  if (!isAdmin) { navigate('/'); return null; }

  const fenToMap = (fen) => {
    const map = {};
    const rows = fen.split('/');
    const files = ['a','b','c','d','e','f','g','h'];
    rows.forEach((row, ri) => {
      let fi = 0;
      for (const c of row) {
        if (isNaN(c)) {
          map[files[fi] + (8 - ri)] = (c === c.toUpperCase() ? 'w' : 'b') + c.toUpperCase();
          fi++;
        } else fi += parseInt(c);
      }
    });
    return map;
  };

  const mapToFen = (map) => {
    const files = ['a','b','c','d','e','f','g','h'];
    let fen = '';
    for (let r = 8; r >= 1; r--) {
      let empty = 0;
      for (const f of files) {
        const p = map[f + r];
        if (p) { if (empty) { fen += empty; empty = 0; } fen += p[0] === 'w' ? p[1] : p[1].toLowerCase(); }
        else empty++;
      }
      if (empty) fen += empty;
      if (r > 1) fen += '/';
    }
    return fen;
  };

  const onPieceDrop = (src, tgt, piece) => {
    const map = fenToMap(position);
    if (src && map[src]) delete map[src];
    map[tgt] = piece;
    const newFen = mapToFen(map);
    setPosition(newFen);
    setHistory([...history, newFen]);
    return true;
  };

  const onSquareClick = (sq) => {
    const map = fenToMap(position);
    if (selectedPiece) map[sq] = selectedPiece;
    else if (map[sq]) delete map[sq];
    else return;
    setPosition(mapToFen(map));
    setHistory([...history, mapToFen(map)]);
  };

  const onSquareRightClick = (sq) => {
    if (arrowStart) {
      if (arrowStart !== sq) setArrows(a => [...a, [arrowStart, sq]]);
      setArrowStart(null);
    } else setArrowStart(sq);
  };

  const undo = () => { if (history.length > 1) { const h = history.slice(0,-1); setHistory(h); setPosition(h[h.length-1]); }};
  const reset = () => { setPosition(STARTING_POSITION); setHistory([STARTING_POSITION]); setArrows([]); };
  const clear = () => { setPosition(EMPTY_POSITION); setHistory([...history, EMPTY_POSITION]); setArrows([]); };
  const flip = () => setBoardOrientation(o => o === 'white' ? 'black' : 'white');

  const PieceBtn = ({ piece }) => (
    <button onClick={() => setSelectedPiece(selectedPiece === piece ? null : piece)}
      style={{ width: 50, height: 50, background: selectedPiece === piece ? '#769656' : 'rgba(255,255,255,0.1)', border: selectedPiece === piece ? '2px solid #fff' : '2px solid transparent', borderRadius: 8, cursor: 'pointer', padding: 4 }}>
      <img src={PIECE_IMAGES[piece]} alt={piece} style={{ width: '100%', height: '100%' }} />
    </button>
  );

  // RECORDING MODE
  if (recordingMode) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#312e2b', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        
        {/* Top controls bar */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.8)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 15, zIndex: 10001 }}>
          <button onClick={() => { if (isRecording) stopRecording(); setRecordingMode(false); }}
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FaArrowLeft /> Exit
          </button>

          {!isRecording && !recordedVideoUrl && (
            <button onClick={startRecording} disabled={!webcamReady}
              style={{ background: webcamReady ? '#ef4444' : '#666', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: webcamReady ? 'pointer' : 'wait', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold' }}>
              <FaCircle /> {webcamReady ? 'Start Recording' : 'Starting camera...'}
            </button>
          )}

          {isRecording && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
                <FaCircle style={{ animation: 'pulse 1s infinite' }} />
                <span style={{ fontFamily: 'monospace', fontSize: 18 }}>{formatTime(recordingTime)}</span>
              </div>
              <button onClick={stopRecording}
                style={{ background: '#fff', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold' }}>
                <FaStop /> Stop Recording
              </button>
            </>
          )}

          {recordedVideoUrl && (
            <>
              <span style={{ color: successGreen }}>✓ Recording complete!</span>
              <button onClick={downloadRecording}
                style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold' }}>
                <FaDownload /> Download Video
              </button>
              <button onClick={() => setRecordedVideoUrl(null)}
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' }}>
                Record Again
              </button>
            </>
          )}

          {/* Position/Size controls */}
          <select value={pipPosition} onChange={e => setPipPosition(e.target.value)} style={sel}>
            <option value="top-right">Top Right</option>
            <option value="top-left">Top Left</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
          </select>
          <select value={pipSize} onChange={e => setPipSize(e.target.value)} style={sel}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>

          <div style={{ marginLeft: 'auto', color: '#b0b0c4', fontSize: 12 }}>
            <b>1</b>=Reset <b>2</b>=♙ <b>3</b>=♖ <b>4</b>=♘ <b>5</b>=♗ <b>6</b>=♕ <b>7</b>=♔ <b>0</b>=Clear arrows
          </div>
        </div>

        {/* Board */}
        <div style={{ width: '85vh', maxWidth: 700, marginTop: 30 }}>
          <Chessboard
            position={position}
            onPieceDrop={onPieceDrop}
            onSquareClick={onSquareClick}
            onSquareRightClick={onSquareRightClick}
            boardOrientation={boardOrientation}
            arePiecesDraggable={true}
            snapToCursor={true}
            customPieces={customPieces()}
            customDarkSquareStyle={{ backgroundColor: '#779556' }}
            customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
            customArrows={arrows}
            customArrowColor="rgba(255, 170, 0, 0.8)"
          />
        </div>

        {/* LIVE WEBCAM */}
        <div style={{
          position: 'fixed', ...PIP_POSITIONS[pipPosition], ...PIP_SIZES[pipSize],
          zIndex: 10000, borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)', border: '3px solid rgba(255,255,255,0.3)',
          background: '#000'
        }}>
          <video 
            ref={webcamRef} 
            autoPlay 
            muted 
            playsInline
            style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }} 
          />
          {!webcamReady && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white' }}>
              <FaCamera style={{ fontSize: 32, opacity: 0.5 }} />
            </div>
          )}
        </div>

        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </div>
    );
  }

  // SETUP MODE
  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto', color: 'white', position: 'relative' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}><FaChessBoard /> Test Board</h1>
      <p style={{ color: '#c0c0d0', marginBottom: 20 }}>Record chess lessons with your webcam! Your face appears live in the corner.</p>

      {/* Controls Bar */}
      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px 20px', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap' }}>
        <span style={{ color: '#d0d0e0' }}>Camera position:</span>
        <select value={pipPosition} onChange={e => setPipPosition(e.target.value)} style={sel}>
          <option value="top-right">Top Right</option>
          <option value="top-left">Top Left</option>
          <option value="bottom-right">Bottom Right</option>
          <option value="bottom-left">Bottom Left</option>
        </select>
        <select value={pipSize} onChange={e => setPipSize(e.target.value)} style={sel}>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>

        <button onClick={() => setRecordingMode(true)}
          style={{ marginLeft: 'auto', padding: '12px 24px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold' }}>
          <FaCamera /> Start Recording Mode
        </button>
      </div>

      <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
        {/* Board */}
        <div style={{ flex: 1, minWidth: 300, maxWidth: 500 }}>
          <Chessboard
            position={position}
            onPieceDrop={onPieceDrop}
            onSquareClick={onSquareClick}
            onSquareRightClick={onSquareRightClick}
            boardOrientation={boardOrientation}
            arePiecesDraggable={true}
            snapToCursor={true}
            customPieces={customPieces()}
            customDarkSquareStyle={{ backgroundColor: '#779556' }}
            customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
            customArrows={arrows}
            customArrowColor="rgba(255, 170, 0, 0.8)"
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 15, flexWrap: 'wrap' }}>
            <button onClick={undo} style={btn} disabled={history.length <= 1}><FaUndo /> Undo</button>
            <button onClick={flip} style={btn}><FaSyncAlt /> Flip</button>
            <button onClick={reset} style={{ ...btn, background: '#3b82f6' }}>Reset</button>
            <button onClick={clear} style={{ ...btn, background: '#ef4444' }}><FaTrash /> Clear</button>
          </div>
        </div>

        {/* Piece Palette */}
        <div>
          <h3 style={{ marginBottom: 15 }}>Pieces</h3>
          <p style={{ color: '#c0c0d0', fontSize: 14, marginBottom: 15 }}>Click to select, then click square to place.<br/>Right-click two squares to draw arrow.</p>
          
          {selectedPiece && (
            <div style={{ marginBottom: 15, padding: 10, background: '#769656', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={PIECE_IMAGES[selectedPiece]} alt="" style={{ width: 32, height: 32 }} />
              <span>Selected</span>
              <button onClick={() => setSelectedPiece(null)} style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', padding: '5px 10px', borderRadius: 4, cursor: 'pointer' }}>✕</button>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ color: '#d0d0e0', marginBottom: 10 }}>White</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{PIECES.white.map(p => <PieceBtn key={p} piece={p} />)}</div>
          </div>
          <div>
            <h4 style={{ color: '#d0d0e0', marginBottom: 10 }}>Black</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{PIECES.black.map(p => <PieceBtn key={p} piece={p} />)}</div>
          </div>

          {/* FEN */}
          <div style={{ marginTop: 25 }}>
            <h4 style={{ color: '#d0d0e0', marginBottom: 10 }}>FEN</h4>
            <input type="text" value={position} onChange={e => { setPosition(e.target.value); setHistory([...history, e.target.value]); }}
              style={{ width: '100%', padding: 10, background: '#2a2a2a', border: '1px solid #444', borderRadius: 6, color: 'white', fontSize: 12, fontFamily: 'monospace' }} />
          </div>

          {/* Hotkeys box */}
          <div style={{ marginTop: 25, padding: 15, background: 'rgba(118,150,86,0.2)', borderRadius: 8, border: '1px solid rgba(118,150,86,0.4)' }}>
            <h4 style={{ color: '#95cc75', marginBottom: 8 }}>⌨️ Recording Hotkeys</h4>
            <p style={{ color: '#d0d0e0', fontSize: 13, lineHeight: 1.6 }}>
              <b>1</b> = Reset board<br/>
              <b>2</b> = Pawn &nbsp; <b>3</b> = Rook &nbsp; <b>4</b> = Knight<br/>
              <b>5</b> = Bishop &nbsp; <b>6</b> = Queen &nbsp; <b>7</b> = King<br/>
              <b>0</b> = Clear arrows
            </p>
          </div>

          {/* Recording tip */}
          <div style={{ marginTop: 20, padding: 15, background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)' }}>
            <h4 style={{ color: '#ef4444', marginBottom: 8 }}>📹 How to Record</h4>
            <p style={{ color: '#d0d0e0', fontSize: 13, lineHeight: 1.6 }}>
              1. Click "Start Recording Mode"<br/>
              2. Allow camera access<br/>
              3. Click "Start Recording" → select "This Tab"<br/>
              4. Talk & move pieces!<br/>
              5. Click "Stop" → "Download"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const btn = { padding: '10px 16px', background: '#333', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const sel = { padding: '8px 12px', background: '#2a2a2a', color: 'white', border: '1px solid #444', borderRadius: 6, cursor: 'pointer' };

export default TestBoard;
