# ⚡ CareerVector
### Bridging the Employability Gap for Engineering Graduates in India

> **CareerVector** is a full-stack AI platform with a Chrome Extension that:
> 1. **Analyzes your resume** against 20+ job roles using TF-IDF + Cosine Similarity (CareerVector web app)
> 2. **Overlays real-time match scores** on LinkedIn job listings using Google Gemini AI (Chrome Extension)
> 3. **Saves your job history** to MongoDB and serves a dashboard of your progress

---

## 🗂️ Project Structure

```
careervector/
├── start.sh                        ← One-command startup (all 3 services)
│
├── extension/                      ← Chrome Extension (load unpacked)
│   ├── manifest.json
│   ├── content.js                  ← Injects overlay on LinkedIn jobs
│   ├── background.js               ← Handles resume upload messaging
│   ├── popup.html / popup.js       ← Extension popup UI
│   └── styles.css
│
├── backend/                        ← Node.js + Express API (Port 5000)
│   ├── server.js
│   ├── .env.example                ← Copy to .env and fill in keys
│   ├── models/
│   │   └── JobHistory.js           ← Mongoose schema
│   └── routes/
│       ├── match.js                ← POST /match  (Gemini AI job matching)
│       ├── upload.js               ← POST /upload (PDF → skill extraction)
│       └── history.js              ← GET/POST /history (MongoDB CRUD)
│
├── ml-service/                     ← Python Flask ML API (Port 5001)
│   ├── app.py                      ← TF-IDF + cosine similarity engine
│   └── data/job_roles.json         ← 20 roles, 500+ weighted skills
│
└── frontend/                       ← React + Vite web app (Port 3000)
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── HeroSection.jsx
        │   ├── HowItWorks.jsx
        │   ├── AnalyzeForm.jsx
        │   └── ResultsDashboard.jsx
        └── utils/api.js
```

---

## 🏗️ Full System Architecture

```
Chrome Extension (LinkedIn)
  │  content.js detects job description
  │  popup.js handles skill input / PDF upload
  ▼
Node.js Backend  :5000
  ├── POST /match   → Google Gemini AI → matchScore, matched/missing skills
  ├── POST /upload  → pdf-parse + Gemini → skill array
  └── GET/POST /history → MongoDB Atlas
         ▲
         │ (also used by)
React Frontend :3000
  └── proxy /api → Backend :5000
             └── /analyze → Python ML Service :5001
                            (TF-IDF + cosine similarity)
```

---

## 🚀 Setup

### 1. Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB Atlas account (free tier is fine)
- Google Gemini API key (free at aistudio.google.com)

### 2. Environment Variables

```bash
cd backend
cp .env.example .env
# Edit .env and fill in MONGO_URI and GEMINI_API_KEY
```

**.env contents:**
```
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/careervector
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

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
3. Click **Load unpacked**
4. Select the `extension/` folder from this project
5. Pin the extension to your toolbar

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
5. Results are auto-saved to MongoDB via `POST /history`

---

## 📄 API Reference

### `POST /match`
Gemini AI-powered job description matcher.
```json
Request:  { "jobDescription": "...", "userSkills": ["Python","SQL",...] }
Response: { "matchScore": 72, "matchedSkills": [...], "missingSkills": [...],
            "recommendation": "APPLY NOW", "summary": "..." }
```

### `POST /upload`
Upload resume PDF as base64 → extract skills with Gemini.
```json
Request:  { "fileData": "data:application/pdf;base64,...", "fileName": "cv.pdf" }
Response: { "skills": ["Python","React",...], "message": "Resume processed successfully." }
```

### `GET /history`
Retrieve last 50 job match records from MongoDB.

### `POST /history`
Save a job match result to MongoDB.

### `GET /history/stats`
Aggregate stats: avg score, apply/maybe/skip counts, top missing skills.

### `POST /analyze` *(via frontend proxy)*
CareerVector TF-IDF ML engine — see ml-service/app.py.

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
