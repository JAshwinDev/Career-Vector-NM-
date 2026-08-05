const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

function authHeaders() {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJsonResponse(response, fallbackMessage) {
  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.error || fallbackMessage);
    error.status = response.status;
    throw error;
  }

  return data;
}

function buildRecommendation(score) {
  if (score >= 65) return "APPLY NOW";
  if (score >= 35) return "MAYBE APPLY";
  return "SKIP - Low Match";
}

export async function getRoles() {
  const response = await fetch(`${API_BASE_URL}/roles`, { headers: authHeaders() });
  return parseJsonResponse(response, "Failed to fetch roles");
}

export async function uploadResume({ fileData, fileName, additionalSkills = "" }) {
  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      fileData,
      fileName,
      additionalSkills
    })
  });

  return parseJsonResponse(response, "Resume upload failed");
}

export async function analyzeResume({ resumeFile, skills, role }) {
  const formData = new FormData();
  if (resumeFile) formData.append("resume", resumeFile);
  if (skills) formData.append("skills", skills);
  if (role) formData.append("role", role);

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers: authHeaders(),
    body: formData
  });

  return parseJsonResponse(response, "Analysis failed");
}

export async function saveHistory(payload) {
  const response = await fetch(`${API_BASE_URL}/history`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload)
  });

  return parseJsonResponse(response, "Failed to save history");
}

export async function getHistory({ limit = 20, entryType, source, userId } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (entryType) params.set("entryType", entryType);
  if (source) params.set("source", source);
  if (userId) params.set("userId", userId);

  const response = await fetch(`${API_BASE_URL}/history?${params.toString()}`, { headers: authHeaders() });
  return parseJsonResponse(response, "Failed to fetch history");
}

export async function getHistoryStats({ userId } = {}) {
  const params = new URLSearchParams();
  if (userId) params.set("userId", userId);
  const response = await fetch(`${API_BASE_URL}/history/stats?${params.toString()}`, { headers: authHeaders() });
  return parseJsonResponse(response, "Failed to fetch stats");
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export async function getHistoryItem(id) {
  const response = await fetch(`${API_BASE_URL}/history/${id}`, { headers: authHeaders() });
  return parseJsonResponse(response, "Failed to fetch history item");
}

export async function getPeerComparison({ role, score, entryId } = {}) {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (score !== undefined && score !== null) params.set("score", String(score));
  if (entryId) params.set("entryId", entryId);

  const response = await fetch(`${API_BASE_URL}/history/peer-comparison?${params.toString()}`, { headers: authHeaders() });
  return parseJsonResponse(response, "Failed to fetch peer comparison");
}

export async function generateRoadmap({ userSkills, jobSkills, targetRole, jobRequirements = [] }) {
  const response = await fetch("http://localhost:5001/generate-roadmap", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      userSkills: userSkills || [],
      jobSkills: jobSkills || [],
      targetRole: targetRole || "",
      jobRequirements: jobRequirements || []
    })
  });

  return parseJsonResponse(response, "Failed to generate roadmap");
}

export function buildResumeHistoryPayload(result, options = {}) {
  const score = Number(result.compatibility_score || 0);
  const missingDetails = Array.isArray(result.missing_skills) ? result.missing_skills : [];

  return {
    entryType: "resume-analysis",
    source: options.source || "platform",
    userId: options.userId || "",
    score,
    compatibilityScore: score,
    matched: result.matched_skills || [],
    missing: missingDetails.map((item) => item.skill || item).filter(Boolean),
    missingDetails,
    recommendation: buildRecommendation(score),
    summary: options.summary || `Resume analyzed for ${result.target_role || "selected role"}.`,
    targetRole: result.target_role || "",
    roleDescription: result.role_description || "",
    studentSkills: result.student_skills || [],
    roadmap: result.roadmap || [],
    allRoleScores: result.all_role_scores || {},
    resumeFileName: options.resumeFileName || ""
  };
}

export function historyItemToResult(item) {
  const missingDetails = Array.isArray(item.missingDetails) && item.missingDetails.length
    ? item.missingDetails
    : (item.missing || []).map((skill) => ({ skill, weight: 0 }));

  return {
    compatibility_score: Number(item.compatibilityScore ?? item.score ?? 0),
    matched_skills: item.matched || [],
    missing_skills: missingDetails,
    roadmap: item.roadmap || [],
    student_skills: item.studentSkills || [],
    target_role: item.targetRole || item.jobTitle || "Saved analysis",
    all_role_scores: item.allRoleScores || {},
    role_description: item.roleDescription || item.summary || "",
    recommendation: item.recommendation || "",
    summary: item.summary || "",
    historyId: item._id,
    source: item.source || "",
    entryType: item.entryType || "resume-analysis"
  };
}

export function getMockResult(skills, role) {
  const skillList = skills.split(",").map((item) => item.trim()).filter(Boolean);

  const roleData = {
    "Data Analyst": {
      required: ["Python", "SQL", "Excel", "Power BI", "Tableau", "Statistics", "Pandas", "Data Visualization"],
      description: "Analyze data to extract business insights using statistical and visualization tools."
    },
    "Software Developer": {
      required: ["JavaScript", "React", "Node.js", "Data Structures", "Algorithms", "Git", "REST API", "SQL"],
      description: "Build and maintain software applications."
    },
    "ML Engineer": {
      required: ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Scikit-learn", "Statistics", "Feature Engineering"],
      description: "Design and deploy machine learning models."
    },
    "Frontend Developer": {
      required: ["HTML", "CSS", "JavaScript", "React", "TypeScript", "Tailwind CSS", "Git", "Figma"],
      description: "Build responsive and engaging web interfaces."
    }
  };

  const target = roleData[role] || roleData["Software Developer"];
  const normalizedSkills = skillList.map((item) => item.toLowerCase());

  const matched = target.required.filter((item) =>
    normalizedSkills.some((skill) => skill.includes(item.toLowerCase()) || item.toLowerCase().includes(skill))
  );

  const missing = target.required
    .filter((item) => !matched.includes(item))
    .map((item) => ({ skill: item, weight: 0.7 }));

  const score = Math.round((matched.length / target.required.length) * 85 + Math.random() * 10);

  const roadmapResources = {
    "Power BI": [{ title: "Power BI Tutorial - Alex the Analyst", url: "https://www.youtube.com/watch?v=TmhQCQr_ECg", type: "video" }],
    Tableau: [{ title: "Tableau Full Tutorial", url: "https://www.youtube.com/watch?v=jEgVto5QME8", type: "video" }],
    React: [{ title: "React Full Course - freeCodeCamp", url: "https://www.youtube.com/watch?v=bMknfKXIFA8", type: "video" }],
    "Machine Learning": [{ title: "ML Course - Andrew Ng", url: "https://www.coursera.org/learn/machine-learning", type: "course" }]
  };

  return {
    student_skills: skillList,
    target_role: role,
    compatibility_score: Math.min(score, 95),
    matched_skills: matched,
    missing_skills: missing.slice(0, 6),
    roadmap: missing.slice(0, 4).map((item, index) => ({
      skill: item.skill,
      duration: `${(index + 1) * 2} weeks`,
      resources: roadmapResources[item.skill] || [
        {
          title: `${item.skill} Tutorial - YouTube`,
          url: `https://www.youtube.com/results?search_query=${item.skill}+tutorial`,
          type: "video"
        }
      ],
      start_week: index * 2 + 1
    })),
    all_role_scores: {
      [role]: score,
      "Full Stack Developer": 72,
      "Backend Developer": 68,
      "Data Analyst": 55,
      "ML Engineer": 45
    },
    role_description: target.description,
    recommendation: buildRecommendation(score),
    summary: `Demo analysis generated for ${role}.`,
    is_demo: true
  };
}

// ============ Auth Functions ============
export async function fetchCurrentUser(token) {
  const headers = token
    ? { Authorization: `Bearer ${token}` }
    : authHeaders();
  const response = await fetch(`${API_BASE_URL}/auth/user/me`, { headers });
  return parseJsonResponse(response, "Failed to load user");
}

export async function getGoogleConfig() {
  const response = await fetch(`${API_BASE_URL}/auth/google/config`);
  return parseJsonResponse(response, "Failed to load Google login config");
}

export async function logoutSession() {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: authHeaders()
  });
  return parseJsonResponse(response, "Logout failed");
}

export async function loginWithGoogle(googleData) {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(googleData)
  });
  return parseJsonResponse(response, "Login failed");
}

export async function getUserProfile(userId) {
  const response = await fetch(`${API_BASE_URL}/auth/user/${userId}`, { headers: authHeaders() });
  return parseJsonResponse(response, "Failed to fetch user profile");
}

export async function updateUserProfile(userId, profileData) {
  const response = await fetch(`${API_BASE_URL}/auth/user/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(profileData)
  });
  return parseJsonResponse(response, "Failed to update profile");
}

// ============ Jobs Functions ============
export async function searchJobs(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.location) params.set("location", filters.location);
  if (filters.experience_level) params.set("experience_level", filters.experience_level);
  if (filters.jobType) params.set("jobType", filters.jobType);
  if (filters.limit) params.set("limit", filters.limit);
  if (filters.page) params.set("page", filters.page);

  const response = await fetch(`${API_BASE_URL}/jobs?${params.toString()}`, { headers: authHeaders() });
  return parseJsonResponse(response, "Failed to search jobs");
}

export async function getJobById(jobId) {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, { headers: authHeaders() });
  return parseJsonResponse(response, "Failed to fetch job");
}

export async function getJobsBySkills(userSkills, filters = {}) {
  const response = await fetch(`${API_BASE_URL}/jobs/search/by-match`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      userSkills,
      experience_level: filters.experience_level,
      location: filters.location
    })
  });
  return parseJsonResponse(response, "Failed to find matching jobs");
}

export async function matchJobs(userSkills, jobId) {
  // This function matches a job with user skills
  const job = await getJobById(jobId);
  const matched = job.skills.filter((skill) =>
    userSkills.some((userSkill) => userSkill.toLowerCase() === skill.toLowerCase())
  );
  return {
    matchScore: Math.round((matched.length / Math.max(job.skills.length, 1)) * 100),
    matchedSkills: matched,
    missingSkills: job.skills.filter((s) => !matched.includes(s))
  };
}

export async function ingestJobs(jobsData) {
  const response = await fetch(`${API_BASE_URL}/jobs/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ jobs: jobsData })
  });
  return parseJsonResponse(response, "Failed to ingest jobs");
}

// ============ Quiz Functions ============
export async function generateQuiz(targetRole, numQuestions = 10) {
  const response = await fetch(`${API_BASE_URL}/quiz/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ targetRole, numQuestions })
  });
  return parseJsonResponse(response, "Failed to generate quiz");
}

export async function submitQuiz(quizId, answers, timeSpent = 0) {
  const response = await fetch(`${API_BASE_URL}/quiz/${quizId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ answers, timeSpent })
  });
  return parseJsonResponse(response, "Failed to submit quiz");
}

export async function getQuiz(quizId) {
  const response = await fetch(`${API_BASE_URL}/quiz/${quizId}`, { headers: authHeaders() });
  return parseJsonResponse(response, "Failed to fetch quiz");
}

export async function getUserQuizzes(userId) {
  const response = await fetch(`${API_BASE_URL}/quiz/user/${userId}`, { headers: authHeaders() });
  return parseJsonResponse(response, "Failed to fetch user quizzes");
}

// ============ Workflow / Interaction Functions ============
export async function logInteraction(payload) {
  const response = await fetch(`${API_BASE_URL}/interactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload)
  });

  return parseJsonResponse(response, "Failed to log interaction");
}

export async function getInteractionStats() {
  const response = await fetch(`${API_BASE_URL}/interactions/stats`, { headers: authHeaders() });
  return parseJsonResponse(response, "Failed to fetch interaction stats");
}

export async function getWorkflowOverview() {
  const response = await fetch(`${API_BASE_URL}/workflow/overview`, { headers: authHeaders() });
  return parseJsonResponse(response, "Failed to fetch workflow overview");
}
