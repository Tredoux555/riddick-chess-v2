import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUndo, FaTrash, FaSyncAlt, FaChessBoard } from 'react-icons/fa';

const STARTING_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const EMPTY_POSITION = '8/8/8/8/8/8/8/8';

// Piece palette for drag & drop
const PIECES = {
  white: ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP'],
  black: ['bK', 'bQ', 'bR', 'bB', 'bN', 'bP']
};

const TestBoard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [position, setPosition] = useState(STARTING_POSITION);
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [history, setHistory] = useState([STARTING_POSITION]);
  const [selectedPiece, setSelectedPiece] = useState(null);

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  // Convert FEN position to piece map
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

  // Convert piece map to FEN
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

  // Handle piece drop (move or place)
  const onPieceDrop = (sourceSquare, targetSquare, piece) => {
    const map = fenToMap(position);
    
    // Remove from source if it's a board square
    if (sourceSquare && map[sourceSquare]) {
      delete map[sourceSquare];
    }
    
    // Place on target
    map[targetSquare] = piece;
    
    const newFen = mapToFen(map);
    setPosition(newFen);
    setHistory([...history, newFen]);
    return true;
  };

  // Handle clicking on a square (to place selected piece or remove)
  const onSquareClick = (square) => {
    const map = fenToMap(position);
    
    if (selectedPiece) {
      // Place the selected piece
      map[square] = selectedPiece;
      const newFen = mapToFen(map);
      setPosition(newFen);
      setHistory([...history, newFen]);
    } else if (map[square]) {
      // Remove piece if clicking on occupied square with no piece selected
      delete map[square];
      const newFen = mapToFen(map);
      setPosition(newFen);
      setHistory([...history, newFen]);
    }
  };

  // Right click to remove piece
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

  // Render piece button for palette
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

  // Get unicode character for piece
  const getPieceUnicode = (piece) => {
    const unicodePieces = {
      'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
      'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
    };
    return unicodePieces[piece] || '';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', color: 'white' }}>
      <h1><FaChessBoard style={{ marginRight: '12px' }} />Test Board</h1>
      <p style={{ color: '#888', marginBottom: '20px' }}>Freestyle board for video recording. No rules enforced.</p>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        {/* Board */}
        <div style={{ flex: '1', minWidth: '300px', maxWidth: '500px' }}>
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
          
          {/* Controls */}
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

          {/* FEN display */}
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

export default TestBoard;
