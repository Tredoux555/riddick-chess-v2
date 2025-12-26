import React, { createContext, useContext, useState, useEffect } from 'react';
import { PIECE_SETS, BOARD_THEMES, createCustomPieces } from '../utils/chessComPieces';

const BoardSettingsContext = createContext(null);

export const useBoardSettings = () => {
  const context = useContext(BoardSettingsContext);
  if (!context) {
    throw new Error('useBoardSettings must be used within BoardSettingsProvider');
  }
  return context;
};

export const BoardSettingsProvider = ({ children }) => {
  const [pieceSet, setPieceSet] = useState(() => {
    return localStorage.getItem('chess_piece_set') || 'neo';
  });
  
  const [boardTheme, setBoardTheme] = useState(() => {
    return localStorage.getItem('chess_board_theme') || 'green';
  });

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('chess_piece_set', pieceSet);
  }, [pieceSet]);

  useEffect(() => {
    localStorage.setItem('chess_board_theme', boardTheme);
  }, [boardTheme]);

  // Get current theme colors
  const currentTheme = BOARD_THEMES[boardTheme] || BOARD_THEMES.green;
  
  // Get current pieces
  const customPieces = createCustomPieces(pieceSet);

  const value = {
    pieceSet,
    setPieceSet,
    boardTheme,
    setBoardTheme,
    currentTheme,
    customPieces,
    availablePieceSets: PIECE_SETS,
    availableBoardThemes: BOARD_THEMES
  };

  return (
    <BoardSettingsContext.Provider value={value}>
      {children}
    </BoardSettingsContext.Provider>
  );
};
