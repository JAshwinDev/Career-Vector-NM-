const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Job = require("../models/Job");

// Helper to generate random salary
function getRandomSalary(level) {
  const base = level === "senior" ? 120000 : level === "entry" ? 60000 : 90000;
  const variance = Math.floor(Math.random() * 30000);
  return {
    min: base - variance,
    max: base + variance + 10000,
    currency: "USD"
  };
}

async function seedJobs() {
  try {
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI is not set in .env. Cannot seed jobs.");
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Clear existing jobs to ensure a clean state
    await Job.deleteMany({});
    console.log("Cleared existing jobs.");

    // Read job roles from ML service data
    const jobRolesPath = path.join(__dirname, "../../ml-service/data/job_roles.json");
    if (!fs.existsSync(jobRolesPath)) {
      console.error(`job_roles.json not found at ${jobRolesPath}`);
      process.exit(1);
    }

    const jobRolesData = JSON.parse(fs.readFileSync(jobRolesPath, "utf8"));
    const roles = jobRolesData.roles || jobRolesData;
    
    const companies = ["TechCorp", "InnovaSolutions", "NextGen Systems", "Acme Digital", "StartupX", "Global Data Corp"];
    const locations = [
      { city: "San Francisco", state: "CA", country: "USA", remote: false },
      { city: "New York", state: "NY", country: "USA", remote: false },
      { city: "Austin", state: "TX", country: "USA", remote: true },
      { city: "Seattle", state: "WA", country: "USA", remote: false },
      { city: "Remote", state: "", country: "USA", remote: true }
    ];
    
    const jobsToInsert = [];
    let externalIdCounter = 1000;

    for (const [roleName, roleInfo] of Object.entries(roles)) {
      const skills = Array.isArray(roleInfo.required_skills) ? roleInfo.required_skills : 
                    (Array.isArray(roleInfo.skills) ? roleInfo.skills : Object.keys(roleInfo.required_skills || roleInfo.skills || {}));
      
      const description = roleInfo.description || `Looking for an experienced ${roleName} to join our growing team.`;
      
      // Create 3 job postings for each role (Entry, Mid, Senior)
      const levels = ["entry", "mid", "senior"];
      
      for (const level of levels) {
        const company = companies[Math.floor(Math.random() * companies.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        
        jobsToInsert.push({
          externalJobId: `seed-${externalIdCounter++}`,
          title: level === "entry" ? `Junior ${roleName}` : level === "senior" ? `Senior ${roleName}` : roleName,
          company: company,
          location: location,
          description: description + ` You will be working on exciting projects utilizing your skills in ${skills.slice(0, 3).join(", ")}.`,
          requirements: [`Proven experience in ${skills[0]}`, `Familiarity with ${skills[1]}`, "Strong communication skills"],
          skills: skills,
          salary: getRandomSalary(level),
          jobType: "full-time",
          experience_level: level,
          url: "https://example.com/job",
          source: "jsearch",
          postedDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) // Random date in last 30 days
        });
      }
    }

    const result = await Job.insertMany(jobsToInsert);
    console.log(`Successfully seeded ${result.length} jobs.`);
    
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding jobs:", err);
    process.exit(1);
  }
}

seedJobs();
