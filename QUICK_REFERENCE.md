# CareerVector - Quick Reference Card

## 🚀 Getting Started (2 Minutes)

### Terminal 1: Backend
```bash
cd backend && npm install && node server.js
# ✅ Runs on http://localhost:5000
```

### Terminal 2: ML Service
```bash
cd ml-service && python -m venv .venv
# Windows: .\.venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt && python app.py
# ✅ Runs on http://localhost:5001
```

### Terminal 3: Frontend
```bash
cd frontend && npm install && npm run dev
# ✅ Opens http://localhost:5173 automatically
```

### Load Extension (1 Chrome Tab)
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top-right)
3. Click "Load unpacked"
4. Select the `extension/` folder
5. ✅ Done!

---

## 📍 Key URLs

| Path | Purpose |
|------|---------|
| `/` | Home page with hero section |
| `/login` | Google OAuth login |
| `/upload` | Resume PDF upload form |
| `/jobs` | Job search & filtering |
| `/quiz` | 10-question skill test |
| `/roadmap` | Learning path viewer |
| `/dashboard` | Analysis history |
| `/user-dashboard` | User profile |

---

## 🔌 API Endpoints Quick Reference

### Authentication
```
POST /auth/google          → Login with Google
GET /auth/user/:id         → Get user profile
PUT /auth/user/:id         → Update user profile
```

### Resume & Skills
```
POST /upload               → Upload PDF resume
POST /analyze              → Extract skills from resume
```

### Jobs
```
GET /jobs                  → Search jobs
POST /jobs/search/by-match → Find jobs by user skills
POST /jobs/ingest          → Bulk import jobs
```

### Matching
```
POST /match                → Calculate skill match score
```

### Quiz
```
POST /quiz/generate        → Create 10 MCQ questions
POST /quiz/:id/submit      → Grade quiz answers
GET /quiz/:id              → Get quiz details
```

### History
```
POST /history              → Save analysis to history
GET /history               → Retrieve analysis history
```

### Utilities
```
GET /health                → Server health check
POST /roles                → Get job role recommendations
```

---

## 🧩 Component Map

### Pages (8 total)
```
App.jsx
├─ / → HeroSection + AnalyzeForm
├─ /login → LoginPage
├─ /upload → ResumeUploadForm (NEW)
├─ /jobs → JobSearchPage
├─ /quiz → QuizPage
├─ /roadmap → RoadmapViewer
├─ /dashboard → HistoryDashboard
└─ /user-dashboard → Dashboard (NEW)
```

### Extension Files
```
extension/
├─ manifest.json          → Configuration
├─ background.js          → Service worker (6 message handlers)
├─ content.js             → LinkedIn extraction
├─ popup.html             → UI (4 tabs)
├─ popup.js               → Event handlers
└─ styles.css             → Styling
```

---

## 📊 Database Collections

| Collection | Purpose | Fields |
|-----------|---------|--------|
| **Users** | User accounts | googleId, email, skills, preferences |
| **Jobs** | Job listings | title, company, description, skills |
| **Quiz** | Quiz questions | questions[], userAnswers[], score |
| **Interactions** | User actions | type, jobId, matchScore, status |

---

## 🎯 Complete Workflow Test

### 1. Resume Upload (2 min)
- Go to `/upload`
- Drag-drop a PDF
- See skills extracted
- ✅ Data saved to MongoDB

### 2. Job Search (2 min)
- Go to `/jobs`
- Enter search term
- See results with match scores
- ✅ Click job to view details

### 3. LinkedIn Analysis (3 min)
- Visit any LinkedIn job posting
- Click CareerVector extension icon
- Click "Analyze Job"
- ✅ See match score in popup

### 4. Quiz (5 min)
- Go to `/quiz`
- Select a role
- Answer 10 questions
- ✅ See score and suggestions

### 5. Dashboard (1 min)
- Go to `/dashboard`
- See all past analyses
- View statistics
- ✅ Click to view details

**Total: ~13 minutes for full workflow test**

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Extension not loading | Check manifest.json syntax, reload chrome://extensions |
| API 404 errors | Verify backend running on :5000 |
| No quiz questions | Check ML service running on :5001 |
| Data not saving | Verify MongoDB connection in server logs |
| Content extraction fails | Check content.js selectors, inspect LinkedIn page |
| Skills not extracted | Check skill keyword list in content.js |

---

## 📱 Extension Popup Tabs

| Tab | Feature | Action |
|-----|---------|--------|
| **Dashboard** | Show last job match | Displays: score, job title, matched/missing skills |
| **Analysis** | Extract LinkedIn job | Button: "Analyze Current Job" |
| **Upload** | Add resume | Drag-drop PDF, validates file |
| **Quiz** | Start assessment | Dropdown: select role, button: "Start Quiz" |

---

## 🎓 Data Flow Summary

```
User Action → Frontend Component → API Call → Backend → MongoDB/ML
↓
Response → Component Updates → UI Refresh
↓
Results stored in extension popup or web dashboard
```

### Example: Job Match
```
User clicks "Analyze Job" (Extension)
  ↓
content.js extracts job details from LinkedIn
  ↓
background.js sends to backend
  ↓
POST /match calculates skill match
  ↓
Results saved to MongoDB /history
  ↓
Display in popup + web dashboard
```

---

## 🆘 Common Questions

**Q: Where is data stored?**
A: MongoDB (local or Atlas). All analyses, jobs, users, and quiz results.

**Q: Can I use this with other browsers?**
A: Currently Chrome only. Firefox/Safari not yet supported.

**Q: How does skill matching work?**
A: Extracts skills from resume and job posting, calculates percentage overlap.

**Q: What if LinkedIn changes their HTML?**
A: Update CSS selectors in content.js to match new LinkedIn DOM.

**Q: Can I export my data?**
A: Currently view-only. Export feature can be added to Dashboard component.

**Q: Is this production-ready?**
A: Yes, all error handling and validation implemented. Ready to deploy with environment variables.

---

## 📈 What Gets Tracked

- ✅ Resume uploads (file name, skills extracted)
- ✅ Job searches (query, filters, results clicked)
- ✅ Job matches (score, job title, company)
- ✅ Quiz attempts (questions answered, score, time spent)
- ✅ Roadmap views (skills learned, progress)
- ✅ User interactions (clicks, time on page, navigation)

---

## 🎉 Success Indicators

You'll know everything is working when:

1. ✅ Home page loads with hero section
2. ✅ Resume upload accepts PDF files
3. ✅ Skills display after upload
4. ✅ Job search returns results with match scores
5. ✅ Extension icon works on LinkedIn
6. ✅ Job details extract correctly
7. ✅ Quiz generates 10 questions
8. ✅ Dashboard shows analysis history
9. ✅ All data persists in MongoDB
10. ✅ User can navigate all routes

---

## 📞 Need Help?

1. Check browser console for JavaScript errors
2. Check server logs for API errors
3. Verify MongoDB is running
4. Check all 3 services (backend, ML, frontend) are running
5. Verify extension loaded in Chrome
6. Test with real LinkedIn job posting for extraction

---

**Version:** 1.0.0  
**Status:** ✅ Complete & Tested  
**Last Updated:** 2024  
**Ready for:** Development / Testing / Deployment
