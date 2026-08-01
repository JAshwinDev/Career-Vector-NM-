const express = require("express");
const router = express.Router();

async function fetchRoleCatalog() {
  try {
    const response = await fetch("http://localhost:5001/roles");
    if (!response.ok) {
      throw new Error("ML service unavailable");
    }

    return await response.json();
  } catch {
    return getFallbackCatalog();
  }
}

// GET /roles
router.get("/", async (_req, res) => {
  const roles = await fetchRoleCatalog();
  res.json(roles);
});

// POST /roles
router.post("/", async (req, res) => {
  const inputSkills = Array.isArray(req.body.skills)
    ? req.body.skills
    : String(req.body.skills || "")
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);

  if (!inputSkills.length) {
    return res.status(400).json({ error: "Skills array required" });
  }

  try {
    const response = await fetch("http://localhost:5001/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skills: inputSkills })
    });

    if (!response.ok) {
      throw new Error("ML service unavailable");
    }

    const data = await response.json();
    return res.json({
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : []
    });
  } catch (err) {
    console.error("ML service error:", err.message);
    return res.json({
      recommendations: getMockRecommendations(inputSkills)
    });
  }
});

function getMockRecommendations(userSkills) {
  const roles = {
    "Software Developer": ["JavaScript", "Python", "Data Structures", "Git", "React", "HTML", "CSS", "Node.js", "SQL", "OOP"],
    "Data Analyst": ["Python", "SQL", "Excel", "Power BI", "Statistics", "Pandas", "NumPy", "Data Visualization", "Tableau", "R"],
    "ML Engineer": ["Python", "Machine Learning", "TensorFlow", "PyTorch", "Scikit-learn", "Statistics", "Deep Learning", "NumPy", "Pandas", "Git"],
    "Frontend Developer": ["HTML", "CSS", "JavaScript", "React", "TypeScript", "Tailwind CSS", "Git", "REST API", "Responsive Design", "Next.js"],
    "Backend Developer": ["Python", "Node.js", "Java", "SQL", "NoSQL", "REST API", "Docker", "Microservices", "AWS", "Git"],
    "DevOps Engineer": ["Linux", "Docker", "Kubernetes", "AWS", "CI/CD", "Terraform", "Ansible", "Python", "Bash", "Git"],
    "Data Scientist": ["Python", "R", "Machine Learning", "Statistics", "SQL", "Pandas", "NumPy", "Scikit-learn", "Data Visualization", "Jupyter"],
    "Cybersecurity Analyst": ["Networking", "Linux", "Python", "Security Protocols", "Penetration Testing", "SIEM", "Cryptography", "Incident Response", "Firewall Management", "OWASP"],
    "Cloud Engineer": ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Linux", "Networking", "Security", "CI/CD"],
    "Android Developer": ["Kotlin", "Java", "Android Studio", "XML", "Jetpack Compose", "Firebase", "REST API", "Git", "OOP", "Material Design"],
    "iOS Developer": ["Swift", "Xcode", "SwiftUI", "UIKit", "Core Data", "REST API", "Git", "OOP", "Design Patterns", "Firebase"],
    "Full Stack Developer": ["JavaScript", "React", "Node.js", "SQL", "NoSQL", "REST API", "HTML", "CSS", "Git", "Docker"],
    "Embedded Systems Engineer": ["C", "C++", "Embedded C", "RTOS", "Microcontrollers", "Arduino", "Raspberry Pi", "Electronics", "UART/SPI/I2C", "Linux"]
  };

  const recommendations = [];
  const normalizedSkills = userSkills.map((skill) => skill.toLowerCase());

  for (const [role, requiredSkills] of Object.entries(roles)) {
    const matched = requiredSkills.filter((skill) => normalizedSkills.includes(skill.toLowerCase()));
    const score = matched.length / requiredSkills.length;

    // Include roles with at least some match (score > 0.1) to ensure we get at least 5 alternatives
    if (score > 0.1) {
      recommendations.push({
        role,
        matchScore: Math.round(score * 100),
        matchedSkills: matched,
        missingSkills: requiredSkills.filter((skill) => !matched.includes(skill))
      });
    }
  }

  // Sort by match score (highest first) and return at least 5 alternatives
  const sortedRecommendations = recommendations.sort((a, b) => b.matchScore - a.matchScore);

  // If we have fewer than 5 recommendations, include some with lower thresholds
  if (sortedRecommendations.length < 5) {
    const additionalRoles = Object.entries(roles)
      .filter(([role]) => !sortedRecommendations.some(rec => rec.role === role))
      .map(([role, requiredSkills]) => {
        const matched = requiredSkills.filter((skill) => normalizedSkills.includes(skill.toLowerCase()));
        return {
          role,
          matchScore: Math.max(5, Math.round((matched.length / requiredSkills.length) * 100)), // Minimum 5% match
          matchedSkills: matched,
          missingSkills: requiredSkills.filter((skill) => !matched.includes(skill))
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    sortedRecommendations.push(...additionalRoles.slice(0, 5 - sortedRecommendations.length));
  }

  return sortedRecommendations.slice(0, Math.max(5, sortedRecommendations.length));
}

function getFallbackCatalog() {
  return {
    "Software Developer": {
      description: "Build and maintain software applications across product teams.",
      skill_count: 5
    },
    "Data Analyst": {
      description: "Transform raw data into insights, reports, and dashboards.",
      skill_count: 5
    },
    "ML Engineer": {
      description: "Develop, evaluate, and deploy machine learning systems.",
      skill_count: 5
    }
  };
}

module.exports = router;
