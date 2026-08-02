# ⚡ CareerVector
### Bridging the Employability Gap for Engineering Graduates in India

> **CareerVector** is a full-stack AI platform with a Chrome Extension that:
> 1. **Analyzes your resume** against 20+ job roles using TF-IDF + Cosine Similarity (CareerVector web app)
> 2. **Overlays real-time match scores** on LinkedIn job listings using Google Gemini AI (Chrome Extension)
> 3. **Saves your job history** and serves a dashboard of your progress

---

## 🗂️ Project Structure

```
careervector/
├── start.sh                          ← One-command startup (all 3 services)
│
├── extension/                        ← Chrome Extension (load unpacked)
│   ├── manifest.json
│   ├── src/                          ← Scripts
│   │   ├── config.js                 ← Shared base-URL config (chrome.storage.sync)
│   │   ├── content.js                ← Injects overlay on LinkedIn jobs
│   │   ├── background.js             ← Handles resume upload messaging
│   │   ├── options.js                ← Settings page logic
│   │   └── popup.js                  ← Popup logic
│   ├── pages/                        ← HTML pages
│   │   ├── options.html              ← Settings page (backend/web-app URLs)
│   │   └── popup.html                ← Extension popup UI
│   └── styles/styles.css
│
├── backend/                          ← Node.js + Express API (Port 5000)
│   ├── server.js                     ← Entry point (starts the HTTP server)
│   ├── app.js                        ← Express app (importable by tests)
│   ├── .env.example                  ← Copy to .env and fill in keys
│   ├── models/
│   │   ├── User.js                   ← Auth profile + preferences
│   │   ├── ResumeProfile.js          ← Parsed resume + extracted skills
│   │   ├── Job.js                    ← Ingested job postings
│   │   ├── JobHistory.js             ← Saved analyses / job matches
│   │   ├── Interaction.js            ← User behaviour events
│   │   └── Quiz.js                   ← Skill-verification quizzes
│   ├── middleware/auth.js            ← JWT sign/verify (requireAuth)
│   ├── routes/                       ← API route handlers, grouped by feature:
│   │   ├── auth/                     ← auth.js (Google, register, login, demo)
│   │   ├── jobs/                     ← jobs.js, match.js, roles.js
│   │   ├── resume/                   ← upload.js, analyze.js
│   │   ├── analytics/                ← history.js, interactions.js
│   │   └── learning/                 ← quiz.js, workflow.js
│   ├── services/                     ← external clients
│   │   ├── mlService.js              ← ML service base URL helper
│   │   └── remotiveClient.js         ← Remotive API client (rate-limited + cached)
│   ├── utils/
│   │   ├── localStore.js             ← JSON fallback when Mongo is unavailable
│   │   ├── resumeProfiles.js         ← PDF parsing + skill extraction
│   │   └── skillUtils.js             ← shared skill parsing/dedup helpers
│   └── tests/                        ← node:test suite (auth + routes)
│
├── ml-service/                       ← Python Flask ML API (Port 5001)
│   ├── app.py                        ← TF-IDF + cosine similarity engine
│   └── data/job_roles.json           ← 20 roles, 500+ weighted skills
│
└── frontend/                         ← React + Vite web app (Port 3000)
    └── src/
        ├── App.jsx
        ├── components/               ← grouped by feature
        │   ├── auth/                 ← LoginPage
        │   ├── landing/              ← HeroSection, HowItWorks
        │   ├── dashboard/            ← Dashboard, ResultsDashboard, HistoryDashboard, RoadmapViewer
        │   ├── resume/               ← AnalyzeForm, ResumeUploadForm
        │   ├── jobs/                 ← JobSearchPage
        │   ├── quiz/                 ← QuizPage
        │   ├── workflow/             ← WorkflowSection
        │   └── shared/               ← CustomCursor
        ├── hooks/useMousePosition.js
        └── utils/api.js
```

---

## 🚀 Setup

### 1. Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB Atlas account (optional — the backend falls back to a local JSON store)
- Google Gemini API key (optional — quiz generation falls back to a built-in bank)

### 2. Environment Variables

```bash
cd backend
cp .env.example .env
# Edit .env and fill in MONGO_URI and GEMINI_API_KEY
```

Every variable has a safe default or is optional:

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Backend port | `5000` |
| `MONGO_URI` | MongoDB connection string | *(none → local JSON store)* |
| `GEMINI_API_KEY` | Google Gemini for quiz generation | *(none → question bank)* |
| `JWT_SECRET` | JWT signing key | *(ephemeral, regenerated each start)* |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth (`POST /auth/google`) | *(none → OAuth disabled)* |
| `ML_SERVICE_URL` | Python ML service base URL | `http://localhost:5001` |
| `REMOTIVE_API_URL` | Job source API | `https://remotive.com/api/remote-jobs` |
| `REMOTIVE_CACHE_TTL_MS` | Remotive response cache TTL | `600000` (10 min) |
| `REMOTIVE_RATE_LIMIT_MS` | Min. spacing between Remotive calls | `2000` |

### 3. Start Everything

```bash
chmod +x start.sh
./start.sh
```

This installs all dependencies and starts:
| Service | URL |
|---|---|
| React Frontend | http://localhost:3000 |
| Node.js Backend | http://localhost:5000 |
| Python ML Service | http://localhost:5001 |

### 4. Install the Chrome Extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked** → select the `extension/` folder
4. Pin the extension to your toolbar

### 5. Run the tests

```bash
cd backend
npm test
```

The suite covers the auth middleware (valid/invalid tokens, ownership checks) and at least one route per resource. Tests run offline — the Remotive API is mocked and Mongo is bypassed via the local JSON store.

---

## 🔌 How the Extension Works

1. Navigate to any job on **LinkedIn Jobs** (`linkedin.com/jobs/...`)
2. The extension auto-detects the job description
3. It sends the text to `POST /match` along with your saved skills
4. A floating overlay appears showing:
   - Match Score (0–100%)
   - ✅ Matched Skills
   - 📚 Skills to Learn
   - Recommendation: **APPLY NOW / MAYBE APPLY / SKIP**
5. Results are auto-saved via `POST /history`

### Configuring the extension's API base URL

By default the extension calls `http://localhost:5000` (backend) and `http://localhost:3000` (web app). To point it at a different server, open the extension popup → **Settings** (or right-click the icon → *Options*). Values are stored in `chrome.storage.sync` under `BACKEND_URL` / `FRONTEND_URL` and fall back to the defaults in `config.js`.

> Note: to reach a non-local backend, add its origin to `host_permissions` in `extension/manifest.json`.

---

## 📄 API Reference

All routes are mounted under `/` on port `5000`. Routes marked 🔒 require `Authorization: Bearer <token>` (from `/auth/demo`, `/auth/login`, `/auth/register`, or `/auth/google`).

### Auth
| Method | Route | Description |
|---|---|---|
| `POST` | `/auth/google` | Verify a Google ID token, then log in / sign up |
| `POST` | `/auth/register` | Email/password signup |
| `POST` | `/auth/login` | Email/password login |
| `POST` | `/auth/demo` | Login as a demo student (no DB write) |
| `GET` 🔒 | `/auth/user/me` | Current user's profile |
| `GET` 🔒 | `/auth/user/:id` | Own profile by id (403 for others) |
| `PUT` 🔒 | `/auth/user/:id` | Update name, current/target role, preferences |
| `POST` | `/auth/logout` | Stateless logout (client discards token) |

### Match & Analysis
| Method | Route | Description |
|---|---|---|
| `POST` | `/match` | Match `jobDescription` + `userSkills` against a role (ML, keyword fallback) |
| `POST` | `/upload` | Parse resume PDF (base64) → extracted skills |
| `POST` | `/analyze` | Multipart upload (`resume`, `skills`, `role`) → scored readiness report + roadmap |
| `GET` | `/roles` | Role catalog (ML, fallback catalog) |
| `POST` | `/roles` | Role recommendations for a skills array |

### History & Analytics
| Method | Route | Description |
|---|---|---|
| `POST` 🔒 | `/history` | Save an analysis / job match |
| `GET` 🔒 | `/history` | List saved entries (scoped to user) |
| `GET` 🔒 | `/history/stats` | Aggregate stats (avg score, apply/maybe/skip counts) |
| `GET` 🔒 | `/history/peer-comparison` | Percentile + leaderboard vs. peers |
| `GET` 🔒 | `/history/:id` | Fetch a single entry |
| `DELETE` 🔒 | `/history/:id` | Delete an entry |

### Jobs (Remotive)
| Method | Route | Description |
|---|---|---|
| `GET` | `/jobs` | Search remote jobs (`?search=&limit=`) — rate-limited + cached |
| `POST` | `/jobs/ingest` | Bulk upsert jobs into the `Job` collection |
| `GET` | `/jobs/:id` | Fetch an ingested job |
| `POST` | `/jobs/search/by-match` | Rank jobs against `userSkills` |

### Quiz
| Method | Route | Description |
|---|---|---|
| `POST` | `/quiz/generate-from-skills` | AI-generated MCQs from resume skills |
| `POST` 🔒 | `/quiz/generate` | MCQs for a `targetRole` (Gemini, bank fallback) |
| `POST` | `/quiz/:id/submit` | Evaluate answers, score, suggestions |
| `GET` 🔒 | `/quiz/user` | Current user's quiz history |
| `GET` | `/quiz/:id` | Fetch a quiz |

### Interactions & Workflow
| Method | Route | Description |
|---|---|---|
| `POST` 🔒 | `/interactions` | Log a user interaction |
| `GET` 🔒 | `/interactions` | List interactions |
| `GET` 🔒 | `/interactions/stats` | Interaction aggregates |
| `GET` | `/workflow/overview` | Service health + feature readiness |
| `GET` | `/health` | Backend / Mongo health probe |

---

## 🗄️ Data Models

All models live in `backend/models/` (Mongoose). When `MONGO_URI` is unset or unreachable, the server transparently uses the local JSON store in `backend/data/local-store.json`.

- **User** — Google/email identity, `currentRole`/`targetRole`, `skills`, `preferences` (dark mode, notification email, preferred locations, min salary), references to `resumeProfiles` and `jobMatches`.
- **ResumeProfile** — `source`, `fileName`, `rawText`, `manualSkills`, `extractedSkills`, `selectedRole`.
- **Job** — ingested postings: title, company, location, description, requirements, skills, salary, jobType, source, URL.
- **JobHistory** — a saved analysis/match: score, matched/missing skills, recommendation, roadmap, all-role scores, owner `userId`.
- **Interaction** — behaviour events (`resume_upload`, `job_view`, `job_apply`, `match_check`, `roadmap_view`, `quiz_attempt`, …).
- **Quiz** — generated MCQs, `userAnswers`, score, `skillsPerformance`, suggestions.

---

## 🤖 ML Engine (Python)

Combines two methods:
- **Weighted Skill Matching (60%)** — each role skill has a job-posting-derived weight
- **TF-IDF + Cosine Similarity (40%)** — captures semantic proximity of skill sets

```
final_score = 0.6 × weighted_score + 0.4 × cosine_similarity
```

20 roles covered: Software Developer, Data Analyst, ML Engineer, Frontend/Backend/Full Stack Developer,
DevOps, Data Scientist, Cybersecurity Analyst, Cloud Engineer, Android/iOS Developer,
Embedded Systems Engineer, Business Analyst, Network Engineer, Game Developer,
UI/UX Designer, Blockchain Developer, Product Manager, QA Engineer.

---

## 🛣️ Roadmap

- [ ] Real-time LinkedIn job data scraping
- [ ] Dashboard UI for history stats
- [ ] Peer comparison features
- [ ] College placement cell integration
- [ ] Mobile app (React Native)
- [ ] More job roles (50+)
