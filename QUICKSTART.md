# 🚀 Quick Start Guide

## Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- MongoDB running locally
- Chrome browser for extension
- VS Code (optional but recommended)

---

## 🔧 Installation & Setup

### Step 1: Install All Dependencies
```bash
cd careervector
npm run install:all
```

This will install:
- Root dependencies (concurrently)
- Backend dependencies (Express, Mongoose, etc.)
- Frontend dependencies (React, Vite)
- ML service uses system Python

### Step 2: Start MongoDB
```bash
# On Windows
mongod

# On Mac/Linux
brew services start mongodb-community
# or
mongod
```

### Step 3: Start All Services
```bash
# From careervector root directory
npm run dev
```

This starts:
- ML Service on http://localhost:5001
- Backend API on http://localhost:5000
- Frontend on http://localhost:3000

**Watch for all three to show "ready" or "listening" messages**

---

## 🌐 Testing the Website

1. Open http://localhost:3000 in browser
2. You should see:
   - **Hero Section** - Introduction
   - **Upload Form** - For resume analysis
   - **Job Search** - Find jobs by skills
   - **Quiz** - Readiness assessment
   - **Roadmap** - Learning path

### Test Features:
- 📄 Upload a PDF resume
- 🔍 Search for jobs
- 📝 Take a readiness quiz
- 🗺️ View learning roadmap

---

## 🧩 Testing the Chrome Extension

### Load Extension
1. Open `chrome://extensions/`
2. Toggle **"Developer mode"** (top right)
3. Click **"Load unpacked"**
4. Navigate to `careervector/extension/`
5. Click **"Select Folder"**

### Test Dashboard
1. Click extension icon (top right of Chrome)
2. You should see **4 tabs**:
   - Dashboard
   - Analysis
   - Upload
   - Quiz

### Test Resume Upload
1. Go to **"Upload"** tab
2. Drag & drop a PDF file
3. Click **"Upload Resume to MongoDB"**
4. Wait for success message

### Test Job Analysis
1. Go to a **LinkedIn job listing**
2. Click extension icon
3. Go to **"Analysis"** tab
4. Click **"Analyze Current Job"**
5. View match score & missing skills

### Test Quiz
1. Go to **"Quiz"** tab
2. Select a target role
3. Click **"Start Quiz"**
4. Complete the quiz (10 questions)
5. View results & recommendations

---

## 🐛 Troubleshooting

### Extension Not Working?
```
1. Check if server is running (Port 5000)
2. Reload extension (chrome://extensions/)
3. Hard refresh the LinkedIn page (Ctrl+Shift+R)
4. Check browser console for errors (F12)
```

### MongoDB Connection Error?
```
1. Verify MongoDB is running
2. Check connection string in .env
3. Default: mongodb://localhost:27017/careervector
4. Run: mongosh (to test connection)
```

### Frontend Not Loading?
```
1. Check Vite server running on 3000
2. Try http://localhost:3000 in browser
3. Check console for build errors
4. Restart with: npm run frontend
```

### ML Service Issues?
```
1. Check Python is installed: python --version
2. Verify Flask running on 5001
3. Check terminal for error messages
4. Restart with: npm run ml
```

---

## 📝 API Testing with cURL

### Test Backend Health
```bash
curl http://localhost:5000/health
```

### Upload Resume
```bash
curl -X POST http://localhost:5000/upload \
  -H "Content-Type: application/json" \
  -d '{
    "fileData": "base64_encoded_pdf",
    "fileName": "resume.pdf"
  }'
```

### Search Jobs
```bash
curl http://localhost:5000/jobs?search=javascript&limit=10
```

### Generate Quiz
```bash
curl -X POST http://localhost:5000/quiz/generate \
  -H "Content-Type: application/json" \
  -d '{
    "targetRole": "Software Developer",
    "numQuestions": 10
  }'
```

---

## 📂 Project Structure

```
careervector/
├── backend/              # Node.js API
│   ├── routes/          # API endpoints
│   ├── models/          # MongoDB schemas
│   ├── utils/           # Utilities
│   └── server.js        # Main server
├── frontend/            # React app
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── utils/       # API utilities
│   │   └── App.jsx
│   └── vite.config.js
├── ml-service/         # Python Flask
│   ├── app.py          # ML routes
│   └── data/           # Job roles data
├── extension/          # Chrome extension
│   ├── popup.html
│   ├── popup.js
│   ├── content.js
│   └── manifest.json
└── package.json
```

---

## 🌟 Key Features to Try

### 1. Resume Analysis
- Upload a PDF resume
- System extracts skills automatically
- View extracted skills
- Save to MongoDB

### 2. Job Matching
- Input your skills manually or from resume
- Select job role
- Get compatibility score
- View matched & missing skills
- Get learning recommendations

### 3. Learning Roadmap
- Personalized based on skill gaps
- Shows duration & resources
- Mark skills as complete
- Track progress
- Download roadmap

### 4. Readiness Quiz
- 10 interactive questions
- Timed assessment
- Skill-based evaluation
- Get improvement suggestions
- View performance by skill

### 5. Job Search
- Filter by title, location, role
- Match against your skills
- See match percentage
- Direct apply links

---

## 🔌 Database Collections

### Users
```javascript
{
  googleId, email, name, profilePicture,
  resumeProfiles[], jobMatches[], skills[],
  currentRole, targetRole, preferences
}
```

### Jobs
```javascript
{
  title, company, description, requirements[],
  skills[], location, salary, jobType,
  experience_level, source (LinkedIn/JSearch)
}
```

### Quiz
```javascript
{
  targetRole, questions[], userAnswers[],
  score, percentageScore, timeSpent,
  skillsPerformance, suggestions[]
}
```

### Interactions
```javascript
{
  userId, jobId, resumeProfileId,
  interactionType, matchScore, status,
  actionDetails, timeSpent
}
```

---

## 📊 Monitoring

### View Logs
- **Backend**: Check terminal where `npm run backend` runs
- **ML Service**: Check terminal where `npm run ml` runs
- **Frontend**: Check browser console (F12)
- **Extension**: Check in extension DevTools

### Check Health
- Backend: http://localhost:5000/health
- ML Service: http://localhost:5001/health

---

## 🚀 Next Steps After Setup

1. ✅ Test all features as per Troubleshooting section
2. 📝 Upload your actual resume
3. 🔍 Search for real jobs
4. 📖 Try the learning roadmap
5. 📊 Take the readiness quiz
6. 💾 Review your analysis history

---

## 💡 Tips & Tricks

- **Keyboard Shortcut**: Alt+Shift+C to open extension (customize in manifest.json)
- **Dark Mode**: Extension uses dark theme by default
- **Mobile**: Website is responsive on mobile
- **API Docs**: Check routes files for detailed parameters
- **Sample Data**: ML service includes sample job roles

---

## ⚠️ Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| `Cannot GET /` | Start frontend with `npm run frontend` |
| `MongoDB connection error` | Ensure MongoDB is running and listening on 27017 |
| `Extension not loading` | Reload in chrome://extensions/ and refresh the page |
| `CORS errors` | Backend CORS is enabled, check server logs |
| `Quiz not generating` | ML service must be running on port 5001 |
| `Resume upload fails` | Check file is PDF and < 10MB |

---

## 📞 Support Commands

```bash
# Check Node version
node --version

# Check npm version
npm --version

# Check Python version
python --version

# Check MongoDB status
mongosh --version

# View backend logs
cd backend && npm start

# View ML logs
cd ml-service && python app.py

# Kill port 5000 (if stuck)
# Windows: netstat -ano | findstr :5000
# Mac/Linux: lsof -i :5000
```

---

## 🎉 You're Ready!

Your Career Intelligence System is now running on your local machine. Start exploring and testing all the features!

**Website**: http://localhost:3000  
**API**: http://localhost:5000  
**ML**: http://localhost:5001  
**Extension**: Loaded in Chrome
