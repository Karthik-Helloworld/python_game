# Python Campaign

Personal tutor for Karthik. Act I is playable: a short module, three code questions, then the game. The game stays locked until the check is passed. A passed check is 10 Python points. Clearing a level is 40. Boss A is 50.

Later acts are on the map and are not playable in this build.

## Run

From the repo root:

```bash
python3 -m server
```

Open http://127.0.0.1:8765/app/

Act I is the module, the check, and the game. Write and judge are open beside it.

Write the branch: hidden tests decide if the function works. Claude Haiku 4.5 judges the writing when you save an Anthropic key in the page. The key stays in this browser and is sent only to this local server.

Judge this file: a fixed score band says whether you are in the correct judge zone. Then you name the flaws. Haiku judges that list when a key is saved. With no key, a fixed rubric judges both.

Progress and the key are stored in this browser. The key is not written into the repo.

## Tests

```bash
node --test tests/logic.test.js
python3 -m unittest tests/test_judge.py
```
