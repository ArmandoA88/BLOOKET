# Quiz Arena (Blooket-Style Multiplayer)

A localhost-first realtime classroom quiz game with host controls and student join codes.

## Features

- Host creates game room with 6-character join code
- Student join screen for nickname + game code
- Main page shortcut to launch mini-game testing quickly
- Blook picker with themed packs: Sports, Anime, Science, Nature, Mythic
- Students pick their blook before joining (locked once the game starts)
- Quiz sets including `Multiplication 1-Digit` (default) and `General Knowledge`
- Realtime lobby with player list and kick support
- Timed multiple-choice questions
- Speed + streak scoring engine
- Blooket-style modes: `Classic Quiz`, `Gold Quest`, `Crypto Hack`, `Fishing Frenzy`, `Monster Brawl`
- Interactive mini-games after every question for all students: Soccer Shootout with goalkeeper, Tap Rush, Sequence Memory, Precision Stop
- Soccer mini-game includes animated fussball-style visuals and interactive striker cards
- Host can trigger mini-game test runs directly from lobby (no question required) for fast classroom checks
- Host can choose mini-game rotation (`Fixed`, `Random`, `Soccer Only`, `Disable`) and mini-game duration
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

Watch with your own host room (bots only):

```bash
set DEMO_CODE=ABC123 && npm run demo
```

3. Open browser:

- Home: `http://localhost:3000/`
- Host: `http://localhost:3000/host.html`
- Student: `http://localhost:3000/play.html`
- Mini-game quick test link: `http://localhost:3000/host.html?quick=minigame#miniGameTestPanel`

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
4. Students answer questions, then all students play a mini-game each round.
5. Teacher can use **Mini-Game Test** to run mini-games without questions.
6. Final leaderboard appears at game end.

## Notes

- State is in-memory (resets when server restarts).
- Designed for local network/localhost use first.
