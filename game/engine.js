// Contribution Tetris — core engine (pure functions over a state object).
// Used by play.js inside GitHub Actions. No dependencies.

const WIDTH = 10;
const HEIGHT = 20;

// Piece shapes in their spawn orientation, as [x, y] cells inside an N x N box.
const PIECES = {
  I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};

const TYPES = Object.keys(PIECES);
const LINE_SCORES = [0, 100, 300, 500, 800];

// --- deterministic RNG (mulberry32) so the game replays identically ---
function rng(state) {
  state.seed = (state.seed + 0x6d2b79f5) >>> 0;
  let t = state.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function refillBag(state) {
  const bag = TYPES.slice();
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng(state) * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  state.queue.push(...bag);
}

function rotatedCells(type, rot) {
  const { size, cells } = PIECES[type];
  let out = cells;
  for (let r = 0; r < ((rot % 4) + 4) % 4; r++) {
    out = out.map(([x, y]) => [size - 1 - y, x]);
  }
  return out;
}

function pieceCells(piece) {
  return rotatedCells(piece.type, piece.rot).map(([x, y]) => [x + piece.x, y + piece.y]);
}

function collides(state, piece) {
  return pieceCells(piece).some(
    ([x, y]) => x < 0 || x >= WIDTH || y >= HEIGHT || (y >= 0 && state.board[y][x])
  );
}

function spawn(state) {
  if (state.queue.length < 8) refillBag(state);
  const type = state.queue.shift();
  const piece = { type, rot: 0, x: 3, y: type === 'I' ? -1 : 0 };
  if (type === 'O') piece.x = 4;
  if (collides(state, piece)) {
    state.gameOver = true;
    state.piece = null;
  } else {
    state.piece = piece;
  }
}

function lockPiece(state) {
  for (const [x, y] of pieceCells(state.piece)) {
    if (y < 0) { state.gameOver = true; state.piece = null; return; }
    state.board[y][x] = state.piece.type;
  }
  // clear lines
  let cleared = 0;
  state.board = state.board.filter((row) => {
    if (row.every(Boolean)) { cleared++; return false; }
    return true;
  });
  while (state.board.length < HEIGHT) state.board.unshift(Array(WIDTH).fill(0));
  const level = Math.floor(state.lines / 10);
  state.lines += cleared;
  state.score += LINE_SCORES[cleared] * (level + 1);
  state.piece = null;
  spawn(state);
}

function newGame(seed) {
  const state = {
    board: Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0)),
    piece: null,
    queue: [],
    seed: (seed ?? Date.now()) >>> 0,
    score: 0,
    lines: 0,
    gameOver: false,
    players: {},
    lastMove: 'new game',
  };
  spawn(state);
  return state;
}

// Attempts a move. Returns true if the state changed.
function applyMove(state, move) {
  if (state.gameOver || !state.piece) return false;
  const p = state.piece;

  switch (move) {
    case 'left':
    case 'right': {
      const dx = move === 'left' ? -1 : 1;
      const test = { ...p, x: p.x + dx };
      if (!collides(state, test)) { state.piece = test; return true; }
      return false;
    }
    case 'rotate': {
      // simple wall kicks: try in place, then shifted
      for (const dx of [0, -1, 1, -2, 2]) {
        const test = { ...p, rot: p.rot + 1, x: p.x + dx };
        if (!collides(state, test)) { state.piece = test; return true; }
      }
      return false;
    }
    case 'down':
    case 'tick': {
      const test = { ...p, y: p.y + 1 };
      if (!collides(state, test)) { state.piece = test; }
      else { lockPiece(state); }
      return true;
    }
    case 'drop': {
      let test = { ...p };
      while (!collides(state, { ...test, y: test.y + 1 })) test.y++;
      state.piece = test;
      state.score += 2 * Math.max(0, test.y - p.y);
      lockPiece(state);
      return true;
    }
    default:
      return false;
  }
}

function ghostPiece(state) {
  if (!state.piece) return null;
  let g = { ...state.piece };
  while (!collides(state, { ...g, y: g.y + 1 })) g.y++;
  return g;
}

module.exports = {
  WIDTH, HEIGHT, PIECES, newGame, applyMove, pieceCells, ghostPiece,
};
