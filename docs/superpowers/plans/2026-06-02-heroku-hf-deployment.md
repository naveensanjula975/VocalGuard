# VocalGuard — Heroku + Hugging Face Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy VocalGuard FastAPI backend to Heroku (Standard-2X, container stack) with the Wav2Vec2 model hosted on Hugging Face Hub, and wire up GitHub Actions CI/CD so every push to `main` auto-deploys both backend (Heroku) and frontend (Firebase Hosting).

**Architecture:** The Docker image is built and pushed to Heroku Container Registry on every `backend/**` change; the model is NOT baked into the image — it downloads from Hugging Face Hub into `/tmp/hf_model/` on dyno startup via `huggingface_hub.snapshot_download`. Firebase credentials are injected as a base64 env var instead of a file. The frontend reads `VITE_API_BASE_URL` injected at build time.

**Tech Stack:** FastAPI, PyTorch, `transformers`, `huggingface_hub`, Docker, Heroku Container Registry, GitHub Actions, Firebase Hosting, `firebase-tools`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/requirements.txt` | Modify | Strip TF/Keras/torchvision/tensorboard; add `huggingface_hub>=0.23.0` |
| `backend/config/__init__.py` | Modify | Support HF repo ID string as `MODEL_DIR`; expose `HF_TOKEN` |
| `backend/core/detect_deepfake.py` | Modify | Download model from HF Hub if `MODEL_DIR` is a repo ID; load in float16 |
| `backend/services/firebase_config.py` | Modify | Support `FIREBASE_SERVICE_ACCOUNT_JSON` base64 env var |
| `backend/Dockerfile` | Modify | Use `$PORT` env var in CMD instead of hardcoded 8000 |
| `.github/workflows/deploy-backend.yml` | Create | Build + push Docker to Heroku on `backend/**` push to `main` |
| `.github/workflows/deploy-frontend.yml` | Create | Build + Firebase deploy on `frontend/**` push to `main` |

---

## Pre-Work: One-Time Manual Setup

Before running ANY task below, complete these manual steps in your terminal. They are one-time setup that cannot be automated.

### Step 0A — Install tools

```bash
# Heroku CLI (Windows)
winget install --id=Heroku.HerokuCLI

# Hugging Face CLI
pip install huggingface_hub

# Verify
heroku --version
huggingface-cli --version
```

### Step 0B — Log in to Hugging Face and upload the model

```bash
# Login — paste your HF token (read+write scope) when prompted
# Get token at: https://huggingface.co/settings/tokens
huggingface-cli login

# Create a new model repo on HF Hub (do this in browser or CLI):
# https://huggingface.co/new-model  →  name: vocalguard-wav2vec2, Public

# Upload model files (run from repo root)
huggingface-cli upload YOUR_HF_USERNAME/vocalguard-wav2vec2 \
    backend/models/deepfake_audio_model/ .

# Verify upload — should list config.json, model.safetensors, preprocessor_config.json
huggingface-cli repo files YOUR_HF_USERNAME/vocalguard-wav2vec2
```

### Step 0C — Create Heroku app with container stack

```bash
heroku login
heroku create vocalguard-api
heroku stack:set container --app vocalguard-api

# Confirm
heroku info --app vocalguard-api
# Should show: Stack: container
```

### Step 0D — Base64-encode serviceAccountKey.json

```bash
# Windows PowerShell
$bytes = [System.IO.File]::ReadAllBytes("backend/config/serviceAccountKey.json")
[System.Convert]::ToBase64String($bytes) | Set-Clipboard
# Now FIREBASE_SERVICE_ACCOUNT_JSON is in your clipboard
```

### Step 0E — Set Heroku config vars

Replace ALL placeholder values below with your real credentials:

```bash
heroku config:set --app vocalguard-api \
  FIREBASE_WEB_API_KEY="YOUR_FIREBASE_WEB_API_KEY" \
  FIREBASE_SERVICE_ACCOUNT_JSON="YOUR_BASE64_SERVICE_ACCOUNT" \
  ALLOWED_ORIGINS="https://vocalguard-3455b.web.app" \
  APP_ENV="production" \
  MODEL_DIR="YOUR_HF_USERNAME/vocalguard-wav2vec2" \
  HF_TOKEN="YOUR_HF_READ_TOKEN" \
  LOG_LEVEL="INFO"

# Verify
heroku config --app vocalguard-api
```

### Step 0F — Set GitHub repository secrets

In GitHub: repo → Settings → Secrets and variables → Actions → New repository secret

Add these 4 secrets:
| Name | Value |
|---|---|
| `HEROKU_API_KEY` | Heroku account → Settings → API Key (copy the key) |
| `HEROKU_APP_NAME` | `vocalguard-api` |
| `FIREBASE_SERVICE_ACCOUNT` | Full JSON text of `serviceAccountKey.json` (not base64 — raw JSON) |
| `VITE_API_BASE_URL` | `https://vocalguard-api.herokuapp.com` |

---

## Task 1: Slim requirements.txt (remove TF, add huggingface_hub)

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1.1: Remove all TensorFlow and Keras lines**

Open `backend/requirements.txt` and delete these lines entirely:

```
tensorflow==2.19.0
keras==3.9.0
torchvision==0.21.0
torchaudio==2.6.0
tensorboard==2.19.0
tensorboard-data-server==0.7.2
h5py==3.13.0
absl-py==2.2.0
astunparse==1.6.3
flatbuffers==25.2.10
gast==0.6.0
google-pasta==0.2.0
libclang==18.1.1
ml_dtypes==0.5.1
namex==0.0.8
opt_einsum==3.4.0
optree==0.14.1
termcolor==2.5.0
```

Also remove this duplicate line (keras appears twice):
```
keras==3.9.0
```

- [ ] **Step 1.2: Add huggingface_hub**

Find the `# ML Infrastructure & Tools` section in `backend/requirements.txt` and add after `safetensors==0.4.2`:

```
huggingface_hub>=0.23.0
```

- [ ] **Step 1.3: Verify no TF import exists in app code**

```bash
grep -r "import tensorflow\|import tf\|from keras\|from tensorflow" \
    backend/ --include="*.py" --exclude-dir=venv
```

Expected output: empty (no matches). If any match appears, investigate before continuing.

- [ ] **Step 1.4: Commit**

```bash
git add backend/requirements.txt
git commit -m "chore: strip TF/Keras/torchvision from requirements, add huggingface_hub"
```

---

## Task 2: Update config/__init__.py to support HF repo ID as MODEL_DIR

**Files:**
- Modify: `backend/config/__init__.py`

- [ ] **Step 2.1: Replace the MODEL_DIR block**

In `backend/config/__init__.py`, replace this block:

```python
# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent  # …/backend
MODEL_DIR = BASE_DIR / "models" / "deepfake_audio_model"
```

With:

```python
# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent  # …/backend
_model_dir_env = os.getenv("MODEL_DIR", "")
if _model_dir_env and Path(_model_dir_env).exists():
    MODEL_DIR: str | Path = Path(_model_dir_env)
elif _model_dir_env:
    # Treat as Hugging Face repo ID (e.g. "user/vocalguard-wav2vec2")
    MODEL_DIR = _model_dir_env
else:
    MODEL_DIR = BASE_DIR / "models" / "deepfake_audio_model"

HF_TOKEN: str = os.getenv("HF_TOKEN", "")
```

Note: `MODEL_DIR` is now typed as `str | Path`. Callers already pass it through `str()`, so this is backward-compatible.

- [ ] **Step 2.2: Verify config imports still work**

```bash
cd backend
python -c "from config import MODEL_DIR, HF_TOKEN; print('MODEL_DIR:', MODEL_DIR)"
```

Expected output: `MODEL_DIR: backend/models/deepfake_audio_model` (local path, since MODEL_DIR env var is not set in dev).

- [ ] **Step 2.3: Commit**

```bash
git add backend/config/__init__.py
git commit -m "feat(config): support HF repo ID as MODEL_DIR env var"
```

---

## Task 3: Update detect_deepfake.py — HF Hub download + float16

**Files:**
- Modify: `backend/core/detect_deepfake.py`

- [ ] **Step 3.1: Add HF Hub import and resolve_model_path helper**

In `backend/core/detect_deepfake.py`, find the imports block at the top (after the `from transformers import ...` line) and add:

```python
from pathlib import Path
from huggingface_hub import snapshot_download
from config import HF_TOKEN
```

Then add this helper function directly below the imports, before the `DeepfakeAudioDetector` class:

```python
def _resolve_model_path(model_dir) -> str:
    """Return a local filesystem path to model files.

    If model_dir is already a local directory, returns it as-is.
    If it looks like a HF repo ID (contains '/'), downloads to /tmp/hf_model/
    and returns that path.
    """
    if isinstance(model_dir, Path) and model_dir.exists():
        return str(model_dir)
    if isinstance(model_dir, str) and Path(model_dir).exists():
        return model_dir
    # Treat as HF Hub repo ID
    repo_id = str(model_dir)
    local_dir = "/tmp/hf_model"
    logger.info("Downloading model from HF Hub: %s → %s", repo_id, local_dir)
    snapshot_download(
        repo_id=repo_id,
        local_dir=local_dir,
        token=HF_TOKEN or None,
    )
    logger.info("Model download complete")
    return local_dir
```

- [ ] **Step 3.2: Update DeepfakeAudioDetector.__init__ to use float16 and _resolve_model_path**

Find `DeepfakeAudioDetector.__init__` in `backend/core/detect_deepfake.py` and replace it:

```python
def __init__(self, model_path: str) -> None:
    self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("DeepfakeAudioDetector using device: %s", self.device)

    local_path = _resolve_model_path(model_path)

    self.feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(local_path)
    self.model = AutoModelForAudioClassification.from_pretrained(
        local_path,
        use_safetensors=True,
        torch_dtype=torch.float16 if self.device.type == "cpu" else torch.float32,
        low_cpu_mem_usage=True,
    ).to(self.device)

    self.id2label: dict[int, str] = getattr(
        self.model.config, "id2label", {0: "real", 1: "fake"}
    )
    logger.info("Model labels: %s", self.id2label)
```

- [ ] **Step 3.3: Update TransformerDeepfakeDetector loader similarly**

In `backend/core/detect_deepfake.py`, find `get_transformer_detector`:

```python
@lru_cache(maxsize=1)
def get_transformer_detector() -> TransformerDeepfakeDetector:
    logger.info("Lazy-loading Transformer detector into memory...")
    return TransformerDeepfakeDetector(str(MODEL_DIR))
```

Replace with:

```python
@lru_cache(maxsize=1)
def get_transformer_detector() -> TransformerDeepfakeDetector:
    logger.info("Lazy-loading Transformer detector into memory...")
    local_path = _resolve_model_path(MODEL_DIR)
    return TransformerDeepfakeDetector(local_path)
```

And update `get_wav2vec2_detector`:

```python
@lru_cache(maxsize=1)
def get_wav2vec2_detector() -> DeepfakeAudioDetector:
    logger.info("Lazy-loading Wav2Vec2 detector into memory...")
    local_path = _resolve_model_path(MODEL_DIR)
    return DeepfakeAudioDetector(local_path)
```

- [ ] **Step 3.4: Verify the file is importable**

```bash
cd backend
python -c "from core.detect_deepfake import get_wav2vec2_detector; print('import OK')"
```

Expected: `import OK` (model does NOT load at import time — it's lazy).

- [ ] **Step 3.5: Commit**

```bash
git add backend/core/detect_deepfake.py
git commit -m "feat(ml): download model from HF Hub on startup, load in float16 on CPU"
```

---

## Task 4: Update firebase_config.py to support base64 env var credentials

**Files:**
- Modify: `backend/services/firebase_config.py`

- [ ] **Step 4.1: Replace firebase_config.py contents entirely**

Replace the full contents of `backend/services/firebase_config.py` with:

```python
"""
Firebase initialisation.

Call ``initialize_firebase()`` exactly once during application startup
(in ``main.py``).  Supports two credential sources, checked in order:

1. ``FIREBASE_SERVICE_ACCOUNT_JSON`` env var — base64-encoded JSON string.
   Used in production (Heroku) where no filesystem is available.
2. File search — ``config/serviceAccountKey.json`` relative to backend root.
   Used in local development.
"""

import base64
import json
import os
import tempfile
from pathlib import Path

import firebase_admin
from firebase_admin import credentials

from logger import get_logger

logger = get_logger(__name__)

_KEY_SEARCH_PATHS = [
    Path(__file__).resolve().parent.parent / "config" / "serviceAccountKey.json",
    Path(__file__).resolve().parent.parent / "serviceAccountKey.json",
]


def initialize_firebase() -> None:
    """Initialise the Firebase Admin SDK (idempotent)."""
    try:
        firebase_admin.get_app()
        return
    except ValueError:
        pass

    # --- Production path: base64 env var ---
    b64 = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "")
    if b64:
        try:
            json_bytes = base64.b64decode(b64)
            service_account_info = json.loads(json_bytes)
            cred = credentials.Certificate(service_account_info)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase initialised from FIREBASE_SERVICE_ACCOUNT_JSON env var")
            return
        except Exception as exc:
            raise ValueError(
                "FIREBASE_SERVICE_ACCOUNT_JSON is set but could not be decoded. "
                "Ensure it is valid base64-encoded JSON."
            ) from exc

    # --- Development path: file search ---
    key_path = next((p for p in _KEY_SEARCH_PATHS if p.exists()), None)
    if key_path is None:
        raise FileNotFoundError(
            "Firebase credentials not found. Either set FIREBASE_SERVICE_ACCOUNT_JSON "
            "env var (base64-encoded serviceAccountKey.json) or place the file at: "
            + ", ".join(str(p) for p in _KEY_SEARCH_PATHS)
        )

    cred = credentials.Certificate(str(key_path))
    firebase_admin.initialize_app(cred)
    logger.info("Firebase initialised from file: %s", key_path.name)
```

- [ ] **Step 4.2: Verify import**

```bash
cd backend
python -c "from services.firebase_config import initialize_firebase; print('import OK')"
```

Expected: `import OK`

- [ ] **Step 4.3: Commit**

```bash
git add backend/services/firebase_config.py
git commit -m "feat(firebase): support base64 FIREBASE_SERVICE_ACCOUNT_JSON env var for Heroku"
```

---

## Task 5: Fix Dockerfile to use Heroku's dynamic $PORT

**Files:**
- Modify: `backend/Dockerfile`

- [ ] **Step 5.1: Update the CMD line**

In `backend/Dockerfile`, find the last line:

```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

Replace with:

```dockerfile
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
```

Note: `--workers 1` instead of 2 to conserve RAM on Standard-2X (1 GB). Shell form (no brackets) is required for `$PORT` variable expansion.

- [ ] **Step 5.2: Update HEALTHCHECK to use $PORT**

Find the HEALTHCHECK line:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1
```

It already uses `${PORT}` — verify it reads correctly. If it uses `8000` hardcoded, change it to `${PORT:-8000}`.

- [ ] **Step 5.3: Commit**

```bash
git add backend/Dockerfile
git commit -m "fix(docker): use Heroku dynamic \$PORT in CMD"
```

---

## Task 6: Create backend GitHub Actions workflow

**Files:**
- Create: `.github/workflows/deploy-backend.yml`

- [ ] **Step 6.1: Create the workflow file**

Create `.github/workflows/deploy-backend.yml` with these exact contents:

```yaml
name: Deploy Backend to Heroku

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-backend.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Login to Heroku Container Registry
        run: echo "${{ secrets.HEROKU_API_KEY }}" | docker login registry.heroku.com --username=_ --password-stdin

      - name: Build and push Docker image
        run: |
          docker build -t registry.heroku.com/${{ secrets.HEROKU_APP_NAME }}/web ./backend
          docker push registry.heroku.com/${{ secrets.HEROKU_APP_NAME }}/web

      - name: Release on Heroku
        run: |
          curl -n -X PATCH https://api.heroku.com/apps/${{ secrets.HEROKU_APP_NAME }}/formation \
            -H "Content-Type: application/json" \
            -H "Accept: application/vnd.heroku+json; version=3.docker-releases" \
            -H "Authorization: Bearer ${{ secrets.HEROKU_API_KEY }}" \
            -d '{"updates":[{"type":"web","docker_image":"'"$(docker inspect registry.heroku.com/${{ secrets.HEROKU_APP_NAME }}/web --format={{.Id}})"'"}]}'

      - name: Scale to Standard-2X dyno
        run: |
          curl -n -X PATCH https://api.heroku.com/apps/${{ secrets.HEROKU_APP_NAME }}/formation/web \
            -H "Content-Type: application/json" \
            -H "Accept: application/vnd.heroku+json; version=3" \
            -H "Authorization: Bearer ${{ secrets.HEROKU_API_KEY }}" \
            -d '{"quantity":1,"size":"Standard-2X"}'
```

- [ ] **Step 6.2: Commit**

```bash
git add .github/workflows/deploy-backend.yml
git commit -m "ci: add GitHub Actions workflow to deploy backend to Heroku"
```

---

## Task 7: Create frontend GitHub Actions workflow

**Files:**
- Create: `.github/workflows/deploy-frontend.yml`

- [ ] **Step 7.1: Create the workflow file**

Create `.github/workflows/deploy-frontend.yml` with these exact contents:

```yaml
name: Deploy Frontend to Firebase

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-frontend.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: Build
        run: npm run build
        working-directory: frontend
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
          VITE_AUTH_MAINTENANCE_MODE: 'false'

      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: vocalguard-3455b
          entryPoint: frontend
```

- [ ] **Step 7.2: Commit**

```bash
git add .github/workflows/deploy-frontend.yml
git commit -m "ci: add GitHub Actions workflow to deploy frontend to Firebase Hosting"
```

---

## Task 8: First deployment — push to main and verify

- [ ] **Step 8.1: Confirm all pre-work is complete**

Check that all 6 items from the Pre-Work section are done:
- [ ] Tools installed (`heroku --version`, `huggingface-cli --version`)
- [ ] Model uploaded to HF Hub
- [ ] Heroku app created with container stack
- [ ] Heroku config vars set (run `heroku config --app vocalguard-api` to verify all 7 vars appear)
- [ ] GitHub secrets set (4 secrets in repo settings)

- [ ] **Step 8.2: Push to main to trigger both pipelines**

```bash
git push origin main
```

- [ ] **Step 8.3: Watch backend pipeline**

Go to GitHub → Actions → "Deploy Backend to Heroku". Expected run time: 5–10 minutes (Docker build + push).

If it fails at the `docker build` step, check that `backend/Dockerfile` exists and the `./backend` path is correct.

- [ ] **Step 8.4: Watch frontend pipeline**

Go to GitHub → Actions → "Deploy Frontend to Firebase". Expected run time: 2–3 minutes.

- [ ] **Step 8.5: Verify backend health**

```bash
curl https://vocalguard-api.herokuapp.com/health
```

Expected response:
```json
{"status": "ok"}
```

If the dyno is sleeping or starting for the first time, the first request may take 60–90 seconds (model download from HF Hub). Check logs if it takes longer:

```bash
heroku logs --tail --app vocalguard-api
```

Look for: `Model download complete` and `Firebase initialised`.

- [ ] **Step 8.6: Verify frontend is calling the right backend**

Open https://vocalguard-3455b.web.app in a browser. Open DevTools → Network. Log in and make a detection request. Confirm requests go to `https://vocalguard-api.herokuapp.com` (not `localhost:8000`).

- [ ] **Step 8.7: End-to-end smoke test**

1. Go to https://vocalguard-3455b.web.app
2. Log in with a test account
3. Upload a short audio file (any `.wav` or `.mp3`)
4. Wait for detection result — should complete within 30 seconds
5. Confirm result shows probability, label, and confidence

---

## Rollback Procedure

If the deployment breaks production:

```bash
# Roll back to previous Heroku release
heroku releases --app vocalguard-api         # see release list
heroku rollback v<N> --app vocalguard-api    # roll back to release N

# Roll back frontend (Firebase)
# In Firebase Console → Hosting → Release history → Rollback to previous
```

---

## Post-Deploy Checklist

- [ ] `/health` returns `{"status": "ok"}`
- [ ] `/docs` (Swagger UI) loads correctly
- [ ] Firebase Auth login works
- [ ] Audio upload → detection → result page works end-to-end
- [ ] History page loads past analyses
- [ ] CORS header present: `Access-Control-Allow-Origin: https://vocalguard-3455b.web.app`
- [ ] No `localhost:8000` references in browser network tab
