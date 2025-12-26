/**
 * Chess.com style pieces for react-chessboard
 * Uses chess.com's "neo" piece set
 */

const PIECE_BASE_URL = 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150';

// Map piece codes to image URLs
const pieceUrls = {
  wK: `${PIECE_BASE_URL}/wk.png`,
  wQ: `${PIECE_BASE_URL}/wq.png`,
  wR: `${PIECE_BASE_URL}/wr.png`,
  wB: `${PIECE_BASE_URL}/wb.png`,
  wN: `${PIECE_BASE_URL}/wn.png`,
  wP: `${PIECE_BASE_URL}/wp.png`,
  bK: `${PIECE_BASE_URL}/bk.png`,
  bQ: `${PIECE_BASE_URL}/bq.png`,
  bR: `${PIECE_BASE_URL}/br.png`,
  bB: `${PIECE_BASE_URL}/bb.png`,
  bN: `${PIECE_BASE_URL}/bn.png`,
  bP: `${PIECE_BASE_URL}/bp.png`,
};

// Custom pieces renderer for react-chessboard
export const chessComPieces = () => {
  const pieces = {};
  
  Object.keys(pieceUrls).forEach((piece) => {
    pieces[piece] = ({ squareWidth }) => (
      <div
        style={{
          width: squareWidth,
          height: squareWidth,
          backgroundImage: `url(${pieceUrls[piece]})`,
          backgroundSize: '100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      />
    );
  });
  
  return pieces;
};

// Chess.com green board colors (default)
export const chessComBoardStyle = {
  lightSquare: '#eeeed2',
  darkSquare: '#769656',
};

export default chessComPieces;
