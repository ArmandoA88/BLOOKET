# Quiz Arena (Blooket-Style Multiplayer)

A localhost-first realtime classroom quiz game with host controls and student join codes.

## Features

- Host creates game room with 6-character join code
- Student join screen for nickname + game code
- Main page shortcut to launch mini-game testing quickly
- Hidden blook unlock economy with themed packs: Sports, Anime, Superheroes, Science, Nature, Mythic
- First pack open is free, then packs cost coins (default: 20)
- Coins are awarded after each game from score + correct answers + final rank
- Duplicate blooks can be sold back at 30% of pack cost
- Students pick from unlocked blooks before joining (locked once the game starts)
- Quiz sets including `Multiplication 1-Digit` (default) and `General Knowledge`
- Teachers and students can upload new quiz sets from `.csv`, `.xlsx`, or `.xls`
- Realtime lobby with player list and kick support
- Timed multiple-choice questions
- Speed + streak scoring engine
- Blooket-style modes: `Classic Quiz`, `Gold Quest`, `Crypto Hack`, `Fishing Frenzy`, `Monster Brawl`
- Interactive mini-games after every question for all students: Soccer Shootout, Tap Rush, Reaction Duel, Sequence Memory, Obstacle Dodge, Precision Stop, Word Scramble
- Soccer mini-game includes animated fussball-style visuals and interactive striker cards
- Host can trigger mini-game test runs directly from lobby (no question required) for fast classroom checks
- Host can choose mini-game rotation (`Fixed`, `Random`, `Most Played First`, `Soccer Only`, `Disable`) and mini-game duration
- Host sees a different live progress dashboard for each mini-game type
- Host and student UI show mini-game trend stats (`Most Played` and `Most Matched`)
- Optional Google authentication for host access (students can still play as guests)
- Auto round progression and live leaderboard updates
- Final rankings / game finished screen

## Google Authentication (Optional)

If you want Google login enabled:

1. Create OAuth credentials in Google Cloud Console (Web application).
2. Add Authorized redirect URI(s):
   - `http://localhost:3000/auth/google/callback` (local testing)
   - Your LAN/proxy URL callback if students connect from Chromebooks (for example `https://your-domain/auth/google/callback`)
3. Set environment variables before starting server:

```bash
set GOOGLE_CLIENT_ID=your_google_client_id
set GOOGLE_CLIENT_SECRET=your_google_client_secret
set SESSION_SECRET=replace_with_long_random_secret
set GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

`GOOGLE_CALLBACK_URL` is optional. If omitted, the server auto-detects callback host from the incoming request.

If `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are not set, host login stays disabled and the app still supports guest student play.

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

### Chromebook Access With Google Auth Enabled

1. Configure Google OAuth callback URL for the exact public URL students will use.
2. If students are not on `localhost`, use an HTTPS URL (reverse proxy/tunnel/domain) and set `GOOGLE_CALLBACK_URL` to that callback.
3. Share that same HTTPS base URL with students so sign-in, callback, and socket sessions stay on one origin.

## Classroom Flow

1. Teacher opens host page and creates a room.
2. Students open play page and join with the room code.
3. Teacher starts game and controls rounds.
4. Students answer questions, then all students play a mini-game each round.
5. Teacher can use **Mini-Game Test** to run mini-games without questions.
6. Final leaderboard appears at game end.

## Notes

- Match state is in-memory (active games reset when server restarts).
- Account economy data is persisted locally in `data/accounts.json`.
- Uploaded quizzes are persisted locally in `data/custom-quizzes.json`.
- Mini-game popularity stats are persisted locally in `data/minigame-stats.json`.
- Designed for local network/localhost use first.
