/**
 * Chess piece sets and board themes for react-chessboard
 * Supports Chess.com, Lichess, and custom themes
 */

// Available piece sets with their CDN URLs
export const PIECE_SETS = {
  neo: {
    name: 'Neo',
    baseUrl: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150'
  },
  classic: {
    name: 'Classic',
    baseUrl: 'https://images.chesscomfiles.com/chess-themes/pieces/classic/150'
  },
  wood: {
    name: 'Wood',
    baseUrl: 'https://images.chesscomfiles.com/chess-themes/pieces/wood/150'
  },
  glass: {
    name: 'Glass',
    baseUrl: 'https://images.chesscomfiles.com/chess-themes/pieces/glass/150'
  },
  gothic: {
    name: 'Gothic',
    baseUrl: 'https://images.chesscomfiles.com/chess-themes/pieces/gothic/150'
  },
  metal: {
    name: 'Metal',
    baseUrl: 'https://images.chesscomfiles.com/chess-themes/pieces/metal/150'
  },
  bases: {
    name: 'Bases',
    baseUrl: 'https://images.chesscomfiles.com/chess-themes/pieces/bases/150'
  },
  icy_sea: {
    name: 'Icy Sea',
    baseUrl: 'https://images.chesscomfiles.com/chess-themes/pieces/icy_sea/150'
  },
  lolz: {
    name: 'LOLz',
    baseUrl: 'https://images.chesscomfiles.com/chess-themes/pieces/lolz/150'
  },
  graffiti: {
    name: 'Graffiti',
    baseUrl: 'https://images.chesscomfiles.com/chess-themes/pieces/graffiti/150'
  }
};

// Available board themes
export const BOARD_THEMES = {
  green: {
    name: 'Green',
    lightSquare: '#eeeed2',
    darkSquare: '#769656'
  },
  brown: {
    name: 'Brown',
    lightSquare: '#f0d9b5',
    darkSquare: '#b58863'
  },
  blue: {
    name: 'Blue',
    lightSquare: '#dee3e6',
    darkSquare: '#8ca2ad'
  },
  purple: {
    name: 'Purple',
    lightSquare: '#e8e0f0',
    darkSquare: '#7b61a8'
  },
  gray: {
    name: 'Gray',
    lightSquare: '#d9d9d9',
    darkSquare: '#7f7f7f'
  },
  wood: {
    name: 'Wood',
    lightSquare: '#e8d0aa',
    darkSquare: '#a87c50'
  },
  ocean: {
    name: 'Ocean',
    lightSquare: '#a8d4e6',
    darkSquare: '#2980b9'
  },
  walnut: {
    name: 'Walnut',
    lightSquare: '#ece3c4',
    darkSquare: '#c4a35a'
  },
  marble: {
    name: 'Marble',
    lightSquare: '#f5f5f5',
    darkSquare: '#909090'
  }
};

// Generate custom pieces for react-chessboard
export const createCustomPieces = (pieceSet = 'neo') => {
  const set = PIECE_SETS[pieceSet] || PIECE_SETS.neo;
  const pieces = {};
  
  const pieceTypes = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];
  
  pieceTypes.forEach((piece) => {
    const color = piece[0];
    const type = piece[1].toLowerCase();
    const url = `${set.baseUrl}/${color}${type}.png`;
    
    pieces[piece] = ({ squareWidth }) => (
      <div
        style={{
          width: squareWidth,
          height: squareWidth,
          backgroundImage: `url(${url})`,
          backgroundSize: '100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      />
    );
  });
  
  return pieces;
};

// Default chess.com style (for backwards compatibility)
export const chessComPieces = () => createCustomPieces('neo');

export const chessComBoardStyle = BOARD_THEMES.green;

export default chessComPieces;
