# API

This folder is reserved for the future backend boundary.

Do not add a service here until the game needs server-owned behavior such as hidden answers, leaderboards, accounts, admin publishing, or server-side analytics. A likely first implementation would be a small FastAPI app with routes like `GET /puzzles/today` and `POST /guesses`.