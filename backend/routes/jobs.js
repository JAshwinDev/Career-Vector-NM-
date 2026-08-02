const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const { getRemotiveJobs } = require("../utils/remotiveClient");

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

    const result = await getRemotiveJobs({ search, limit });

    res.json({
      jobs: result.jobs.map(mapRemotiveJob),
      total: result.total,
      page: 1,
      limit: Number(limit),
      pages: 1
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch remote jobs.", details: err.message });
  }
});

// POST /jobs/ingest - Bulk-upsert jobs into the local Job collection
router.post("/ingest", async (req, res) => {
  try {
    const { jobs } = req.body;
    if (!Array.isArray(jobs) || !jobs.length) {
      return res.status(400).json({ error: "jobs array is required." });
    }

    const normalized = jobs.map((job) => ({
      externalJobId: String(job.externalJobId || job.id || job._id || ""),
      title: job.title,
      company: job.company || job.company_name || "",
      location: {
        city: job.location?.city || job.candidate_required_location || "",
        state: job.location?.state || "",
        remote: Boolean(job.location?.remote ?? job.remote ?? false)
      },
      description: job.description || "",
      requirements: job.requirements || [],
      skills: job.skills || job.tags || [],
      salary: {
        min: job.salary?.min ?? null,
        max: job.salary?.max ?? null,
        currency: job.salary?.currency || ""
      },
      jobType: job.jobType || "full-time",
      url: job.url || job.externalUrl || "",
      source: job.source || "jsearch",
      externalUrl: job.externalUrl || job.url || ""
    }));

    let inserted = 0;
    for (const job of normalized) {
      if (!job.externalJobId) continue;
      try {
        await Job.updateOne(
          { externalJobId: job.externalJobId },
          { $set: job },
          { upsert: true }
        );
        inserted++;
      } catch (err) {
        console.warn("Failed to ingest job", job.externalJobId, err.message);
      }
    }

    return res.json({ success: true, inserted, total: normalized.length });
  } catch (err) {
    return res.status(500).json({ error: "Failed to ingest jobs.", details: err.message });
  }
});

// GET /jobs/:id - Get single job from the local collection
router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();
    if (!job) {
      return res.status(404).json({ error: "Job not found." });
    }
    return res.json(job);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch job.", details: err.message });
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
    const result = await getRemotiveJobs({ search: mainSkill, limit: 50 });

    let jobs = result.jobs.map(mapRemotiveJob);
    
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
