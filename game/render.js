// Renders game state as an SVG styled like the GitHub contributions graph
// (dark Primer theme: same cell size, radius, gap, and green scale).

const { WIDTH, HEIGHT, pieceCells, ghostPiece } = require('./engine');

const CELL = 18;
const GAP = 4;
const PITCH = CELL + GAP;

const C = {
  bg: '#140A2E',
  border: '#3B2A63',
  empty: '#241247',
  text: '#F3E9FF',
  muted: '#A78BC7',
  // Aurora scale: deep violet → periwinkle → lilac → pink (dim → bright).
  greens: ['#4C1D95', '#7C3AED', '#C084FC', '#F0A6FF'],
};

// Locked pieces map to the four aurora shades.
const PIECE_GREEN = { Z: 0, T: 1, L: 1, O: 2, J: 2, S: 3, I: 3 };

function cellRect(px, py, fill, stroke = 'rgba(240,246,252,0.07)') {
  return `<rect x="${px}" y="${py}" width="${CELL}" height="${CELL}" rx="3" fill="${fill}" stroke="${stroke}"/>`;
}

function miniPiece(type, ox, oy) {
  const { PIECES } = require('./engine');
  const cells = PIECES[type].cells;
  const s = 11, g = 3;
  return cells
    .map(([x, y]) => `<rect x="${ox + x * (s + g)}" y="${oy + y * (s + g)}" width="${s}" height="${s}" rx="2" fill="${C.greens[3]}"/>`)
    .join('');
}

function render(state, opts = {}) {
  const boardX = 24, boardY = 64;
  const boardW = WIDTH * PITCH - GAP;
  const boardH = HEIGHT * PITCH - GAP;
  const panelX = boardX + boardW + 28;
  const width = panelX + 168;
  const height = boardY + boardH + 56;

  const cells = [];
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const t = state.board[y][x];
      const fill = t ? C.greens[PIECE_GREEN[t]] : C.empty;
      cells.push(cellRect(boardX + x * PITCH, boardY + y * PITCH, fill));
    }
  }

  const overlays = [];
  if (state.piece) {
    const ghost = ghostPiece(state);
    if (ghost && ghost.y !== state.piece.y) {
      for (const [x, y] of pieceCells({ ...ghost, type: state.piece.type, rot: state.piece.rot })) {
        if (y >= 0) overlays.push(
          `<rect x="${boardX + x * PITCH}" y="${boardY + y * PITCH}" width="${CELL}" height="${CELL}" rx="3" fill="none" stroke="${C.greens[1]}" stroke-dasharray="3,3"/>`
        );
      }
    }
    for (const [x, y] of pieceCells(state.piece)) {
      if (y >= 0) overlays.push(cellRect(boardX + x * PITCH, boardY + y * PITCH, C.greens[3], 'rgba(240,246,252,0.25)'));
    }
  }

  const nextType = state.queue[0];
  const legendX = boardX;
  const legendY = boardY + boardH + 26;
  const legend = [
    `<text x="${legendX}" y="${legendY + 10}" class="muted">Less</text>`,
    ...[C.empty, ...C.greens].map((fill, i) =>
      `<rect x="${legendX + 34 + i * 15}" y="${legendY}" width="11" height="11" rx="2" fill="${fill}" stroke="rgba(240,246,252,0.07)"/>`),
    `<text x="${legendX + 34 + 5 * 15 + 6}" y="${legendY + 10}" class="muted">More</text>`,
  ];

  const status = state.gameOver
    ? '💀 Your streak ended — open a “new” issue to restart'
    : `Last move: ${state.lastMove}`;

  const topPlayers = Object.entries(state.players || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([name, n], i) => `<text x="${panelX}" y="${boardY + 236 + i * 20}" class="muted">${i + 1}. @${esc(name)} · ${n} moves</text>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    text { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 12px; fill: ${C.text}; }
    .h1 { font-size: 16px; font-weight: 600; }
    .muted { fill: ${C.muted}; }
    .num { font-size: 22px; font-weight: 700; fill: ${C.greens[3]}; }
    .label { font-size: 11px; fill: ${C.muted}; text-transform: uppercase; letter-spacing: .5px; }
  </style>
  <rect width="${width}" height="${height}" rx="8" fill="${C.bg}" stroke="${C.border}"/>
  <text x="${boardX}" y="30" class="h1">${state.score.toLocaleString('en-US')} contributions in the current game</text>
  <text x="${boardX}" y="50" class="muted">${esc(status)}</text>
  ${cells.join('\n  ')}
  ${overlays.join('\n  ')}
  ${legend.join('\n  ')}
  <text x="${panelX}" y="${boardY + 12}" class="label">Next</text>
  ${nextType ? miniPiece(nextType, panelX, boardY + 24) : ''}
  <text x="${panelX}" y="${boardY + 112}" class="label">Score</text>
  <text x="${panelX}" y="${boardY + 136}" class="num">${state.score.toLocaleString('en-US')}</text>
  <text x="${panelX}" y="${boardY + 168}" class="label">Rows cleared</text>
  <text x="${panelX}" y="${boardY + 192}" class="num">${state.lines}</text>
  <text x="${panelX}" y="${boardY + 220}" class="label">Top movers</text>
  ${topPlayers}
</svg>`;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { render };
