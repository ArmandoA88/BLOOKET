# Quiz Arena (Blooket-Style Multiplayer)

A localhost-first realtime classroom quiz game with host controls and student join codes.

## Features

- Host creates game room with 6-character join code
- Student join screen for nickname + game code
- Blook picker with themed packs: Sports, Anime, Science, Nature, Mythic
- Students pick their blook before joining (locked once the game starts)
- Quiz sets including `Multiplication 1-Digit` (default) and `General Knowledge`
- Realtime lobby with player list and kick support
- Timed multiple-choice questions
- Speed + streak scoring engine
- Blooket-style modes: `Classic Quiz`, `Gold Quest`, `Crypto Hack`, `Fishing Frenzy`, `Monster Brawl`
- Interactive mini-games after every question for all students: Soccer Shootout with goalkeeper, Tap Rush, Sequence Memory, Precision Stop
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

Quick automated verification:

```bash
npm run smoke
```

Full realtime auto demo (host + bot students + auto gameplay):

```bash
npm run demo
```

3. Open browser:

- Home: `http://localhost:3000/`
- Host: `http://localhost:3000/host.html`
- Student: `http://localhost:3000/play.html`

## Chromebook Access (Same Wi-Fi)

1. Start server on teacher PC with `npm start`.
2. Open host page and copy one of the `Student Join Links` shown in the host sidebar.
3. Share that link to students (it includes `?code=XXXXXX` so room code is prefilled).
4. Ensure Windows Firewall allows inbound TCP `3000` on Private networks.
5. Teacher and Chromebooks must be on the same local network (no client isolation).

## Classroom Flow

1. Teacher opens host page and creates a room.
2. Students open play page and join with the room code.
3. Teacher starts game and controls rounds.
4. Students answer questions and open chest rewards in Gold mode.
5. Final leaderboard appears at game end.

## Notes

- State is in-memory (resets when server restarts).
- Designed for local network/localhost use first.
