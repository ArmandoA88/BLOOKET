# Quiz Arena (Blooket-Style Multiplayer)

A localhost-first realtime classroom quiz game with host controls and student join codes.

## Features

- Host creates game room with 6-character join code
- Student join screen for nickname + game code
- Blook picker with themed packs: Sports, Anime, Science, Nature, Mythic
- Realtime lobby with player list and kick support
- Timed multiple-choice questions
- Speed + streak scoring engine
- Blooket-style modes: `Classic Quiz`, `Gold Quest`, `Crypto Hack`, `Fishing Frenzy`, `Monster Brawl`
- Mode event cards: gain, steal, swap, shield, multiplier, loss effects
- Auto round progression and live leaderboard updates
- Final rankings / game finished screen

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start server:

```bash
npm start
```

3. Open browser:

- Home: `http://localhost:3000/`
- Host: `http://localhost:3000/host.html`
- Student: `http://localhost:3000/play.html`

## Classroom Flow

1. Teacher opens host page and creates a room.
2. Students open play page and join with the room code.
3. Teacher starts game and controls rounds.
4. Students answer questions and open chest rewards in Gold mode.
5. Final leaderboard appears at game end.

## Notes

- State is in-memory (resets when server restarts).
- Designed for local network/localhost use first.
