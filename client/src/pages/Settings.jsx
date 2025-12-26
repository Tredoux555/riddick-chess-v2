import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { PIECE_SETS, BOARD_THEMES, createCustomPieces } from '../utils/chessComPieces';
import { FaChessBoard, FaChessPawn, FaCheck } from 'react-icons/fa';

const Settings = () => {
  const [pieceSet, setPieceSet] = useState('neo');
  const [boardTheme, setBoardTheme] = useState('green');
  const currentTheme = BOARD_THEMES[boardTheme];
  const customPieces = createCustomPieces(pieceSet);
  const availablePieceSets = PIECE_SETS;
  const availableBoardThemes = BOARD_THEMES;

  const [activeTab, setActiveTab] = useState('board');

  // Preview position
  const previewPosition = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1><FaChessBoard /> Board Settings</h1>
        
        <div className="settings-tabs">
          <button 
            className={`tab ${activeTab === 'board' ? 'active' : ''}`}
            onClick={() => setActiveTab('board')}
          >
            <FaChessBoard /> Board Theme
          </button>
          <button 
            className={`tab ${activeTab === 'pieces' ? 'active' : ''}`}
            onClick={() => setActiveTab('pieces')}
          >
            <FaChessPawn /> Piece Style
          </button>
        </div>

        <div className="settings-content">
          <div className="preview-section">
            <h3>Preview</h3>
            <div className="board-preview">
              <Chessboard
                position={previewPosition}
                boardWidth={350}
                customPieces={customPieces}
                customDarkSquareStyle={{ backgroundColor: currentTheme.darkSquare }}
                customLightSquareStyle={{ backgroundColor: currentTheme.lightSquare }}
                customBoardStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                arePiecesDraggable={false}
              />
            </div>
          </div>

          <div className="options-section">
            {activeTab === 'board' && (
              <div className="theme-grid">
                {Object.entries(availableBoardThemes).map(([key, theme]) => (
                  <div 
                    key={key}
                    className={`theme-option ${boardTheme === key ? 'selected' : ''}`}
                    onClick={() => setBoardTheme(key)}
                  >
                    <div className="theme-preview">
                      <div className="mini-board">
                        <div className="square light" style={{ backgroundColor: theme.lightSquare }}></div>
                        <div className="square dark" style={{ backgroundColor: theme.darkSquare }}></div>
                        <div className="square dark" style={{ backgroundColor: theme.darkSquare }}></div>
                        <div className="square light" style={{ backgroundColor: theme.lightSquare }}></div>
                      </div>
                    </div>
                    <span className="theme-name">{theme.name}</span>
                    {boardTheme === key && <FaCheck className="check-icon" />}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'pieces' && (
              <div className="pieces-grid">
                {Object.entries(availablePieceSets).map(([key, set]) => (
                  <div 
                    key={key}
                    className={`piece-option ${pieceSet === key ? 'selected' : ''}`}
                    onClick={() => setPieceSet(key)}
                  >
                    <div className="piece-preview">
                      <img 
                        src={`${set.baseUrl}/wk.png`} 
                        alt={set.name}
                        className="preview-piece"
                      />
                      <img 
                        src={`${set.baseUrl}/bn.png`} 
                        alt={set.name}
                        className="preview-piece"
                      />
                    </div>
                    <span className="piece-name">{set.name}</span>
                    {pieceSet === key && <FaCheck className="check-icon" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-page {
          min-height: calc(100vh - 60px);
          padding: 2rem;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        }
        .settings-container {
          max-width: 1000px;
          margin: 0 auto;
        }
        .settings-container h1 {
          color: #fff;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .settings-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .tab {
          padding: 0.75rem 1.5rem;
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 8px;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        .tab:hover { background: rgba(255,255,255,0.2); }
        .tab.active { background: #769656; }
        .settings-content {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 2rem;
        }
        .preview-section {
          background: rgba(255,255,255,0.05);
          padding: 1.5rem;
          border-radius: 12px;
        }
        .preview-section h3 {
          color: #fff;
          margin-bottom: 1rem;
        }
        .board-preview {
          display: flex;
          justify-content: center;
        }
        .options-section {
          background: rgba(255,255,255,0.05);
          padding: 1.5rem;
          border-radius: 12px;
        }
        .theme-grid, .pieces-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 1rem;
        }
        .theme-option, .piece-option {
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          position: relative;
        }
        .theme-option:hover, .piece-option:hover {
          background: rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }
        .theme-option.selected, .piece-option.selected {
          background: rgba(118, 150, 86, 0.3);
          border: 2px solid #769656;
        }
        .mini-board {
          width: 60px;
          height: 60px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-radius: 4px;
          overflow: hidden;
          margin: 0 auto 0.5rem;
        }
        .square { width: 30px; height: 30px; }
        .theme-name, .piece-name {
          color: #fff;
          font-size: 0.9rem;
        }
        .check-icon {
          position: absolute;
          top: 8px;
          right: 8px;
          color: #769656;
        }
        .piece-preview {
          display: flex;
          justify-content: center;
          gap: 0.25rem;
          margin-bottom: 0.5rem;
        }
        .preview-piece {
          width: 40px;
          height: 40px;
        }
        @media (max-width: 768px) {
          .settings-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Settings;
