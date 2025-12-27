// Chess sound effects
const sounds = {
  move: null,
  capture: null,
  castle: null,
  check: null,
  gameEnd: null,
  gameStart: null
};

// Preload sounds
export const preloadSounds = () => {
  sounds.move = new Audio('/sounds/move-self.mp3');
  sounds.capture = new Audio('/sounds/capture.mp3');
  sounds.castle = new Audio('/sounds/castle.mp3');
  sounds.check = new Audio('/sounds/move-check.mp3');
  sounds.gameEnd = new Audio('/sounds/game-end.mp3');
  sounds.gameStart = new Audio('/sounds/game-start.mp3');
  
  // Preload all
  Object.values(sounds).forEach(sound => {
    if (sound) {
      sound.load();
      sound.volume = 0.5;
    }
  });
};

export const playSound = (type) => {
  const sound = sounds[type];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }
};

export const playMoveSound = (move, isCheck = false) => {
  if (isCheck) {
    playSound('check');
  } else if (move?.captured) {
    playSound('capture');
  } else if (move?.san?.includes('O-O')) {
    playSound('castle');
  } else {
    playSound('move');
  }
};

export default { preloadSounds, playSound, playMoveSound };
