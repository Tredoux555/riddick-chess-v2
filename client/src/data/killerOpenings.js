// ============================================================
// KILLER OPENINGS DATA
// Each opening has a move tree for guided play + trap/defense lines
// ============================================================

const killerOpenings = [
  // ==================== #1 SCHOLAR'S MATE ====================
  {
    id: 'scholars-mate',
    name: "Scholar's Mate",
    emoji: '🏆',
    severity: 5,
    totalMoves: 4,
    description: 'Checkmate in just 4 moves! Target the weak f7 pawn.',
    playerColor: 'white',
    difficulty: 'beginner',
    successRate: '15-20% at beginner level',
    keyIdea: 'Queen + Bishop battery targeting f7 (only protected by king)',
    steps: [
      {
        moveNumber: 1,
        playerMove: 'e2e4',
        explanation: "Push the king's pawn two squares! This controls the center and opens lines for your queen and bishop.",
        opponentResponses: {
          main: {
            move: 'e7e5',
            explanation: "Black mirrors your move. This is the most common response.",
          },
          alt: {
            move: 'd7d5',
            explanation: "The Scandinavian Defense. Our trap won't work here — but that's rare at beginner level!",
            isDefense: true,
          }
        }
      },
      {
        moveNumber: 2,
        playerMove: 'f1c4',
        explanation: "Develop the bishop to c4! It's aimed directly at f7 — the weakest square in Black's position (only the king defends it).",
        opponentResponses: {
          main: {
            move: 'b8c6',
            explanation: "Black develops the knight. They're not seeing the threat yet...",
          },
          alt: {
            move: 'f8c5',
            explanation: "Black develops their bishop. The trap still works!",
          }
        }
      },
      {
        moveNumber: 3,
        playerMove: 'd1h5',
        explanation: "💀 BRING OUT THE QUEEN! She's now attacking both e5 AND f7. This is the deadly Queen + Bishop battery!",
        opponentResponses: {
          main: {
            move: 'g8f6',
            explanation: "Black tries to develop and attack your queen... but they've left f7 undefended! 😈",
          },
          defense: {
            move: 'g7g6',
            explanation: "🛡️ Good defense! They blocked the queen's attack on f7. The Scholar's Mate is stopped. Plan B: retreat queen to f3 and continue developing.",
            isDefense: true,
            planB: "Play Qf3 — still eyeing f7, and develop normally. You have a good position!",
          },
          alt: {
            move: 'd8e7',
            explanation: "🛡️ Qe7 also blocks the mate. Plan B: retreat queen and develop.",
            isDefense: true,
            planB: "Play Qf3 — keep pressure on f7 while developing pieces.",
          }
        }
      },
      {
        moveNumber: 4,
        playerMove: 'h5f7',
        explanation: "⚡ CHECKMATE! Qxf7# — The queen captures f7 protected by the bishop. The king has nowhere to go! 👑",
        isCheckmate: true,
      }
    ],
    trapLine: ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7'],
    defenseLine: ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g7g6'],
  },

  // ==================== #2 FOOL'S MATE ====================
  {
    id: 'fools-mate',
    name: "Fool's Mate",
    emoji: '🏆',
    severity: 5,
    totalMoves: 2,
    description: "The fastest checkmate possible! Punish White's terrible opening.",
    playerColor: 'black',
    difficulty: 'beginner',
    successRate: 'Rare but instant win when it happens',
    keyIdea: "White weakens f2-g2 pawns, Black's queen delivers mate on h4",
    steps: [
      {
        moveNumber: 1,
        playerMove: null, // Black waits
        explanation: "White opens with f3 — a terrible move that weakens the king! Just wait for your chance...",
        opponentResponses: {
          main: {
            move: 'f2f3',
            explanation: "White plays f3? This weakens the diagonal to their king! Let's punish it.",
            isOpponentFirst: true,
          }
        }
      },
      {
        moveNumber: 1,
        playerMove: 'e7e5',
        explanation: "Push e5! Control the center AND open the diagonal for your queen to strike.",
        opponentResponses: {
          main: {
            move: 'g2g4',
            explanation: "White plays g4?? Disaster! They've opened the h4-e1 diagonal right to their king! 💀",
          },
          defense: {
            move: 'd2d3',
            explanation: "🛡️ White played normally instead of g4. No Fool's Mate today — just play a normal game.",
            isDefense: true,
            planB: "Develop your pieces normally. You already have a good center pawn!",
          }
        }
      },
      {
        moveNumber: 2,
        playerMove: 'd8h4',
        explanation: "⚡ CHECKMATE! Qh4# — The queen swoops in on the weakened diagonal. King is trapped behind his own pawns! 👑",
        isCheckmate: true,
      }
    ],
    trapLine: ['f2f3', 'e7e5', 'g2g4', 'd8h4'],
    defenseLine: ['f2f3', 'e7e5', 'd2d3'],
  },

  // ==================== #3 FRIED LIVER ATTACK ====================
  {
    id: 'fried-liver',
    name: 'Fried Liver Attack',
    emoji: '🗡️',
    severity: 5,
    totalMoves: 8,
    description: 'Sacrifice a knight on f7 to drag the king out! Devastating.',
    playerColor: 'white',
    difficulty: 'intermediate',
    successRate: '60%+ when opponent falls for it',
    keyIdea: 'Knight sacrifice on f7 forces king to center where it gets hunted',
    steps: [
      {
        moveNumber: 1,
        playerMove: 'e2e4',
        explanation: "King's pawn opening — controls the center!",
        opponentResponses: {
          main: { move: 'e7e5', explanation: "The Italian Game setup begins." }
        }
      },
      {
        moveNumber: 2,
        playerMove: 'g1f3',
        explanation: "Develop the knight! Attacks e5 and prepares for the Italian Game.",
        opponentResponses: {
          main: { move: 'b8c6', explanation: "Black defends e5 with the knight. Standard." }
        }
      },
      {
        moveNumber: 3,
        playerMove: 'f1c4',
        explanation: "Bishop to c4 — the Italian Game! Targeting f7 again (see a pattern?).",
        opponentResponses: {
          main: { move: 'g8f6', explanation: "Black develops and attacks e4. This leads to the Two Knights Defense." },
          defense: {
            move: 'f8c5',
            explanation: "🛡️ Black plays Bc5 instead of Nf6. This is the Giuoco Piano — Fried Liver is off. Play d3 and develop normally.",
            isDefense: true,
            planB: "Play c3 and d4 for a strong center. The Giuoco Piano is still great for White!"
          }
        }
      },
      {
        moveNumber: 4,
        playerMove: 'f3g5',
        explanation: "💀 Knight to g5! Now BOTH the knight and bishop are targeting f7. Black is in trouble!",
        opponentResponses: {
          main: { move: 'd7d5', explanation: "Black tries to counter in the center. The most common response." },
          defense: {
            move: 'd7d5',
            explanation: "d5 is forced — Black needs counterplay.",
          }
        }
      },
      {
        moveNumber: 5,
        playerMove: 'e4d5',
        explanation: "Capture the pawn! Now Black has a critical decision...",
        opponentResponses: {
          main: {
            move: 'f6d5',
            explanation: "Black recaptures with the knight — THE TRAP! Now f7 is completely undefended. 😈",
          },
          defense: {
            move: 'c6a5',
            explanation: "🛡️ Na5! The Traxler Counter-Attack. Black knows theory! Play Bb5+ or d3.",
            isDefense: true,
            planB: "Play Bb5+ to check, then castle. You're still in a good position with an extra pawn."
          }
        }
      },
      {
        moveNumber: 6,
        playerMove: 'g5f7',
        explanation: "⚡ SACRIFICE THE KNIGHT ON f7! The king MUST take it. Now the king is exposed in the center!",
        opponentResponses: {
          main: { move: 'e8f7', explanation: "King takes the knight. Now it's all alone in the open... 💀" }
        }
      },
      {
        moveNumber: 7,
        playerMove: 'd1f3',
        explanation: "Queen to f3 with CHECK! The queen targets the king on f7 AND the knight on d5.",
        opponentResponses: {
          main: { move: 'f7e6', explanation: "King runs to e6 — right into the center of the board! Terrible for Black." }
        }
      },
      {
        moveNumber: 8,
        playerMove: 'b1c3',
        explanation: "Develop the knight with tempo! Attacking the pinned knight on d5. Black's position is collapsing. The king is stranded in the center with no escape! 🔥",
        isCheckmate: false,
        isTrapComplete: true,
      }
    ],
    trapLine: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6', 'f3g5', 'd7d5', 'e4d5', 'f6d5', 'g5f7', 'e8f7', 'd1f3', 'f7e6', 'b1c3'],
    defenseLine: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6', 'f3g5', 'd7d5', 'e4d5', 'c6a5'],
  },

  // ==================== #4 BLACKBURNE SHILLING GAMBIT ====================
  {
    id: 'blackburne-shilling',
    name: 'Blackburne Shilling Gambit',
    emoji: '⚡',
    severity: 4,
    totalMoves: 7,
    description: 'Lure White into taking e5, then deliver a smothered mate!',
    playerColor: 'black',
    difficulty: 'intermediate',
    successRate: 'High against greedy players',
    keyIdea: 'Bait White into Nxe5, then Qg5 creates deadly threats ending in Nf3# smothered mate',
    steps: [
      {
        moveNumber: 1,
        playerMove: null,
        explanation: "White opens e4. Standard.",
        opponentResponses: {
          main: { move: 'e2e4', explanation: "White opens with e4.", isOpponentFirst: true }
        }
      },
      {
        moveNumber: 1,
        playerMove: 'e7e5',
        explanation: "Mirror with e5. Setting the stage...",
        opponentResponses: {
          main: { move: 'g1f3', explanation: "White develops the knight, attacking e5." }
        }
      },
      {
        moveNumber: 2,
        playerMove: 'b8c6',
        explanation: "Defend e5 with the knight. Normal so far...",
        opponentResponses: {
          main: { move: 'f1c4', explanation: "White plays the Italian Game. Now for the gambit!" }
        }
      },
      {
        moveNumber: 3,
        playerMove: 'c6d4',
        explanation: "💀 THE GAMBIT! Knight to d4 — offering the e5 pawn as bait. If White takes it...",
        opponentResponses: {
          main: {
            move: 'f3e5',
            explanation: "White takes the bait! Nxe5?? This is the BLUNDER we wanted! 😈",
          },
          defense: {
            move: 'f3d4',
            explanation: "🛡️ White takes the knight instead. Smart! Play exd4 and you're equal.",
            isDefense: true,
            planB: "Take back with exd4. The position is fine for Black. Develop normally."
          }
        }
      },
      {
        moveNumber: 4,
        playerMove: 'd8g5',
        explanation: "⚡ QUEEN TO g5! Attacking the knight on e5 AND the g2 pawn. White can't save both!",
        opponentResponses: {
          main: {
            move: 'e5f7',
            explanation: "White tries Nxf7 to fork... but they're walking into the trap!",
          }
        }
      },
      {
        moveNumber: 5,
        playerMove: 'g5g2',
        explanation: "Take the g2 pawn! Now the rook on h1 is hanging and f3 square is calling...",
        opponentResponses: {
          main: { move: 'h1f1', explanation: "White saves the rook. But it's too late..." }
        }
      },
      {
        moveNumber: 6,
        playerMove: 'g2e4',
        explanation: "Queen to e4+ — CHECK! Forcing the bishop to block...",
        opponentResponses: {
          main: { move: 'c4e2', explanation: "Bishop blocks on e2. Now the deadly finish..." }
        }
      },
      {
        moveNumber: 7,
        playerMove: 'd4f3',
        explanation: "⚡ Nf3# — SMOTHERED MATE! The knight on f3 delivers checkmate. The king is surrounded by its own pieces! 👑🔥",
        isCheckmate: true,
      }
    ],
    trapLine: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'c6d4', 'f3e5', 'd8g5', 'e5f7', 'g5g2', 'h1f1', 'g2e4', 'c4e2', 'd4f3'],
    defenseLine: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'c6d4', 'f3d4', 'e5d4'],
  },

  // ==================== #5 LÉGAL'S MATE ====================
  {
    id: 'legals-mate',
    name: "Légal's Mate",
    emoji: '💀',
    severity: 4,
    totalMoves: 7,
    description: 'Sacrifice your QUEEN to deliver a stunning checkmate!',
    playerColor: 'white',
    difficulty: 'intermediate',
    successRate: 'Very high when opponent takes the queen',
    keyIdea: 'Sacrifice the queen on purpose — if they take it, checkmate follows!',
    steps: [
      {
        moveNumber: 1,
        playerMove: 'e2e4',
        explanation: "Open with e4 — control the center!",
        opponentResponses: {
          main: { move: 'e7e5', explanation: "Standard response." }
        }
      },
      {
        moveNumber: 2,
        playerMove: 'g1f3',
        explanation: "Develop the knight. Attacking e5.",
        opponentResponses: {
          main: { move: 'd7d6', explanation: "Black plays d6 — the Philidor Defense. This sets up our trap!" }
        }
      },
      {
        moveNumber: 3,
        playerMove: 'f1c4',
        explanation: "Bishop to c4 — aiming at f7 as always!",
        opponentResponses: {
          main: { move: 'c8g4', explanation: "Black pins our knight to the queen. They think they're clever... 😈" }
        }
      },
      {
        moveNumber: 4,
        playerMove: 'b1c3',
        explanation: "Develop the second knight. Building up quietly...",
        opponentResponses: {
          main: { move: 'g7g6', explanation: "Black plays g6, planning to develop the bishop. Not seeing the danger." }
        }
      },
      {
        moveNumber: 5,
        playerMove: 'f3e5',
        explanation: "💀 SACRIFICE TIME! Nxe5 — offering the QUEEN! If Black takes Bxd1, it's CHECKMATE incoming!",
        opponentResponses: {
          main: {
            move: 'g4d1',
            explanation: "They took the queen! 🎯 They think they've won... but watch what happens!",
          },
          defense: {
            move: 'g4e6',
            explanation: "🛡️ Black retreats the bishop instead of taking the queen. Smart! Play Bxe6 fxe6 and you're up material.",
            isDefense: true,
            planB: "Take on e6 with the bishop. After fxe6 you have a great position with the damaged pawn structure."
          }
        }
      },
      {
        moveNumber: 6,
        playerMove: 'c4f7',
        explanation: "Bishop takes f7 — CHECK! The king must move...",
        opponentResponses: {
          main: { move: 'e8e7', explanation: "King goes to e7. Only legal move. And now..." }
        }
      },
      {
        moveNumber: 7,
        playerMove: 'c3d5',
        explanation: "⚡ Nd5# — CHECKMATE! The knight delivers mate on d5! The king is trapped. You sacrificed a queen and STILL won! 👑🔥",
        isCheckmate: true,
      }
    ],
    trapLine: ['e2e4', 'e7e5', 'g1f3', 'd7d6', 'f1c4', 'c8g4', 'b1c3', 'g7g6', 'f3e5', 'g4d1', 'c4f7', 'e8e7', 'c3d5'],
    defenseLine: ['e2e4', 'e7e5', 'g1f3', 'd7d6', 'f1c4', 'c8g4', 'b1c3', 'g7g6', 'f3e5', 'g4e6'],
  },

  // ==================== #6 ENGLUND GAMBIT TRAP ====================
  {
    id: 'englund-gambit',
    name: 'Englund Gambit Trap',
    emoji: '🔥',
    severity: 4,
    totalMoves: 5,
    description: 'Win a full rook in 5 moves against d4 players!',
    playerColor: 'black',
    difficulty: 'beginner',
    successRate: 'Works against players who play Bf4 naturally',
    keyIdea: 'Sacrifice a pawn, then Qb4+ forks the king and b2 pawn, winning the rook on a1',
    steps: [
      {
        moveNumber: 1,
        playerMove: null,
        explanation: "White opens with d4. Time for the Englund Gambit!",
        opponentResponses: {
          main: { move: 'd2d4', explanation: "White plays d4. Now we spring the gambit!", isOpponentFirst: true }
        }
      },
      {
        moveNumber: 1,
        playerMove: 'e7e5',
        explanation: "💀 THE GAMBIT! Offer the e5 pawn. White almost always takes it.",
        opponentResponses: {
          main: { move: 'd4e5', explanation: "White takes. Down a pawn, but the trap is set!" }
        }
      },
      {
        moveNumber: 2,
        playerMove: 'b8c6',
        explanation: "Develop the knight toward e5. Building pressure.",
        opponentResponses: {
          main: { move: 'g1f3', explanation: "White develops normally. Doesn't suspect a thing." }
        }
      },
      {
        moveNumber: 3,
        playerMove: 'd8e7',
        explanation: "Queen to e7 — putting pressure on e5 and setting the trap...",
        opponentResponses: {
          main: {
            move: 'c1f4',
            explanation: "Bf4?? WHITE FALLS INTO THE TRAP! They're defending e5 but leaving b4 open! 😈",
          },
          defense: {
            move: 'b1c3',
            explanation: "🛡️ White develops the knight instead. No immediate trap. Play normally and try to regain the pawn.",
            isDefense: true,
            planB: "Play Qxe5 to get the pawn back, or develop with Nf6 and play for activity."
          }
        }
      },
      {
        moveNumber: 4,
        playerMove: 'e7b4',
        explanation: "⚡ Qb4+ CHECK! The queen forks the king AND the b2 pawn. After the king moves, Qxb2 wins the ROOK on a1! 🔥👑",
        isTrapComplete: true,
      }
    ],
    trapLine: ['d2d4', 'e7e5', 'd4e5', 'b8c6', 'g1f3', 'd8e7', 'c1f4', 'e7b4'],
    defenseLine: ['d2d4', 'e7e5', 'd4e5', 'b8c6', 'g1f3', 'd8e7', 'b1c3'],
  },

  // ==================== #7 BUDAPEST GAMBIT TRAP ====================
  {
    id: 'budapest-gambit',
    name: 'Budapest Gambit Trap',
    emoji: '🎯',
    severity: 3,
    totalMoves: 6,
    description: 'Aggressive counter to Queen Pawn openings. Knight sacrifice wins!',
    playerColor: 'black',
    difficulty: 'intermediate',
    successRate: 'Works against unprepared d4 players',
    keyIdea: 'After dxe5 Ng4, if White plays e3 then Nxe3! fxe3 Qh4+ wins',
    steps: [
      {
        moveNumber: 1,
        playerMove: null,
        explanation: "White opens d4.",
        opponentResponses: {
          main: { move: 'd2d4', explanation: "Queen's pawn opening.", isOpponentFirst: true }
        }
      },
      {
        moveNumber: 1,
        playerMove: 'g8f6',
        explanation: "Develop the knight to f6. Normal move, hiding our gambit plans.",
        opponentResponses: {
          main: { move: 'c2c4', explanation: "White plays c4 — the Queen's Gambit setup. Now we strike!" }
        }
      },
      {
        moveNumber: 2,
        playerMove: 'e7e5',
        explanation: "💀 THE BUDAPEST GAMBIT! Sacrifice the e-pawn to get active pieces!",
        opponentResponses: {
          main: { move: 'd4e5', explanation: "White takes. Now the knight jumps!" }
        }
      },
      {
        moveNumber: 3,
        playerMove: 'f6g4',
        explanation: "Knight to g4! Attacking e5 and eyeing e3 for a sacrifice!",
        opponentResponses: {
          main: {
            move: 'e2e3',
            explanation: "e3?? THE BLUNDER! White tries to protect but opens the door to destruction! 😈",
          },
          defense: {
            move: 'c1f4',
            explanation: "🛡️ Bf4 defends e5 properly. Play Nc6, Bb4+ and get active. Good game ahead.",
            isDefense: true,
            planB: "Play Nc6 then Bb4+ for activity. You'll regain the pawn soon with good piece play."
          }
        }
      },
      {
        moveNumber: 4,
        playerMove: 'g4e3',
        explanation: "⚡ SACRIFICE! Nxe3! Destroying White's pawn structure. If fxe3...",
        opponentResponses: {
          main: { move: 'f2e3', explanation: "fxe3 — the king is now exposed on the f-file!" }
        }
      },
      {
        moveNumber: 5,
        playerMove: 'd8h4',
        explanation: "⚡ Qh4+! CHECK! The king is caught in the open. White's position is destroyed — you'll win back material with a huge attack! 🔥",
        isTrapComplete: true,
      }
    ],
    trapLine: ['d2d4', 'g8f6', 'c2c4', 'e7e5', 'd4e5', 'f6g4', 'e2e3', 'g4e3', 'f2e3', 'd8h4'],
    defenseLine: ['d2d4', 'g8f6', 'c2c4', 'e7e5', 'd4e5', 'f6g4', 'c1f4'],
  },

  // ==================== #8 STAFFORD GAMBIT ====================
  {
    id: 'stafford-gambit',
    name: 'Stafford Gambit',
    emoji: '🐍',
    severity: 3,
    totalMoves: 7,
    description: "Eric Rosen's favorite! Multiple sneaky traps after sacrificing a pawn.",
    playerColor: 'black',
    difficulty: 'intermediate',
    successRate: 'Very tricky — multiple trap lines',
    keyIdea: 'After Nxe5 Nc6, sacrifice the knight for rapid piece development and mating threats',
    steps: [
      {
        moveNumber: 1,
        playerMove: null,
        explanation: "White opens e4.",
        opponentResponses: {
          main: { move: 'e2e4', explanation: "Standard e4 opening.", isOpponentFirst: true }
        }
      },
      {
        moveNumber: 1,
        playerMove: 'e7e5',
        explanation: "Play e5. Setting up the Petrov...",
        opponentResponses: {
          main: { move: 'g1f3', explanation: "White attacks e5." }
        }
      },
      {
        moveNumber: 2,
        playerMove: 'g8f6',
        explanation: "Nf6 — the Petrov Defense. But we have something tricky planned!",
        opponentResponses: {
          main: { move: 'f3e5', explanation: "White takes e5. Now for the Stafford!" }
        }
      },
      {
        moveNumber: 3,
        playerMove: 'b8c6',
        explanation: "💀 THE STAFFORD GAMBIT! Instead of the normal Nxe4 or d6, we develop the knight! Giving up a pawn for CHAOS.",
        opponentResponses: {
          main: { move: 'e5c6', explanation: "White takes the knight. Now watch..." },
          defense: {
            move: 'e5f3',
            explanation: "🛡️ White retreats. You're down a pawn but have decent activity. Play d5!",
            isDefense: true,
            planB: "Play d5 to open the center. Your pieces are active and you have good compensation."
          }
        }
      },
      {
        moveNumber: 4,
        playerMove: 'd7c6',
        explanation: "Recapture with the d-pawn! Now the c8 bishop and d8 queen are both free!",
        opponentResponses: {
          main: { move: 'd2d3', explanation: "White plays d3. A common and natural move — but the trap is set! 😈" }
        }
      },
      {
        moveNumber: 5,
        playerMove: 'f8c5',
        explanation: "Bishop to c5! Targeting f2 — the weak square next to White's king. THREATS everywhere!",
        opponentResponses: {
          main: { move: 'c1g5', explanation: "White pins the knight. But we have Ng4 coming..." }
        }
      },
      {
        moveNumber: 6,
        playerMove: 'f6g4',
        explanation: "⚡ Ng4! Threatening Bxf2+ and Nxf2 fork. Also threatening Qb6 to attack f2 AND b2. White is in deep trouble! Multiple winning ideas! 🔥",
        isTrapComplete: true,
      }
    ],
    trapLine: ['e2e4', 'e7e5', 'g1f3', 'g8f6', 'f3e5', 'b8c6', 'e5c6', 'd7c6', 'd2d3', 'f8c5', 'c1g5', 'f6g4'],
    defenseLine: ['e2e4', 'e7e5', 'g1f3', 'g8f6', 'f3e5', 'b8c6', 'e5f3'],
  },

  // ==================== #9 ITALIAN GAME TRAP ====================
  {
    id: 'italian-trap',
    name: 'Italian Game Trap',
    emoji: '🏹',
    severity: 3,
    totalMoves: 8,
    description: "Win a pawn and wreck White's center in the popular Italian Game.",
    playerColor: 'black',
    difficulty: 'advanced',
    successRate: 'Works against mechanical Italian Game players',
    keyIdea: 'Let White overextend in the center, then Bb4+ and Nxe4 wins material',
    steps: [
      {
        moveNumber: 1,
        playerMove: null,
        explanation: "White opens e4.",
        opponentResponses: {
          main: { move: 'e2e4', explanation: "Standard opening.", isOpponentFirst: true }
        }
      },
      {
        moveNumber: 1,
        playerMove: 'e7e5',
        explanation: "Play e5.",
        opponentResponses: {
          main: { move: 'g1f3', explanation: "Knight develops." }
        }
      },
      {
        moveNumber: 2,
        playerMove: 'b8c6',
        explanation: "Develop the knight. Defending e5.",
        opponentResponses: {
          main: { move: 'f1c4', explanation: "The Italian Game! White's most popular setup." }
        }
      },
      {
        moveNumber: 3,
        playerMove: 'f8c5',
        explanation: "Mirror with Bc5. The Giuoco Piano — Italian for 'Quiet Game'. But it won't be quiet!",
        opponentResponses: {
          main: { move: 'c2c3', explanation: "White plays c3, preparing d4 to grab the center." }
        }
      },
      {
        moveNumber: 4,
        playerMove: 'g8f6',
        explanation: "Develop the knight and attack e4!",
        opponentResponses: {
          main: { move: 'd2d4', explanation: "White pushes d4 — the big center push. This is what we wanted!" }
        }
      },
      {
        moveNumber: 5,
        playerMove: 'e5d4',
        explanation: "Take the d4 pawn! Opening the center.",
        opponentResponses: {
          main: { move: 'c3d4', explanation: "White recaptures. Now the e4 pawn is looking vulnerable..." }
        }
      },
      {
        moveNumber: 6,
        playerMove: 'c5b4',
        explanation: "💀 Bb4+ CHECK! This forces White to deal with the check before defending e4!",
        opponentResponses: {
          main: { move: 'b1c3', explanation: "White blocks with the knight. But now that knight can't protect e4... 😈" },
          defense: {
            move: 'c1d2',
            explanation: "🛡️ Bd2 blocks the check. Play Bxd2+ Nbxd2 and e4 is still under pressure.",
            isDefense: true,
            planB: "Take on d2, then play d5 to open the center. You have a good game."
          }
        }
      },
      {
        moveNumber: 7,
        playerMove: 'f6e4',
        explanation: "⚡ Nxe4! Grab the center pawn! The knight on c3 is pinned by the bishop, so it can't recapture. You're up a pawn with a great position! 🔥",
        isTrapComplete: true,
      }
    ],
    trapLine: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'c2c3', 'g8f6', 'd2d4', 'e5d4', 'c3d4', 'c5b4', 'b1c3', 'f6e4'],
    defenseLine: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'c2c3', 'g8f6', 'd2d4', 'e5d4', 'c3d4', 'c5b4', 'c1d2'],
  },

  // ==================== #10 CARO-KANN SMOTHERED MATE ====================
  {
    id: 'caro-kann-smother',
    name: 'Caro-Kann Smothered Mate',
    emoji: '💣',
    severity: 2,
    totalMoves: 6,
    description: 'A brutal smothered mate in the Caro-Kann! Knight on d6 delivers.',
    playerColor: 'white',
    difficulty: 'advanced',
    successRate: 'Less common but absolutely devastating',
    keyIdea: 'If Black develops knights in wrong order (Nd7 then Ngf6), Nd6# is smothered mate',
    steps: [
      {
        moveNumber: 1,
        playerMove: 'e2e4',
        explanation: "Open with e4!",
        opponentResponses: {
          main: { move: 'c7c6', explanation: "The Caro-Kann Defense! A solid but slightly passive setup." }
        }
      },
      {
        moveNumber: 2,
        playerMove: 'd2d4',
        explanation: "Grab the center with d4. Classical development.",
        opponentResponses: {
          main: { move: 'd7d5', explanation: "Black challenges the center. Standard Caro-Kann." }
        }
      },
      {
        moveNumber: 3,
        playerMove: 'b1c3',
        explanation: "Develop the knight! Protecting e4.",
        opponentResponses: {
          main: { move: 'd5e4', explanation: "Black takes the pawn." }
        }
      },
      {
        moveNumber: 4,
        playerMove: 'c3e4',
        explanation: "Recapture with the knight! Now it's a powerful centralized knight.",
        opponentResponses: {
          main: {
            move: 'b8d7',
            explanation: "Nd7?! Black develops the knight to d7 first. This is the mistake! The king's escape routes are blocked. 😈",
          },
          defense: {
            move: 'c8f5',
            explanation: "🛡️ Bf5! The correct Caro-Kann move. Play Ng3 Bg6 and it's a normal game.",
            isDefense: true,
            planB: "Play Ng3 to attack the bishop. Continue with normal development. Still a solid position."
          }
        }
      },
      {
        moveNumber: 5,
        playerMove: 'd1e2',
        explanation: "💀 Queen to e2! Setting the deadly trap. If Black now plays Ngf6, trying to kick our knight...",
        opponentResponses: {
          main: {
            move: 'g8f6',
            explanation: "Ngf6?? THE BLUNDER! Black tries to challenge the knight but they've just sealed their own coffin! 💀",
          },
          defense: {
            move: 'e7e6',
            explanation: "🛡️ e6 is safer — gives the king room. Play Nf3 and develop. Good game.",
            isDefense: true,
            planB: "Play Nf3 and develop pieces. You have a nice center and good position."
          }
        }
      },
      {
        moveNumber: 6,
        playerMove: 'e4d6',
        explanation: "⚡ Nd6# — SMOTHERED CHECKMATE!! The knight on d6 delivers mate! The king is completely surrounded by its own pieces — pawns on c6 and e7, knight on d7, bishop on f8. Nowhere to run! 👑🔥💀",
        isCheckmate: true,
      }
    ],
    trapLine: ['e2e4', 'c7c6', 'd2d4', 'd7d5', 'b1c3', 'd5e4', 'c3e4', 'b8d7', 'd1e2', 'g8f6', 'e4d6'],
    defenseLine: ['e2e4', 'c7c6', 'd2d4', 'd7d5', 'b1c3', 'd5e4', 'c3e4', 'c8f5'],
  },
];

export default killerOpenings;
