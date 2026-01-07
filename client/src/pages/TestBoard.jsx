import React, { useState, useRef, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUndo, FaTrash, FaSyncAlt, FaChessBoard, FaUpload, FaPlay, FaPause, FaTimes, FaVideo, FaArrowLeft } from 'react-icons/fa';

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

// Chess.com style piece images
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

// Custom pieces component for chess.com style
const customPieces = () => {
  const pieces = {};
  Object.keys(PIECE_IMAGES).forEach(piece => {
    pieces[piece] = ({ squareWidth }) => (
      <img
        src={PIECE_IMAGES[piece]}
        alt={piece}
        style={{ width: squareWidth, height: squareWidth }}
      />
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
  
  // Video PIP state
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pipPosition, setPipPosition] = useState('top-right');
  const [pipSize, setPipSize] = useState('medium');
  
  // Recording mode - hides everything except board and video
  const [recordingMode, setRecordingMode] = useState(false);
  
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Hide navbar in recording mode
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
    };
  }, [recordingMode]);

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  // Video functions
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const removeVideo = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoFile(null);
    setVideoUrl(null);
    setIsPlaying(false);
  };

  // Board functions
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
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
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
    if (sourceSquare && map[sourceSquare]) {
      delete map[sourceSquare];
    }
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
    const map = fenToMap(position);
    if (map[square]) {
      delete map[square];
      const newFen = mapToFen(map);
      setPosition(newFen);
      setHistory([...history, newFen]);
    }
  };

  const undo = () => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      setPosition(newHistory[newHistory.length - 1]);
    }
  };

  const reset = () => {
    setPosition(STARTING_POSITION);
    setHistory([STARTING_POSITION]);
  };

  const clear = () => {
    setPosition(EMPTY_POSITION);
    setHistory([...history, EMPTY_POSITION]);
  };

  const flipBoard = () => {
    setBoardOrientation(boardOrientation === 'white' ? 'black' : 'white');
  };

  const PieceButton = ({ piece }) => {
    const isSelected = selectedPiece === piece;
    return (
      <button
        onClick={() => setSelectedPiece(isSelected ? null : piece)}
        style={{
          width: '50px',
          height: '50px',
          background: isSelected ? '#769656' : 'rgba(255,255,255,0.1)',
          border: isSelected ? '2px solid #fff' : '2px solid transparent',
          borderRadius: '8px',
          cursor: 'pointer',
          padding: '4px'
        }}
      >
        <img src={PIECE_IMAGES[piece]} alt={piece} style={{ width: '100%', height: '100%' }} />
      </button>
    );
  };

  // RECORDING MODE - Clean view for recording
  if (recordingMode) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#312e2b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        {/* Exit button - small and in corner */}
        <button
          onClick={() => setRecordingMode(false)}
          style={{
            position: 'fixed',
            top: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 12px',
            cursor: 'pointer',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px'
          }}
        >
          <FaArrowLeft /> Exit
        </button>

        {/* Board - centered and big */}
        <div style={{ width: '85vh', maxWidth: '700px' }}>
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
          />
        </div>

        {/* PIP Video */}
        {videoUrl && (
          <div
            style={{
              position: 'fixed',
              ...PIP_POSITIONS[pipPosition],
              ...PIP_SIZES[pipSize],
              zIndex: 10000,
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              border: '3px solid rgba(255,255,255,0.3)'
            }}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              style={{ width: '100%', display: 'block' }}
              onEnded={() => setIsPlaying(false)}
              autoPlay
              loop
            />
          </div>
        )}
      </div>
    );
  }

  // NORMAL MODE - Setup view
  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto', color: 'white', position: 'relative' }}>
      <h1><FaChessBoard style={{ marginRight: '12px' }} />Test Board</h1>
      <p style={{ color: '#888', marginBottom: '20px' }}>Setup your position, upload your video, then enter Recording Mode.</p>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Controls Bar */}
      <div style={{ 
        background: 'rgba(255,255,255,0.05)', 
        padding: '15px 20px', 
        borderRadius: '12px', 
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '10px 20px',
            background: '#769656',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaUpload /> {videoFile ? 'Change Video' : 'Upload Your Video'}
        </button>

        {videoFile && (
          <>
            <span style={{ color: '#aaa', fontSize: '14px' }}>{videoFile.name}</span>
            
            <select
              value={pipPosition}
              onChange={(e) => setPipPosition(e.target.value)}
              style={selectStyle}
            >
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>

            <select
              value={pipSize}
              onChange={(e) => setPipSize(e.target.value)}
              style={selectStyle}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>

            <button
              onClick={removeVideo}
              style={{ ...selectStyle, background: '#ef4444', border: 'none', cursor: 'pointer' }}
            >
              <FaTimes />
            </button>
          </>
        )}

        <button
          onClick={() => setRecordingMode(true)}
          style={{
            marginLeft: 'auto',
            padding: '12px 24px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 'bold'
          }}
        >
          <FaVideo /> Start Recording Mode
        </button>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        {/* Board Preview */}
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
          />
          
          {/* Board Controls */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
            <button onClick={undo} style={btnStyle} disabled={history.length <= 1}>
              <FaUndo /> Undo
            </button>
            <button onClick={flipBoard} style={btnStyle}>
              <FaSyncAlt /> Flip
            </button>
            <button onClick={reset} style={{ ...btnStyle, background: '#3b82f6' }}>
              Reset
            </button>
            <button onClick={clear} style={{ ...btnStyle, background: '#ef4444' }}>
              <FaTrash /> Clear
            </button>
          </div>
        </div>

        {/* Piece Palette */}
        <div style={{ flex: '0 0 auto' }}>
          <h3 style={{ marginBottom: '15px' }}>Pieces</h3>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '15px' }}>
            Click to select, then click square to place.<br/>
            Right-click square to remove piece.
          </p>
          
          {selectedPiece && (
            <div style={{ 
              marginBottom: '15px', 
              padding: '10px', 
              background: '#769656', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <img src={PIECE_IMAGES[selectedPiece]} alt="" style={{ width: '32px', height: '32px' }} />
              <span>Selected</span>
              <button 
                onClick={() => setSelectedPiece(null)}
                style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#aaa', marginBottom: '10px' }}>White</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PIECES.white.map(p => <PieceButton key={p} piece={p} />)}
            </div>
          </div>

          <div>
            <h4 style={{ color: '#aaa', marginBottom: '10px' }}>Black</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PIECES.black.map(p => <PieceButton key={p} piece={p} />)}
            </div>
          </div>

          {/* FEN */}
          <div style={{ marginTop: '25px' }}>
            <h4 style={{ color: '#aaa', marginBottom: '10px' }}>FEN</h4>
            <input
              type="text"
              value={position}
              onChange={(e) => {
                setPosition(e.target.value);
                setHistory([...history, e.target.value]);
              }}
              style={{
                width: '100%',
                padding: '10px',
                background: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '6px',
                color: 'white',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}
            />
          </div>
        </div>
      </div>

      {/* Video Preview (small) */}
      {videoUrl && !recordingMode && (
        <div style={{ 
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '200px',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          border: '2px solid #444'
        }}>
          <video
            src={videoUrl}
            style={{ width: '100%', display: 'block' }}
            muted
          />
          <div style={{ 
            position: 'absolute', 
            bottom: '0', 
            left: '0', 
            right: '0', 
            background: 'rgba(0,0,0,0.7)', 
            padding: '8px',
            textAlign: 'center',
            fontSize: '12px'
          }}>
            Preview
          </div>
        </div>
      )}
    </div>
  );
};

const btnStyle = {
  padding: '10px 16px',
  background: '#333',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

const selectStyle = {
  padding: '8px 12px',
  background: '#2a2a2a',
  color: 'white',
  border: '1px solid #444',
  borderRadius: '6px',
  cursor: 'pointer'
};

export default TestBoard;
