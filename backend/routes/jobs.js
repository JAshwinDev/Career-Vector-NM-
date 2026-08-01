const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const axios = require("axios");

// Helper to calculate match score
function calculateMatch(job, userSkills) {
  const jobTags = (job.tags || []).map(t => t.toLowerCase());
  const category = (job.category || "").toLowerCase();
  
  // Create a combined list of strings to match against
  const jobKeywords = [...jobTags, category, job.title.toLowerCase()];
  
  const userSkillsLower = userSkills.map(s => s.toLowerCase());
  const matchedSkills = userSkillsLower.filter(skill => 
    jobKeywords.some(keyword => keyword.includes(skill) || skill.includes(keyword))
  );
  
  // If the job has no tags, we use a basic heuristic based on title/category
  const totalRelevantSkills = Math.max(jobTags.length, 3);
  let matchScore = Math.round((matchedSkills.length / totalRelevantSkills) * 100);
  
  // Boost score if they match title or category directly
  if (userSkillsLower.some(s => job.title.toLowerCase().includes(s))) {
    matchScore += 20;
  }
  
  return {
    matchScore: Math.min(matchScore, 100),
    matchedSkills: matchedSkills,
    missingSkills: jobTags.filter(tag => !matchedSkills.some(s => s.includes(tag) || tag.includes(s)))
  };
}

// Map Remotive job format to our schema
function mapRemotiveJob(job) {
  return {
    _id: job.id.toString(),
    title: job.title,
    company: job.company_name,
    location: {
      city: job.candidate_required_location || "Remote",
      state: "",
      remote: true
    },
    experience_level: job.job_type,
    jobType: job.job_type,
    salary: { min: null, max: null },
    skills: job.tags || [],
    description: job.description || "",
    url: job.url,
    source: "remotive"
  };
}

// GET /jobs - Search jobs with filters from Remotive API
router.get("/", async (req, res) => {
  try {
    const { search, limit = 20 } = req.query;
    
    // Fetch from Remotive API
    let url = "https://remotive.com/api/remote-jobs";
    if (search) {
      url += "?search=" + encodeURIComponent(search);
    }
    
    const response = await axios.get(url);
    const jobs = (response.data.jobs || []).slice(0, Number(limit)).map(mapRemotiveJob);

    res.json({
      jobs,
      total: response.data.jobs ? response.data.jobs.length : 0,
      page: 1,
      limit: Number(limit),
      pages: 1
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch remote jobs.", details: err.message });
  }
});

// GET /jobs/:id - Get single job
router.get("/:id", async (req, res) => {
  try {
    // We can't fetch a single job easily by ID from Remotive without full scan,
    // so we return 404 for now, or fallback to DB if we want.
    // For this scope, the frontend uses the list.
    return res.status(404).json({ error: "Single job fetch not supported for external API." });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch job.", details: err.message });
  }
});

// POST /jobs/search/by-match - Find jobs matching user skills
router.post("/search/by-match", async (req, res) => {
  try {
    const { userSkills } = req.body;

    if (!userSkills || !Array.isArray(userSkills)) {
      return res.status(400).json({ error: "userSkills array is required." });
    }
    
    // We can search remotive using the first skill or a general IT category
    const mainSkill = userSkills[0] || "developer";
    const response = await axios.get("https://remotive.com/api/remote-jobs?search=" + encodeURIComponent(mainSkill));
    
    let jobs = (response.data.jobs || []).map(mapRemotiveJob);
    
    // Calculate match scores for all fetched jobs
    jobs = jobs.map(job => {
      const match = calculateMatch(job, userSkills);
      return { ...job, ...match };
    });
    
    // Sort by match score
    jobs.sort((a, b) => b.matchScore - a.matchScore);
    
    res.json({
      jobs: jobs.slice(0, 20),
      total: Math.min(jobs.length, 20)
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch matched jobs.", details: err.message });
  }
});

module.exports = router;
