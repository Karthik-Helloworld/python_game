# Python Campaign

Personal tutor for Karthik. Act I is playable: a short module, three code questions, then the game. The game stays locked until the check is passed. A passed check is 10 Python points. Clearing a level is 40. Boss A is 50.

Later acts are on the map and are not playable in this build.

## Run

From the repo root:

```bash
python3 -m http.server 8765
```

Open http://127.0.0.1:8765/app/

Progress is stored in this browser.

## Tests

```bash
node --test tests/logic.test.js
```
