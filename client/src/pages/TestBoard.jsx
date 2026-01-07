import React, { useState, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUndo, FaTrash, FaSyncAlt, FaChessBoard, FaUpload, FaPlay, FaPause, FaTimes, FaExpand, FaCompress } from 'react-icons/fa';

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
  small: { width: '200px' },
  medium: { width: '280px' },
  large: { width: '360px' }
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
  const [showPipControls, setShowPipControls] = useState(true);
  
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px'
        }}
      >
        {getPieceUnicode(piece)}
      </button>
    );
  };

  const getPieceUnicode = (piece) => {
    const unicodePieces = {
      'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
      'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
    };
    return unicodePieces[piece] || '';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto', color: 'white', position: 'relative', minHeight: '100vh' }}>
      <h1><FaChessBoard style={{ marginRight: '12px' }} />Test Board</h1>
      <p style={{ color: '#888', marginBottom: '20px' }}>Freestyle board for video recording. Upload your facecam video to overlay.</p>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Video Upload Section */}
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
          <FaUpload /> {videoFile ? 'Change Video' : 'Upload Facecam Video'}
        </button>

        {videoFile && (
          <>
            <span style={{ color: '#aaa' }}>{videoFile.name}</span>
            
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

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#aaa', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showPipControls}
                onChange={(e) => setShowPipControls(e.target.checked)}
              />
              Show controls
            </label>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        {/* Board */}
        <div style={{ flex: '1', minWidth: '300px', maxWidth: '560px' }}>
          <Chessboard
            position={position}
            onPieceDrop={onPieceDrop}
            onSquareClick={onSquareClick}
            onSquareRightClick={onSquareRightClick}
            boardOrientation={boardOrientation}
            arePiecesDraggable={true}
            customBoardStyle={{
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}
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
              <span style={{ fontSize: '28px' }}>{getPieceUnicode(selectedPiece)}</span>
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

          {/* Recording tip */}
          <div style={{ 
            marginTop: '25px', 
            padding: '15px', 
            background: 'rgba(118,150,86,0.2)', 
            borderRadius: '8px',
            border: '1px solid rgba(118,150,86,0.4)'
          }}>
            <h4 style={{ color: '#769656', marginBottom: '8px' }}>💡 Recording Tip</h4>
            <p style={{ color: '#aaa', fontSize: '13px', lineHeight: '1.5' }}>
              Use OBS or your Mac's screen recorder (Cmd+Shift+5) to capture this page while your video plays in the corner.
            </p>
          </div>
        </div>
      </div>

      {/* Floating PIP Video */}
      {videoUrl && (
        <div
          style={{
            position: 'fixed',
            ...PIP_POSITIONS[pipPosition],
            ...PIP_SIZES[pipSize],
            zIndex: 1000,
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            border: '3px solid rgba(255,255,255,0.2)'
          }}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            style={{ width: '100%', display: 'block' }}
            onEnded={() => setIsPlaying(false)}
          />
          
          {/* PIP Controls */}
          {showPipControls && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              padding: '20px 10px 10px',
              display: 'flex',
              justifyContent: 'center',
              gap: '10px'
            }}>
              <button onClick={togglePlay} style={pipBtnStyle}>
                {isPlaying ? <FaPause /> : <FaPlay />}
              </button>
              <button onClick={removeVideo} style={{ ...pipBtnStyle, background: '#ef4444' }}>
                <FaTimes />
              </button>
            </div>
          )}
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

const pipBtnStyle = {
  width: '36px',
  height: '36px',
  background: 'rgba(255,255,255,0.2)',
  color: 'white',
  border: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

export default TestBoard;
