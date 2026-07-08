# Setup guide

Two games ship in this repo:

1. **In-README Tetris** — turn-based, played by opening issues, rendered by GitHub Actions into `assets/board.svg`.
2. **Live Tetris** (`docs/index.html`) — real-time keyboard/touch game served by GitHub Pages.

## 1. Put it on your profile

Your profile README lives in a repo named after your username (e.g. `github.com/octocat/octocat`).

1. Create that repo if you don't have it, and copy everything in this folder into it.
2. Find & replace every `YOURNAME` in `README.md` with your GitHub username (7 occurrences).
3. Commit and push to `main`.

## 2. Enable the Actions game

1. In the repo: **Settings → Actions → General → Workflow permissions** → select **Read and write permissions** → Save. (The workflow commits the updated board back to the repo.)
2. Make sure **Issues** are enabled: **Settings → General → Features → Issues**.
3. Test it: click any control link in your README (e.g. ⬅️ Left), submit the issue, and watch the **Actions** tab. Within ~30 seconds the bot plays the move, commits the new board, comments on your issue, and closes it.

Moves are issues titled `tetris|left`, `tetris|right`, `tetris|rotate`, `tetris|down`, `tetris|drop`, or `tetris|new` (restart, only after game over). Anything else is ignored.

### Gravity (optional)

`.github/workflows/gravity.yml` drops the active piece one row every 30 minutes so the game keeps moving. Notes:

- GitHub's scheduler is best-effort; ticks may run late.
- GitHub **disables scheduled workflows after ~60 days of repo inactivity** — re-enable from the Actions tab, or just rely on players' moves.
- Delete the file for pure turn-based play.

## 3. Enable the live game (GitHub Pages)

1. **Settings → Pages → Build and deployment** → Source: **Deploy from a branch** → Branch: `main`, folder: `/docs` → Save.
2. After a minute, the game is live at `https://YOURNAME.github.io/YOURNAME/`.
3. The README's "Play the live version" link already points there once you've replaced `YOURNAME`.

Controls: ← → move · ↑/X rotate · Z counter-rotate · ↓ soft drop · Space hard drop · C hold · P pause · R restart. Touch buttons appear automatically on mobile.

## Local testing

No dependencies needed — just Node 18+:

```bash
node game/play.js "tetris|new" "you"     # start a game
node game/play.js "tetris|drop" "you"    # play a move
open assets/board.svg                     # see the board
open docs/index.html                      # play the live game locally
```

## How it works

- `game/engine.js` — pure Tetris logic (7-bag randomizer with a seeded RNG, wall kicks, line clears, 100/300/500/800 scoring).
- `game/render.js` — renders state as an SVG that mimics the GitHub contribution graph (same cell shape, gap, and green scale as the dark Primer theme).
- `game/state.json` — the whole game state; every move is one commit, so the full game history lives in your git log.
- `.github/workflows/tetris.yml` — issue-triggered move handler, serialized with a concurrency group so simultaneous players can't corrupt state.
- `docs/index.html` — standalone real-time version, zero dependencies.
