# VocalGuard — Heroku + Hugging Face Deployment Design

**Date:** 2026-06-02  
**Status:** Approved

---

## Goal

Deploy the VocalGuard FastAPI backend to Heroku (Standard-2X, $50/mo) with the Wav2Vec2 model hosted on Hugging Face Hub (free). Wire up a fully automated CI/CD pipeline so that every `git push origin main` deploys both backend (Heroku) and frontend (Firebase Hosting) automatically.

---

## Architecture

```
GitHub main branch
    │
    ├── push → .github/workflows/deploy-backend.yml
    │           └── heroku container:push web → heroku container:release web
    │               (Docker image, Standard-2X dyno)
    │
    └── push → .github/workflows/deploy-frontend.yml
                └── npm run build (VITE_API_BASE_URL=heroku URL)
                    └── firebase deploy --only hosting

Heroku (https://<app>.herokuapp.com)
    └── startup: huggingface_hub.snapshot_download("user/vocalguard-wav2vec2")
                 → /tmp/hf_model/ (cached in memory for dyno lifetime)

Firebase Hosting (https://vocalguard-3455b.web.app)
    └── all API calls → Heroku backend
```

---

## Dyno Sizing Rationale

| Dyno | RAM | Fit? |
|---|---|---|
| Eco / Basic / Standard-1X | 512 MB | No — PyTorch alone ~300 MB + model ~600 MB = OOM |
| **Standard-2X** | **1 GB** | **Yes** — after stripping TF and using float16 model (~800 MB total) |
| Performance-M | 2.5 GB | Yes — but 5× more expensive, not needed |

Minimum viable: **Standard-2X at $50/mo**.

---

## Files to Create / Modify

### 1. `backend/requirements.txt` — strip unused heavy deps

Remove: `tensorflow`, `keras`, `torchvision`, `torchaudio`, `tensorboard`, `tensorboard-data-server`, `h5py`, and all TF-only deps (absl-py, astunparse, flatbuffers, gast, google-pasta, libclang, ml_dtypes, namex, opt_einsum, optree, termcolor). These are not imported in any app `.py` file — confirmed by grep.

Add: `huggingface_hub>=0.23.0` (for `snapshot_download`).

### 2. `backend/config.py` — support HF repo ID as MODEL_DIR

`MODEL_DIR` must accept either:
- A local `Path` (existing behaviour, used in dev)
- A Hugging Face repo ID string like `"user/vocalguard-wav2vec2"` (used in production)

Detection: if the value does not resolve to an existing directory, treat it as an HF repo ID. Expose `HF_TOKEN` env var for private repos.

### 3. `backend/core/detect_deepfake.py` — add float16 + low_cpu_mem_usage

In `DeepfakeAudioDetector.__init__`, change `AutoModelForAudioClassification.from_pretrained` to pass `torch_dtype=torch.float16, low_cpu_mem_usage=True` when running on CPU. This halves model RAM from ~600 MB → ~300 MB.

Add HF Hub model download at startup using `huggingface_hub.snapshot_download` when `MODEL_DIR` is a repo ID, writing to `/tmp/hf_model/`.

### 4. `backend/services/firebase_config.py` — support env-var credentials

On Heroku there is no file system for `serviceAccountKey.json`. Support `FIREBASE_SERVICE_ACCOUNT_JSON` env var containing the full JSON (base64-encoded or raw). Fall back to file-based search only in dev.

### 5. `.github/workflows/deploy-backend.yml` — backend CI/CD

Trigger: push to `main` when `backend/**` changes.

Steps:
1. Checkout
2. `heroku container:login` using `HEROKU_API_KEY` secret
3. `heroku container:push web --app $HEROKU_APP_NAME` (builds Dockerfile in `backend/`)
4. `heroku container:release web --app $HEROKU_APP_NAME`

### 6. `.github/workflows/deploy-frontend.yml` — frontend CI/CD

Trigger: push to `main` when `frontend/**` changes.

Steps:
1. Checkout
2. `npm ci` in `frontend/`
3. `npm run build` with `VITE_API_BASE_URL` secret injected
4. `firebase deploy --only hosting` using `FIREBASE_SERVICE_ACCOUNT` secret

---

## Heroku Config Vars (set via `heroku config:set`)

| Var | Value |
|---|---|
| `FIREBASE_WEB_API_KEY` | From Firebase Console → Project Settings → Web API Key |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Base64-encoded contents of `serviceAccountKey.json` |
| `ALLOWED_ORIGINS` | `https://vocalguard-3455b.web.app` |
| `APP_ENV` | `production` |
| `MODEL_DIR` | `your-hf-username/vocalguard-wav2vec2` |
| `HF_TOKEN` | Your Hugging Face access token (read scope) |
| `LOG_LEVEL` | `INFO` |

`PORT` is set automatically by Heroku — do not set it manually.

---

## GitHub Secrets (set in repo Settings → Secrets → Actions)

| Secret | Value |
|---|---|
| `HEROKU_API_KEY` | Heroku account → Settings → API Key |
| `HEROKU_APP_NAME` | e.g. `vocalguard-api` |
| `FIREBASE_SERVICE_ACCOUNT` | Full JSON of Firebase service account (for firebase-action) |
| `VITE_API_BASE_URL` | `https://<your-app>.herokuapp.com` |

---

## One-Time Manual Setup Steps

1. **Hugging Face Hub** — create account, create model repo, upload model:
   ```bash
   pip install huggingface_hub
   huggingface-cli login          # paste HF token when prompted
   huggingface-cli upload your-username/vocalguard-wav2vec2 \
       backend/models/deepfake_audio_model/ .
   ```

2. **Heroku app** — create app and set container stack:
   ```bash
   heroku create vocalguard-api
   heroku stack:set container --app vocalguard-api
   ```

3. **Heroku config vars** — set all vars listed above:
   ```bash
   heroku config:set FIREBASE_WEB_API_KEY=... --app vocalguard-api
   # ... repeat for all vars
   ```

4. **GitHub secrets** — add all 4 secrets listed above.

5. **First deploy** — push to main to trigger the pipelines:
   ```bash
   git push origin main
   ```

After step 5, every subsequent push auto-deploys.

---

## Cold Start Behaviour

On every dyno restart (which Heroku does ~once/day on Standard dynos), the model re-downloads from HF Hub to `/tmp/hf_model/`. Expected download time: ~30–60 seconds on the first request. The model stays resident in memory for the dyno's lifetime. The existing LRU embedding cache (`backend/cache/`) remains functional.

---

## Constraints & Risks

| Risk | Mitigation |
|---|---|
| Standard-2X OOM if both float32 model + TF are loaded | TF stripped from requirements; float16 model loading |
| serviceAccountKey.json not on Heroku filesystem | Env-var-based credential loading added |
| HF Hub down during dyno restart | `snapshot_download` has retry logic; model cached in `/tmp` across warm requests |
| Docker build exceeds Heroku slug limit | N/A — container stack has no slug limit |
| Frontend calling wrong API URL after deploy | `VITE_API_BASE_URL` injected at build time via GitHub secret |
