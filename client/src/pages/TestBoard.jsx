import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUndo, FaTrash, FaSyncAlt, FaChessBoard, FaUpload, FaTimes, FaVideo, FaArrowLeft, FaStop, FaDownload, FaCircle } from 'react-icons/fa';

const STARTING_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const EMPTY_POSITION = '8/8/8/8/8/8/8/8';

const PIECES = {
  white: ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP'],
  black: ['bK', 'bQ', 'bR', 'bB', 'bN', 'bP']
};

const PIP_POSITIONS = {
  'top-right': { top: 20, right: 20 },
  'top-left': { top: 20, left: 20 },
  'bottom-right': { bottom: 20, right: 20 },
  'bottom-left': { bottom: 20, left: 20 }
};

const PIP_SIZES = {
  small: 150,
  medium: 200,
  large: 280
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
  const navigate = useNavigate();
  const [position, setPosition] = useState(STARTING_POSITION);
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [history, setHistory] = useState([STARTING_POSITION]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [pipPosition, setPipPosition] = useState('top-right');
  const [pipSize, setPipSize] = useState('medium');
  
  const [recordingMode, setRecordingMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const [arrows, setArrows] = useState([]);
  const [arrowStart, setArrowStart] = useState(null);
  
  const facecamVideoRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const boardContainerRef = useRef(null);

  // Canvas recording - captures board + video overlay
  const startRecording = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const boardContainer = boardContainerRef.current;
    
    if (!boardContainer) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 800;
    
    recordedChunksRef.current = [];
    setRecordedVideoUrl(null);

    // Start facecam video
    if (facecamVideoRef.current && videoUrl) {
      facecamVideoRef.current.currentTime = 0;
      facecamVideoRef.current.play();
    }

    // Draw function - captures everything each frame
    const drawFrame = () => {
      // Draw background
      ctx.fillStyle = '#312e2b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Capture the board using html2canvas approach - draw board element
      const boardElement = boardContainer.querySelector('[data-boardid]') || boardContainer.firstChild;
      if (boardElement) {
        // We'll use drawImage if we can get it, otherwise fill with board representation
        // For now, let's draw a representation
        drawChessboard(ctx, position, boardOrientation, arrows);
      }

      // Draw PIP video
      if (facecamVideoRef.current && videoUrl && !facecamVideoRef.current.paused) {
        const pipW = PIP_SIZES[pipSize];
        const pipH = pipW * (facecamVideoRef.current.videoHeight / facecamVideoRef.current.videoWidth) || pipW * 0.75;
        const pos = PIP_POSITIONS[pipPosition];
        
        let x = pos.right !== undefined ? canvas.width - pipW - pos.right : pos.left;
        let y = pos.bottom !== undefined ? canvas.height - pipH - pos.bottom : pos.top;
        
        // Draw border
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x - 3, y - 3, pipW + 6, pipH + 6);
        
        // Draw video
        ctx.drawImage(facecamVideoRef.current, x, y, pipW, pipH);
      }

      if (isRecording) {
        animationFrameRef.current = requestAnimationFrame(drawFrame);
      }
    };

    // Get stream from canvas
    const stream = canvas.captureStream(30);
    
    // Add audio from facecam video if available
    if (facecamVideoRef.current && videoUrl) {
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(facecamVideoRef.current);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination);
        
        const audioTrack = dest.stream.getAudioTracks()[0];
        if (audioTrack) {
          stream.addTrack(audioTrack);
        }
      } catch (e) {
        console.log('Audio capture not available');
      }
    }

    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      setRecordedVideoUrl(URL.createObjectURL(blob));
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100);
    setIsRecording(true);
    setRecordingTime(0);
    
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    animationFrameRef.current = requestAnimationFrame(drawFrame);
  };

  // Draw chessboard on canvas
  const drawChessboard = (ctx, fen, orientation, arrowsList) => {
    const size = 700;
    const squareSize = size / 8;
    const offsetX = 50;
    const offsetY = 50;
    const files = ['a','b','c','d','e','f','g','h'];
    const ranks = ['8','7','6','5','4','3','2','1'];
    
    if (orientation === 'black') {
      files.reverse();
      ranks.reverse();
    }

    // Draw squares
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        ctx.fillStyle = isLight ? '#ebecd0' : '#779556';
        ctx.fillRect(offsetX + col * squareSize, offsetY + row * squareSize, squareSize, squareSize);
      }
    }

    // Parse FEN and draw pieces
    const fenParts = fen.split('/');
    const pieceImages = {};
    
    // Preload piece images (they should be cached)
    Object.keys(PIECE_IMAGES).forEach(key => {
      const img = new Image();
      img.src = PIECE_IMAGES[key];
      pieceImages[key] = img;
    });

    for (let row = 0; row < 8; row++) {
      let col = 0;
      const fenRow = orientation === 'white' ? fenParts[row] : fenParts[7 - row];
      if (!fenRow) continue;
      
      for (const char of fenRow) {
        if (isNaN(char)) {
          const color = char === char.toUpperCase() ? 'w' : 'b';
          const piece = char.toUpperCase();
          const key = color + piece;
          const img = pieceImages[key];
          
          const drawCol = orientation === 'white' ? col : 7 - col;
          
          if (img && img.complete) {
            ctx.drawImage(img, offsetX + drawCol * squareSize, offsetY + row * squareSize, squareSize, squareSize);
          }
          col++;
        } else {
          col += parseInt(char);
        }
      }
    }

    // Draw arrows
    arrowsList.forEach(([from, to]) => {
      const fromCol = files.indexOf(from[0]);
      const fromRow = ranks.indexOf(from[1]);
      const toCol = files.indexOf(to[0]);
      const toRow = ranks.indexOf(to[1]);
      
      if (fromCol >= 0 && fromRow >= 0 && toCol >= 0 && toRow >= 0) {
        const x1 = offsetX + fromCol * squareSize + squareSize / 2;
        const y1 = offsetY + fromRow * squareSize + squareSize / 2;
        const x2 = offsetX + toCol * squareSize + squareSize / 2;
        const y2 = offsetY + toRow * squareSize + squareSize / 2;
        
        ctx.strokeStyle = 'rgba(255, 170, 0, 0.8)';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // Arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - 20 * Math.cos(angle - Math.PI / 6), y2 - 20 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - 20 * Math.cos(angle + Math.PI / 6), y2 - 20 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 170, 0, 0.8)';
        ctx.fill();
      }
    });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      cancelAnimationFrame(animationFrameRef.current);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      if (facecamVideoRef.current) facecamVideoRef.current.pause();
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

  useEffect(() => {
    const navbar = document.querySelector('.navbar, nav, header');
    const main = document.querySelector('.main-content, main');
    if (recordingMode) {
      if (navbar) navbar.style.display = 'none';
      if (main) main.style.padding = '0';
      document.body.style.overflow = 'hidden';
    } else {
      if (navbar) navbar.style.display = '';
      if (main) main.style.padding = '';
      document.body.style.overflow = '';
    }
    return () => {
      if (navbar) navbar.style.display = '';
      if (main) main.style.padding = '';
      document.body.style.overflow = '';
      clearInterval(timerRef.current);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [recordingMode]);

  if (!isAdmin) { navigate('/'); return null; }

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file?.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
    }
  };

  const removeVideo = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoFile(null);
    setVideoUrl(null);
  };

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
        if (p) {
          if (empty) { fen += empty; empty = 0; }
          fen += p[0] === 'w' ? p[1].toUpperCase() : p[1].toLowerCase();
        } else empty++;
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
    if (selectedPiece) {
      map[sq] = selectedPiece;
    } else if (map[sq]) {
      delete map[sq];
    } else return;
    const newFen = mapToFen(map);
    setPosition(newFen);
    setHistory([...history, newFen]);
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
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#312e2b', display: 'flex', flexDirection: 'column', zIndex: 9999 }}>
        {/* Hidden canvas for recording */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* Hidden facecam video */}
        {videoUrl && <video ref={facecamVideoRef} src={videoUrl} style={{ display: 'none' }} loop playsInline />}

        {/* Top bar */}
        <div style={{ background: 'rgba(0,0,0,0.8)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 15 }}>
          <button onClick={() => { if (isRecording) stopRecording(); setRecordingMode(false); }}
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FaArrowLeft /> Exit
          </button>

          {!isRecording && !recordedVideoUrl && (
            <button onClick={startRecording}
              style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold' }}>
              <FaCircle /> Record
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
                <FaStop /> Stop
              </button>
            </>
          )}

          {recordedVideoUrl && (
            <>
              <span style={{ color: '#22c55e' }}>✓ Done!</span>
              <button onClick={downloadRecording}
                style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold' }}>
                <FaDownload /> Download
              </button>
              <button onClick={() => setRecordedVideoUrl(null)}
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' }}>
                Again
              </button>
            </>
          )}

          <div style={{ marginLeft: 'auto', color: '#666', fontSize: 12 }}>
            <b>1</b>=Reset <b>2-7</b>=Pieces <b>0</b>=Clear arrows
          </div>
        </div>

        {/* Board area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div ref={boardContainerRef} style={{ width: '80vh', maxWidth: 650 }}>
            <Chessboard
              position={position}
              onPieceDrop={onPieceDrop}
              onSquareClick={onSquareClick}
              onSquareRightClick={onSquareRightClick}
              boardOrientation={boardOrientation}
              arePiecesDraggable={true}
              customPieces={customPieces()}
              customDarkSquareStyle={{ backgroundColor: '#779556' }}
              customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
              customArrows={arrows}
              customArrowColor="rgba(255, 170, 0, 0.8)"
            />
          </div>

          {/* Visible PIP (for user to see while recording) */}
          {videoUrl && (
            <div style={{
              position: 'absolute',
              ...Object.fromEntries(Object.entries(PIP_POSITIONS[pipPosition]).map(([k,v]) => [k, v + 'px'])),
              width: PIP_SIZES[pipSize],
              borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              border: '3px solid rgba(255,255,255,0.3)'
            }}>
              <video src={videoUrl} style={{ width: '100%', display: 'block' }} ref={el => { if (el && isRecording && el.paused) el.play(); }} loop muted playsInline />
            </div>
          )}
        </div>

        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </div>
    );
  }

  // SETUP MODE
  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto', color: 'white' }}>
      <h1><FaChessBoard style={{ marginRight: 12 }} />Test Board</h1>
      <p style={{ color: '#888', marginBottom: 20 }}>Setup position, upload facecam, hit Record!</p>

      <input type="file" ref={fileInputRef} accept="video/*" onChange={handleFileSelect} style={{ display: 'none' }} />

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px 20px', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap' }}>
        <button onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 20px', background: '#769656', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaUpload /> {videoFile ? 'Change Video' : 'Upload Facecam'}
        </button>
        {videoFile && (
          <>
            <span style={{ color: '#aaa', fontSize: 14 }}>{videoFile.name}</span>
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
            <button onClick={removeVideo} style={{ ...sel, background: '#ef4444', border: 'none', cursor: 'pointer' }}><FaTimes /></button>
          </>
        )}
        <button onClick={() => setRecordingMode(true)} style={{ marginLeft: 'auto', padding: '12px 24px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold' }}>
          <FaVideo /> Enter Studio
        </button>
      </div>

      <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 300, maxWidth: 500 }}>
          <Chessboard position={position} onPieceDrop={onPieceDrop} onSquareClick={onSquareClick} onSquareRightClick={onSquareRightClick} boardOrientation={boardOrientation} arePiecesDraggable customPieces={customPieces()} customDarkSquareStyle={{ backgroundColor: '#779556' }} customLightSquareStyle={{ backgroundColor: '#ebecd0' }} customArrows={arrows} customArrowColor="rgba(255,170,0,0.8)" />
          <div style={{ display: 'flex', gap: 10, marginTop: 15, flexWrap: 'wrap' }}>
            <button onClick={undo} style={btn} disabled={history.length<=1}><FaUndo /> Undo</button>
            <button onClick={flip} style={btn}><FaSyncAlt /> Flip</button>
            <button onClick={reset} style={{ ...btn, background: '#3b82f6' }}>Reset</button>
            <button onClick={clear} style={{ ...btn, background: '#ef4444' }}><FaTrash /> Clear</button>
            <button onClick={() => setArrows([])} style={btn}>Clear Arrows</button>
          </div>
        </div>

        <div>
          <h3 style={{ marginBottom: 15 }}>Pieces</h3>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 15 }}>Click to select, click square to place.<br/>Right-click two squares = arrow.</p>
          {selectedPiece && (
            <div style={{ marginBottom: 15, padding: 10, background: '#769656', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={PIECE_IMAGES[selectedPiece]} alt="" style={{ width: 32, height: 32 }} />
              <span>Selected</span>
              <button onClick={() => setSelectedPiece(null)} style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', padding: '5px 10px', borderRadius: 4, cursor: 'pointer' }}>✕</button>
            </div>
          )}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ color: '#aaa', marginBottom: 10 }}>White</h4>
            <div style={{ display: 'flex', gap: 8 }}>{PIECES.white.map(p => <PieceBtn key={p} piece={p} />)}</div>
          </div>
          <div>
            <h4 style={{ color: '#aaa', marginBottom: 10 }}>Black</h4>
            <div style={{ display: 'flex', gap: 8 }}>{PIECES.black.map(p => <PieceBtn key={p} piece={p} />)}</div>
          </div>
          <div style={{ marginTop: 25 }}>
            <h4 style={{ color: '#aaa', marginBottom: 10 }}>FEN</h4>
            <input type="text" value={position} onChange={e => { setPosition(e.target.value); setHistory([...history, e.target.value]); }} style={{ width: '100%', padding: 10, background: '#2a2a2a', border: '1px solid #444', borderRadius: 6, color: 'white', fontSize: 12, fontFamily: 'monospace' }} />
          </div>
          <div style={{ marginTop: 25, padding: 15, background: 'rgba(118,150,86,0.2)', borderRadius: 8, border: '1px solid rgba(118,150,86,0.4)' }}>
            <h4 style={{ color: '#769656', marginBottom: 8 }}>⌨️ Hotkeys (in Studio)</h4>
            <p style={{ color: '#aaa', fontSize: 13, lineHeight: 1.6 }}><b>1</b>=Reset <b>2</b>=♙ <b>3</b>=♖ <b>4</b>=♘<br/><b>5</b>=♗ <b>6</b>=♕ <b>7</b>=♔ <b>0</b>=Clear arrows</p>
          </div>
        </div>
      </div>

      {videoUrl && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, width: 200, borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', border: '2px solid #444' }}>
          <video src={videoUrl} style={{ width: '100%', display: 'block' }} muted />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', padding: 8, textAlign: 'center', fontSize: 12 }}>Preview</div>
        </div>
      )}
    </div>
  );
};

const btn = { padding: '10px 16px', background: '#333', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const sel = { padding: '8px 12px', background: '#2a2a2a', color: 'white', border: '1px solid #444', borderRadius: 6, cursor: 'pointer' };

export default TestBoard;
