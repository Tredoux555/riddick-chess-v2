// Chess sound effects using Web Audio API as fallback
const sounds = {
  move: null,
  capture: null,
  castle: null,
  check: null,
  gameEnd: null,
  gameStart: null
};

// Web Audio API context for fallback beeps
let audioCtx = null;

const getAudioCtx = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
};

const playBeep = (freq, duration, type = 'sine', volume = 0.3) => {
  try {
    const ctx = getAudioCtx();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {}
};

// Preload sounds
export const preloadSounds = () => {
  try {
    sounds.move = new Audio('/sounds/move-self.mp3');
    sounds.capture = new Audio('/sounds/capture.mp3');
    sounds.castle = new Audio('/sounds/castle.mp3');
    sounds.check = new Audio('/sounds/move-check.mp3');
    sounds.gameEnd = new Audio('/sounds/game-end.mp3');
    sounds.gameStart = new Audio('/sounds/game-start.mp3');

    Object.values(sounds).forEach(sound => {
      if (sound) {
        sound.load();
        sound.volume = 0.5;
      }
    });
  } catch (e) {}
};

export const playSound = (type) => {
  const sound = sounds[type];
  if (sound && sound.readyState >= 2) {
    sound.currentTime = 0;
    sound.play().catch(() => {
      // Fallback to beep
      playFallback(type);
    });
  } else {
    playFallback(type);
  }
};

const playFallback = (type) => {
  switch (type) {
    case 'move':     playBeep(440, 0.08); break;
    case 'capture':  playBeep(220, 0.15, 'sawtooth', 0.2); break;
    case 'castle':   playBeep(523, 0.1); setTimeout(() => playBeep(659, 0.1), 100); break;
    case 'check':    playBeep(880, 0.12, 'square', 0.2); break;
    case 'gameEnd':  playBeep(330, 0.3); setTimeout(() => playBeep(262, 0.4), 300); break;
    case 'gameStart':playBeep(523, 0.1); setTimeout(() => playBeep(659, 0.15), 120); break;
    default: break;
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
