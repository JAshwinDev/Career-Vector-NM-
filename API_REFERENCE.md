# 🔌 Complete API Reference

## Base URLs
- **Backend**: `http://localhost:5000`
- **ML Service**: `http://localhost:5001`

---

## 🔐 Authentication Endpoints

### POST /auth/google
Login with Google OAuth

**Request:**
```json
{
  "googleId": "123456789",
  "email": "user@example.com",
  "name": "John Doe",
  "profilePicture": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "userId",
    "email": "user@example.com",
    "name": "John Doe",
    "profilePicture": "https://..."
  },
  "token": "base64_token"
}
```

---

### GET /auth/user/:id
Get user profile

**Response:**
```json
{
  "_id": "userId",
  "email": "user@example.com",
  "name": "John Doe",
  "resumeProfiles": ["profileId1", "profileId2"],
  "jobMatches": ["jobId1", "jobId2"],
  "currentRole": "Junior Developer",
  "targetRole": "Senior Developer",
  "skills": ["JavaScript", "React", "Node.js"],
  "preferences": {
    "notificationEmail": true,
    "darkMode": true,
    "preferredJobLocations": ["San Francisco"],
    "minSalary": 80000
  }
}
```

---

### PUT /auth/user/:id
Update user profile

**Request:**
```json
{
  "name": "Updated Name",
  "currentRole": "Mid-level Developer",
  "targetRole": "Senior Developer",
  "preferences": {
    "notificationEmail": true
  }
}
```

---

## 💼 Job Management Endpoints

### GET /jobs
Search jobs with filters

**Query Parameters:**
```
search=javascript              // Search in title & description
skills=React,Node.js          // Filter by skills (array)
location=San%20Francisco      // Filter by location
experience_level=mid          // entry, mid, senior, lead
jobType=full-time             // full-time, part-time, contract
salary_min=80000              // Minimum salary
salary_max=120000             // Maximum salary
source=jsearch                // linkedin, jsearch, indeed
limit=20                      // Results per page (default 20)
page=1                        // Page number (default 1)
```

**Response:**
```json
{
  "jobs": [
    {
      "_id": "jobId",
      "title": "JavaScript Developer",
      "company": "TechCorp",
      "description": "...",
      "requirements": ["JavaScript", "React"],
      "skills": ["JavaScript", "React", "Node.js"],
      "location": {
        "city": "San Francisco",
        "state": "CA",
        "country": "USA",
        "remote": true
      },
      "salary": {
        "min": 80000,
        "max": 120000,
        "currency": "USD"
      },
      "jobType": "full-time",
      "experience_level": "mid",
      "source": "jsearch"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "pages": 8
}
```

---

### GET /jobs/:id
Get single job details

**Response:**
```json
{
  "_id": "jobId",
  "title": "JavaScript Developer",
  "company": "TechCorp",
  "description": "Full description...",
  "requirements": ["JavaScript", "React", "Node.js"],
  "skills": ["JavaScript", "React", "Node.js", "Express"],
  "location": {...},
  "salary": {...},
  "url": "https://...",
  "externalUrl": "https://...",
  "postedDate": "2024-05-01T00:00:00Z",
  "companyLogo": "https://...",
  "industryCategory": "Technology"
}
```

---

### POST /jobs/search/by-match
Find jobs matching user skills

**Request:**
```json
{
  "userSkills": ["JavaScript", "React", "Node.js"],
  "experience_level": "mid",
  "location": "San Francisco"
}
```

**Response:**
```json
{
  "jobs": [
    {
      ...job_object,
      "matchScore": 85,
      "matchedSkills": ["JavaScript", "React", "Node.js"],
      "missingSkills": ["TypeScript", "AWS"]
    }
  ],
  "total": 15
}
```

---

### POST /jobs/ingest
Add jobs to database (bulk)

**Request:**
```json
{
  "jobs": [
    {
      "externalJobId": "job123",
      "title": "JavaScript Developer",
      "company": "TechCorp",
      "description": "...",
      "requirements": [],
      "skills": ["JavaScript", "React"],
      "location": {...},
      "salary": {...},
      "jobType": "full-time",
      "experience_level": "mid",
      "source": "jsearch",
      "url": "https://..."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "ingestedCount": 50,
  "skippedCount": 0,
  "errors": []
}
```

---

## 📝 Quiz Endpoints

### POST /quiz/generate
Generate quiz questions for a role

**Request:**
```json
{
  "targetRole": "Software Developer",
  "userId": "userId",
  "numQuestions": 10
}
```

**Response:**
```json
{
  "quizId": "quizId",
  "targetRole": "Software Developer",
  "questions": [
    {
      "id": "q1",
      "question": "What is the primary purpose of version control?",
      "options": [
        "To track changes and collaborate on code",
        "To compile code",
        "To optimize performance",
        "To secure the network"
      ],
      "skill": "Git",
      "difficulty": "easy"
    }
  ]
}
```

---

### POST /quiz/:id/submit
Submit quiz answers and get evaluation

**Request:**
```json
{
  "answers": [
    {
      "questionId": "q1",
      "selectedAnswer": "To track changes and collaborate on code"
    },
    {
      "questionId": "q2",
      "selectedAnswer": "Option B"
    }
  ],
  "timeSpent": 420
}
```

**Response:**
```json
{
  "success": true,
  "score": 8,
  "totalQuestions": 10,
  "percentageScore": 80,
  "skillsPerformance": {
    "Git": 100,
    "JavaScript": 75,
    "Data Structures": 80
  },
  "suggestions": [
    "Review advanced concepts in JavaScript - Current: 75%"
  ],
  "feedback": {
    "message": "Great job! You're ready for Software Developer roles.",
    "recommendation": "Apply to relevant positions now!"
  }
}
```

---

### GET /quiz/:id
Get quiz details

**Response:**
```json
{
  "_id": "quizId",
  "targetRole": "Software Developer",
  "questions": [...],
  "userAnswers": [...],
  "score": 8,
  "percentageScore": 80,
  "status": "completed",
  "completedAt": "2024-05-04T10:30:00Z"
}
```

---

### GET /quiz/user/:userId
Get user's quiz history

**Response:**
```json
[
  {
    "_id": "quizId1",
    "targetRole": "Software Developer",
    "score": 8,
    "percentageScore": 80,
    "completedAt": "2024-05-04T10:30:00Z"
  },
  {
    "_id": "quizId2",
    "targetRole": "Data Analyst",
    "score": 7,
    "percentageScore": 70,
    "completedAt": "2024-05-03T14:15:00Z"
  }
]
```

---

## 📊 Resume & Analysis Endpoints

### POST /upload
Upload resume (PDF) and extract skills

**Request:**
```
FormData:
  resume: File (PDF)
  fileName: "resume.pdf"
  additionalSkills: "JavaScript, React"
```

**Response:**
```json
{
  "profileId": "profileId",
  "resumeProfileId": "profileId",
  "skills": ["JavaScript", "React", "Node.js", "Python"],
  "fileName": "resume.pdf",
  "message": "Resume processed and stored in MongoDB."
}
```

---

### POST /analyze
Analyze resume for a specific role

**Request:**
```
FormData:
  resume: File (PDF) - optional
  skills: "JavaScript, React, Node.js"
  role: "Software Developer"
```

**Response:**
```json
{
  "student_skills": ["JavaScript", "React", "Node.js"],
  "target_role": "Software Developer",
  "compatibility_score": 85,
  "matched_skills": ["JavaScript", "React", "Node.js"],
  "missing_skills": [
    {"skill": "TypeScript", "weight": 0.8},
    {"skill": "AWS", "weight": 0.6}
  ],
  "roadmap": [
    {
      "skill": "TypeScript",
      "duration": "2 weeks",
      "resources": [...],
      "priority": "high"
    }
  ],
  "role_description": "Build and maintain software applications...",
  "recommendation": "APPLY NOW"
}
```

---

### POST /match
Match user skills with a job description

**Request:**
```json
{
  "jobDescription": "Looking for a React developer...",
  "userSkills": ["JavaScript", "React", "Node.js"],
  "resumeProfileId": "profileId",
  "jobRequirements": ["JavaScript", "React"],
  "jobRequirementsText": ["3+ years experience", "CS degree"]
}
```

**Response:**
```json
{
  "matchScore": 85,
  "compatibility_score": 85,
  "matchedSkills": ["JavaScript", "React"],
  "matched_skills": ["JavaScript", "React"],
  "missingSkills": ["TypeScript"],
  "missing_skills": [
    {"skill": "TypeScript", "weight": 0.7}
  ],
  "recommendation": "APPLY NOW",
  "summary": "You have 85% of the required skills for this position."
}
```

---

### POST /history
Save analysis to history

**Request:**
```json
{
  "entryType": "job-match",
  "source": "platform",
  "resumeProfileId": "profileId",
  "score": 85,
  "matched": ["JavaScript", "React"],
  "missing": ["TypeScript", "AWS"],
  "jobTitle": "Senior React Developer",
  "company": "TechCorp",
  "jobUrl": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "id": "historyId",
  "entry": {...}
}
```

---

### GET /history
Get analysis history

**Query Parameters:**
```
limit=20              // Results per page
entryType=job-match   // Filter by type
source=platform       // Filter by source
```

**Response:**
```json
[
  {
    "_id": "historyId",
    "entryType": "job-match",
    "score": 85,
    "jobTitle": "Senior React Developer",
    "company": "TechCorp",
    "createdAt": "2024-05-04T10:00:00Z"
  }
]
```

---

## 🎓 Role & Recommendation Endpoints

### GET /roles
Get available roles and their descriptions

**Response:**
```json
{
  "Software Developer": {
    "description": "Build and maintain software applications.",
    "skill_count": 8
  },
  "Data Analyst": {
    "description": "Analyze data to extract business insights.",
    "skill_count": 7
  },
  "Frontend Developer": {
    "description": "Build responsive and engaging web interfaces.",
    "skill_count": 6
  }
}
```

---

### POST /roles
Get role recommendations based on skills

**Request:**
```json
{
  "skills": ["JavaScript", "React", "Python", "SQL"]
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "role": "Frontend Developer",
      "matchScore": 90,
      "matchedSkills": ["JavaScript", "React"],
      "missingSkills": ["TypeScript", "CSS"],
      "description": "Build responsive and engaging web interfaces."
    },
    {
      "role": "Full Stack Developer",
      "matchScore": 75,
      "matchedSkills": ["JavaScript", "Python", "SQL"],
      "missingSkills": ["Node.js", "Docker"],
      "description": "Develop both frontend and backend components."
    }
  ]
}
```

---

## 🏥 Health Check

### GET /health
Check backend service status

**Response:**
```json
{
  "status": "ok",
  "backend": "up",
  "mongo": "connected",
  "ml": "up"
}
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "error": "jobDescription is required."
}
```

### 404 Not Found
```json
{
  "error": "User not found."
}
```

### 500 Server Error
```json
{
  "error": "Failed to save history.",
  "details": "Error message details"
}
```

---

## 📋 Common Patterns

### Filter Jobs by Multiple Skills (AND condition)
```bash
GET /jobs?skills=JavaScript&skills=React&skills=Node.js
```

### Paginate Results
```bash
GET /jobs?limit=20&page=2
```

### Sort by Date (Latest First)
```bash
GET /history?sort=-createdAt
```

### Search Text
```bash
GET /jobs?search=developer+javascript
```

---

## 🔄 Request/Response Workflow Example

### Complete Job Matching Workflow

```javascript
// 1. Upload resume
POST /upload
→ Get: profileId, extracted skills

// 2. Search jobs by matching skills
POST /jobs/search/by-match
→ Get: list of matching jobs with scores

// 3. Analyze specific job
POST /match
→ Get: detailed match analysis

// 4. Save to history
POST /history
→ Get: confirmation with history ID

// 5. Get recommendations
POST /roles
→ Get: recommended roles based on skills

// 6. Generate roadmap for missing skills
POST /generate-roadmap (ML service)
→ Get: detailed learning path
```

---

## 🔑 Authentication Token

Include in headers:
```
Authorization: Bearer {base64_token}
```

For now, most endpoints accept requests without authentication. Add middleware as needed.

---

## 📚 Additional Resources

- **Mongoose Docs**: https://mongoosejs.com
- **Express Docs**: https://expressjs.com
- **Flask Docs**: https://flask.palletsprojects.com
- **React Docs**: https://react.dev
- **MongoDB Docs**: https://docs.mongodb.com

---

**Last Updated**: May 4, 2026
**API Version**: 1.0
