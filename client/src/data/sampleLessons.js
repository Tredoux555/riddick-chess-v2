// Sample lesson data with VALID FEN positions
// FEN must include both kings for chess.js validation

export const SAMPLE_LESSON_PAWN = {
  id: 'pawn',
  title: 'The Pawn',
  icon: '♙',
  description: 'Small but mighty soldiers',
  xp: 15,
  color: '#f59e0b',
  locked: false,
  video: {
    scenes: [
      {
        duration: 3000,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        text: "Meet the Pawn! ♙",
        subtext: "The smallest piece, but very important!",
        highlight: ['e2']
      },
      {
        duration: 4000,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        text: "Each side has 8 pawns",
        subtext: "They form your army's front line!",
        highlight: ['a2','b2','c2','d2','e2','f2','g2','h2']
      },
      {
        duration: 4000,
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        text: "Pawns move FORWARD ⬆️",
        subtext: "One square at a time!",
        highlight: ['e4']
      },
      {
        duration: 4500,
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        text: "FIRST move = 2 squares! 🚀",
        subtext: "Only on their very first move",
        highlight: ['e4']
      },
      {
        duration: 4500,
        fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2',
        text: "Pawns capture DIAGONALLY! ⚔️",
        subtext: "They attack sideways!",
        highlight: ['d5']
      }
    ]
  },
  exercises: [
    {
      num: 1,
      type: 'drag_drop',
      instruction: "Move the pawn forward one or two squares",
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      solution: 'e2e4',
      alternatives: ['e2e3'],
      highlightFrom: 'e2',
      hints: [
        null,
        "Pawns can move 2 squares on their first move",
        "Drag the pawn from e2 to either e3 or e4"
      ],
      explanation: "Pawns can move 1 or 2 squares forward on their first move!"
    },
    {
      num: 2,
      type: 'square_selection',
      instruction: "Click all squares this pawn can attack",
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      correctSquares: ['d5', 'f5'],
      highlightPiece: 'e4',
      hints: [
        null,
        "Pawns attack diagonally, not straight",
        "One square diagonally forward on each side"
      ],
      explanation: "Pawns attack one square diagonally forward!"
    },
    {
      num: 3,
      type: 'multiple_choice',
      question: "How do pawns capture pieces?",
      options: [
        "Straight forward",
        "One square diagonally",
        "In any direction",
        "They can't capture"
      ],
      correct: 1,
      hints: [
        null,
        "Think about how pawns attack",
        "Pawns move forward but attack sideways"
      ],
      explanation: "Pawns capture by moving one square diagonally forward!"
    }
  ]
};

export const SAMPLE_LESSON_INTRO = {
  id: 'intro',
  title: 'The Chessboard',
  icon: '⬛',
  description: 'Learn the battlefield',
  xp: 10,
  color: '#10b981',
  locked: false,
  video: {
    scenes: [
      {
        duration: 3000,
        fen: '8/8/8/8/8/8/8/8 w - - 0 1',
        text: "Welcome to Chess! 🎉",
        subtext: "Let's learn!"
      },
      {
        duration: 4000,
        fen: '8/8/8/8/8/8/8/8 w - - 0 1',
        text: "This is an 8×8 chessboard",
        subtext: "64 squares total!"
      },
      {
        duration: 4000,
        fen: '8/8/8/8/8/8/8/8 w - - 0 1',
        text: "Columns are FILES",
        subtext: "Labeled a-h",
        highlight: ['a1','a2','a3','a4','a5','a6','a7','a8']
      },
      {
        duration: 4000,
        fen: '8/8/8/8/8/8/8/8 w - - 0 1',
        text: "Rows are RANKS",
        subtext: "Numbered 1-8",
        highlight: ['a4','b4','c4','d4','e4','f4','g4','h4']
      }
    ]
  },
  exercises: [
    {
      num: 1,
      type: 'square_selection',
      instruction: "Click on square e4",
      fen: '8/8/8/8/8/8/8/8 w - - 0 1',
      correctSquares: ['e4'],
      hints: [
        null,
        "Files are letters, ranks are numbers",
        "Find the 'e' file and 4th rank"
      ],
      explanation: "e4 is the most famous square in chess!"
    },
    {
      num: 2,
      type: 'square_selection',
      instruction: "Click all squares on the 4th rank",
      fen: '8/8/8/8/8/8/8/8 w - - 0 1',
      correctSquares: ['a4','b4','c4','d4','e4','f4','g4','h4'],
      hints: [
        null,
        "Ranks go across horizontally",
        "4th row from bottom"
      ],
      explanation: "Ranks are horizontal rows numbered 1-8!"
    },
    {
      num: 3,
      type: 'multiple_choice',
      question: "What are vertical columns called?",
      options: ["Ranks", "Files", "Lines", "Rows"],
      correct: 1,
      hints: [
        null,
        "Columns have letter names",
        "Files = columns, Ranks = rows"
      ],
      explanation: "Files are vertical columns labeled a-h!"
    }
  ]
};
