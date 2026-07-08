#!/usr/bin/env node
// Applies one move from an issue title and rewrites state.json,
// assets/board.svg, and the leaderboard section of README.md.
//
// Usage: node game/play.js "tetris|<move>" "<github-username>"
// Moves: left | right | rotate | down | drop | tick | new

const fs = require('fs');
const path = require('path');
const { newGame, applyMove } = require('./engine');
const { render } = require('./render');

const ROOT = path.join(__dirname, '..');
const STATE = path.join(__dirname, 'state.json');
const SVG = path.join(ROOT, 'assets', 'board.svg');
const README = path.join(ROOT, 'README.md');

const VALID = new Set(['left', 'right', 'rotate', 'down', 'drop', 'tick', 'new']);

function main() {
  const title = (process.argv[2] || '').trim().toLowerCase();
  const player = (process.argv[3] || 'anonymous').trim();

  const match = title.match(/^tetris\|([a-z]+)$/);
  if (!match || !VALID.has(match[1])) {
    console.error(`Ignoring unrecognized title: "${title}"`);
    process.exit(78); // neutral-ish: nothing to do
  }
  const move = match[1];

  let state;
  try {
    state = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  } catch {
    state = null;
  }

  if (!state || move === 'new') {
    if (state && !state.gameOver && move === 'new') {
      console.log('Game in progress — "new" only works after game over.');
      process.exit(0);
    }
    state = newGame();
    state.lastMove = `new game (by @${player})`;
  } else {
    const changed = applyMove(state, move);
    state.lastMove = `${move} (by @${player})`;
    if (!changed) state.lastMove += ' — blocked';
  }

  if (player !== 'gravity-bot') {
    state.players = state.players || {};
    state.players[player] = (state.players[player] || 0) + 1;
  }

  fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
  fs.mkdirSync(path.dirname(SVG), { recursive: true });
  fs.writeFileSync(SVG, render(state));
  updateReadme(state);
  console.log(`Applied "${move}" by @${player}. Score: ${state.score}, lines: ${state.lines}, game over: ${state.gameOver}`);
}

function updateReadme(state) {
  if (!fs.existsSync(README)) return;
  let md = fs.readFileSync(README, 'utf8');
  const top = Object.entries(state.players || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, n], i) => `| ${i + 1} | [@${name}](https://github.com/${name}) | ${n} |`)
    .join('\n');
  const table = top
    ? `| # | Player | Moves |\n|---|--------|-------|\n${top}`
    : '_No moves yet — be the first!_';
  md = md.replace(
    /<!--LEADERBOARD:START-->[\s\S]*?<!--LEADERBOARD:END-->/,
    `<!--LEADERBOARD:START-->\n${table}\n<!--LEADERBOARD:END-->`
  );
  md = md.replace(
    /<!--STATS:START-->[\s\S]*?<!--STATS:END-->/,
    `<!--STATS:START-->**${state.score.toLocaleString('en-US')}** contributions · **${state.lines}** rows cleared${state.gameOver ? ' · 💀 game over' : ''}<!--STATS:END-->`
  );
  fs.writeFileSync(README, md);
}

main();
