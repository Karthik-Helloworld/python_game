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

## Video pipeline (Phase 0)

Phase 0 is a scaffold and a Remotion core that sits next to the tutor. It renders one short hello-world video. It does not generate scripts, check facts, publish, or build a queue.

### What exists

- `core/` Remotion project: TypeScript, 1080×1920, 30fps. One composition, `HelloWorld` (4 seconds).
- `core/src/theme.ts` colors, fonts, and spacing. Fonts are system stacks, so render does not download typefaces.
- `core/src/utils.ts` and `core/utils.py` shared helpers. Python video constants match the theme.
- `core/tts.py` Piper TTS, with edge-tts as an optional fallback. If neither is installed, `synthesize` raises `TTSUnavailable`.
- `core/captions.py` word-level captions through faster-whisper, plus SRT helpers. If faster-whisper is missing, `transcribe` raises `CaptionsUnavailable`.
- `.env.example` commented placeholder names only. Nothing in Phase 0 reads them.

Piper and faster-whisper are not installed by `make edu-setup`. The hello-world render does not call them.

### Install

From the repo root, with Node 20+ and Python 3.11+ (this VM has Node 22 and Python 3.12). On Debian or Ubuntu, `python3 -m venv` needs the `python3-venv` package (`sudo apt install python3.12-venv`).

```bash
make edu-setup
```

That creates `.venv`, installs `core/requirements.txt` (no model runtimes), runs `npm install` in `core/`, and downloads Remotion's Chrome headless shell.

### Render the hello-world video

```bash
make edu-render-hello
```

Same command from `core/`: `npm run render:hello`.

Output: `core/out/hello-world.mp4`.

The render uses one Chrome process and software GL so it can run without a GPU.

### Tests

```bash
make edu-test
```

### Mac install (MacBook Air M4, 16GB)

Phase 0 was checked on a Linux cloud VM, where Piper and faster-whisper are stubbed behind the interfaces above. On the Mac, install the tools, then the same make targets:

- Python 3.11
- Node.js 20 or newer
- ffmpeg: `brew install ffmpeg`
- `make edu-setup`
- `make edu-render-hello`

Speech and captions, when you want them:

```bash
.venv/bin/pip install piper-tts edge-tts faster-whisper
.venv/bin/python -m piper.download_voices en_US-lessac-medium
export PIPER_MODEL=/path/to/en_US-lessac-medium.onnx
```

`download_voices` writes `en_US-lessac-medium.onnx` (and its `.json`) into the current directory. Pass `--data-dir` to put them somewhere else. `PIPER_MODEL` must point at that `.onnx` file.

Piper is the primary backend. edge-tts runs only when Piper is not ready; it needs a network at synthesis time. Captions default to faster-whisper `base` on CPU int8 (`WHISPER_MODEL`, `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE`). A standalone Piper 1.2 binary also works: set `PIPER_BIN` and `PIPER_MODEL`. Text is sent on stdin with `--model` and `--output_file`.
