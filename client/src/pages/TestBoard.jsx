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
  'top-right': { top: '20px', right: '20px' },
  'top-left': { top: '20px', left: '20px' },
  'bottom-right': { bottom: '20px', right: '20px' },
  'bottom-left': { bottom: '20px', left: '20px' }
};

const PIP_SIZES = {
  small: { width: '180px' },
  medium: { width: '240px' },
  large: { width: '320px' }
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
  
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingAreaRef = useRef(null);
  const timerRef = useRef(null);

  // Recording functions
  const startRecording = async () => {
    try {
      recordedChunksRef.current = [];
      setRecordedVideoUrl(null);
      
      // Capture the current tab
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          displaySurface: 'browser',
          cursor: 'always'
        },
        audio: true, // Try to capture tab audio
        preferCurrentTab: true
      });

      // If we have a facecam video with audio, try to mix it
      let finalStream = displayStream;
      
      if (videoRef.current && videoUrl) {
        try {
          // Get audio from the uploaded video
          const videoElement = videoRef.current;
          const audioContext = new AudioContext();
          const source = audioContext.createMediaElementSource(videoElement);
          const destination = audioContext.createMediaStreamDestination();
          source.connect(destination);
          source.connect(audioContext.destination); // Also play through speakers
          
          // Combine video track from display + audio from video
          const audioTrack = destination.stream.getAudioTracks()[0];
          if (audioTrack) {
            finalStream = new MediaStream([
              ...displayStream.getVideoTracks(),
              audioTrack
            ]);
          }
        } catch (audioErr) {
          console.log('Could not capture video audio, using display audio only');
        }
      }

      const mediaRecorder = new MediaRecorder(finalStream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        displayStream.getTracks().forEach(track => track.stop());
      };

      // Handle if user stops sharing
      displayStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start playing facecam video
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Recording error:', err);
      alert('Could not start recording. Make sure to select "This Tab" when prompted!');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (videoRef.current) {
        videoRef.current.pause();
      }
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcuts
  const handleKeyPress = useCallback((e) => {
    if (!recordingMode) return;
    
    const key = e.key;
    
    if (key === '1') {
      setPosition(STARTING_POSITION);
      setHistory([STARTING_POSITION]);
      setArrows([]);
    } else if (key === '2') {
      setPosition('8/8/8/8/4P3/8/8/8');
      setArrows([]);
    } else if (key === '3') {
      setPosition('8/8/8/8/4R3/8/8/8');
      setArrows([]);
    } else if (key === '4') {
      setPosition('8/8/8/8/4N3/8/8/8');
      setArrows([]);
    } else if (key === '5') {
      setPosition('8/8/8/8/4B3/8/8/8');
      setArrows([]);
    } else if (key === '6') {
      setPosition('8/8/8/8/4Q3/8/8/8');
      setArrows([]);
    } else if (key === '7') {
      setPosition('8/8/8/8/4K3/8/8/8');
      setArrows([]);
    } else if (key === '0' || key === 'Escape') {
      setArrows([]);
    }
  }, [recordingMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    const navbar = document.querySelector('.navbar, nav, header');
    const mainContent = document.querySelector('.main-content, main');
    
    if (recordingMode) {
      if (navbar) navbar.style.display = 'none';
      if (mainContent) mainContent.style.padding = '0';
      document.body.style.overflow = 'hidden';
    } else {
      if (navbar) navbar.style.display = '';
      if (mainContent) mainContent.style.padding = '';
      document.body.style.overflow = '';
    }
    
    return () => {
      if (navbar) navbar.style.display = '';
      if (mainContent) mainContent.style.padding = '';
      document.body.style.overflow = '';
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recordingMode]);

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
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
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    rows.forEach((row, rowIndex) => {
      let fileIndex = 0;
      for (const char of row) {
        if (isNaN(char)) {
          const color = char === char.toUpperCase() ? 'w' : 'b';
          const piece = char.toUpperCase();
          const square = files[fileIndex] + (8 - rowIndex);
          map[square] = color + piece;
          fileIndex++;
        } else {
          fileIndex += parseInt(char);
        }
      }
    });
    return map;
  };

  const mapToFen = (map) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    let fen = '';
    for (let rank = 8; rank >= 1; rank--) {
      let emptyCount = 0;
      for (const file of files) {
        const square = file + rank;
        if (map[square]) {
          if (emptyCount > 0) { fen += emptyCount; emptyCount = 0; }
          const piece = map[square][1];
          fen += map[square][0] === 'w' ? piece.toUpperCase() : piece.toLowerCase();
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) fen += emptyCount;
      if (rank > 1) fen += '/';
    }
    return fen;
  };

  const onPieceDrop = (sourceSquare, targetSquare, piece) => {
    const map = fenToMap(position);
    if (sourceSquare && map[sourceSquare]) delete map[sourceSquare];
    map[targetSquare] = piece;
    const newFen = mapToFen(map);
    setPosition(newFen);
    setHistory([...history, newFen]);
    return true;
  };

  const onSquareClick = (square) => {
    const map = fenToMap(position);
    if (selectedPiece) {
      map[square] = selectedPiece;
      const newFen = mapToFen(map);
      setPosition(newFen);
      setHistory([...history, newFen]);
    } else if (map[square]) {
      delete map[square];
      const newFen = mapToFen(map);
      setPosition(newFen);
      setHistory([...history, newFen]);
    }
  };

  const onSquareRightClick = (square) => {
    if (arrowStart) {
      if (arrowStart !== square) {
        setArrows(prev => [...prev, [arrowStart, square]]);
      }
      setArrowStart(null);
    } else {
      setArrowStart(square);
    }
  };

  const undo = () => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      setPosition(newHistory[newHistory.length - 1]);
    }
  };

  const reset = () => { setPosition(STARTING_POSITION); setHistory([STARTING_POSITION]); setArrows([]); };
  const clear = () => { setPosition(EMPTY_POSITION); setHistory([...history, EMPTY_POSITION]); setArrows([]); };
  const flipBoard = () => { setBoardOrientation(boardOrientation === 'white' ? 'black' : 'white'); };

  const PieceButton = ({ piece }) => {
    const isSelected = selectedPiece === piece;
    return (
      <button
        onClick={() => setSelectedPiece(isSelected ? null : piece)}
        style={{
          width: '50px', height: '50px',
          background: isSelected ? '#769656' : 'rgba(255,255,255,0.1)',
          border: isSelected ? '2px solid #fff' : '2px solid transparent',
          borderRadius: '8px', cursor: 'pointer', padding: '4px'
        }}
      >
        <img src={PIECE_IMAGES[piece]} alt={piece} style={{ width: '100%', height: '100%' }} />
      </button>
    );
  };

  // RECORDING MODE
  if (recordingMode) {
    return (
      <div ref={recordingAreaRef} style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: '#312e2b',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999
      }}>
        {/* Top bar with controls */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.8)',
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: '15px',
          zIndex: 10001
        }}>
          <button
            onClick={() => { if (isRecording) stopRecording(); setRecordingMode(false); }}
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaArrowLeft /> Exit
          </button>

          {!isRecording && !recordedVideoUrl && (
            <button
              onClick={startRecording}
              style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
            >
              <FaCircle /> Start Recording
            </button>
          )}

          {isRecording && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <FaCircle style={{ animation: 'pulse 1s infinite' }} />
                <span style={{ fontFamily: 'monospace', fontSize: '18px' }}>{formatTime(recordingTime)}</span>
              </div>
              <button
                onClick={stopRecording}
                style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
              >
                <FaStop /> Stop Recording
              </button>
            </>
          )}

          {recordedVideoUrl && (
            <>
              <span style={{ color: '#22c55e' }}>✓ Recording complete!</span>
              <button
                onClick={downloadRecording}
                style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
              >
                <FaDownload /> Download Video
              </button>
              <button
                onClick={() => setRecordedVideoUrl(null)}
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer' }}
              >
                Record Again
              </button>
            </>
          )}

          {/* Hotkey hints */}
          <div style={{ marginLeft: 'auto', color: '#666', fontSize: '12px' }}>
            <b>1</b>=Reset <b>2</b>=♙ <b>3</b>=♖ <b>4</b>=♘ <b>5</b>=♗ <b>6</b>=♕ <b>7</b>=♔ <b>0</b>=Clear arrows
          </div>
        </div>

        {/* Board */}
        <div style={{ width: '80vh', maxWidth: '650px', marginTop: '40px' }}>
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

        {/* PIP Video */}
        {videoUrl && (
          <div style={{
            position: 'fixed',
            ...PIP_POSITIONS[pipPosition],
            ...PIP_SIZES[pipSize],
            zIndex: 10000,
            borderRadius: '12px', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            border: '3px solid rgba(255,255,255,0.3)'
          }}>
            <video
              ref={videoRef}
              src={videoUrl}
              style={{ width: '100%', display: 'block' }}
              loop
              playsInline
            />
          </div>
        )}

        {/* Pulse animation */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }

  // NORMAL MODE
  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto', color: 'white' }}>
      <h1><FaChessBoard style={{ marginRight: '12px' }} />Test Board</h1>
      <p style={{ color: '#888', marginBottom: '20px' }}>Setup your position, upload your facecam, then record!</p>

      <input type="file" ref={fileInputRef} accept="video/*" onChange={handleFileSelect} style={{ display: 'none' }} />

      {/* Controls */}
      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <button onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 20px', background: '#769656', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaUpload /> {videoFile ? 'Change Video' : 'Upload Facecam'}
        </button>

        {videoFile && (
          <>
            <span style={{ color: '#aaa', fontSize: '14px' }}>{videoFile.name}</span>
            <select value={pipPosition} onChange={(e) => setPipPosition(e.target.value)} style={selectStyle}>
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
            <select value={pipSize} onChange={(e) => setPipSize(e.target.value)} style={selectStyle}>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
            <button onClick={removeVideo} style={{ ...selectStyle, background: '#ef4444', border: 'none', cursor: 'pointer' }}><FaTimes /></button>
          </>
        )}

        <button onClick={() => setRecordingMode(true)} style={{ marginLeft: 'auto', padding: '12px 24px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
          <FaVideo /> Enter Recording Studio
        </button>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '300px', maxWidth: '500px' }}>
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
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
            <button onClick={undo} style={btnStyle} disabled={history.length <= 1}><FaUndo /> Undo</button>
            <button onClick={flipBoard} style={btnStyle}><FaSyncAlt /> Flip</button>
            <button onClick={reset} style={{ ...btnStyle, background: '#3b82f6' }}>Reset</button>
            <button onClick={clear} style={{ ...btnStyle, background: '#ef4444' }}><FaTrash /> Clear</button>
            <button onClick={() => setArrows([])} style={btnStyle}>Clear Arrows</button>
          </div>
        </div>

        <div style={{ flex: '0 0 auto' }}>
          <h3 style={{ marginBottom: '15px' }}>Pieces</h3>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '15px' }}>Click to select, then click square.<br/>Right-click two squares for arrow.</p>
          
          {selectedPiece && (
            <div style={{ marginBottom: '15px', padding: '10px', background: '#769656', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={PIECE_IMAGES[selectedPiece]} alt="" style={{ width: '32px', height: '32px' }} />
              <span>Selected</span>
              <button onClick={() => setSelectedPiece(null)} style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#aaa', marginBottom: '10px' }}>White</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{PIECES.white.map(p => <PieceButton key={p} piece={p} />)}</div>
          </div>
          <div>
            <h4 style={{ color: '#aaa', marginBottom: '10px' }}>Black</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{PIECES.black.map(p => <PieceButton key={p} piece={p} />)}</div>
          </div>

          <div style={{ marginTop: '25px' }}>
            <h4 style={{ color: '#aaa', marginBottom: '10px' }}>FEN</h4>
            <input type="text" value={position} onChange={(e) => { setPosition(e.target.value); setHistory([...history, e.target.value]); }}
              style={{ width: '100%', padding: '10px', background: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', color: 'white', fontSize: '12px', fontFamily: 'monospace' }} />
          </div>

          <div style={{ marginTop: '25px', padding: '15px', background: 'rgba(118,150,86,0.2)', borderRadius: '8px', border: '1px solid rgba(118,150,86,0.4)' }}>
            <h4 style={{ color: '#769656', marginBottom: '8px' }}>⌨️ Recording Hotkeys</h4>
            <p style={{ color: '#aaa', fontSize: '13px', lineHeight: '1.6' }}>
              <b>1</b> = Reset board<br/>
              <b>2</b> = Pawn <b>3</b> = Rook <b>4</b> = Knight<br/>
              <b>5</b> = Bishop <b>6</b> = Queen <b>7</b> = King<br/>
              <b>0</b> = Clear arrows
            </p>
          </div>
        </div>
      </div>

      {videoUrl && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '200px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', border: '2px solid #444' }}>
          <video src={videoUrl} style={{ width: '100%', display: 'block' }} muted />
          <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'rgba(0,0,0,0.7)', padding: '8px', textAlign: 'center', fontSize: '12px' }}>Preview</div>
        </div>
      )}
    </div>
  );
};

const btnStyle = { padding: '10px 16px', background: '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' };
const selectStyle = { padding: '8px 12px', background: '#2a2a2a', color: 'white', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer' };

export default TestBoard;
