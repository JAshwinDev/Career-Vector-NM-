function uniqueSkills(skills) {
  return [...new Set((skills || []).map((skill) => String(skill).trim()).filter(Boolean))];
}

function parseSkillsInput(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return uniqueSkills(value);
  }

  return uniqueSkills(
    String(value)
      .split(/[\n,;]+/)
      .map((skill) => skill.trim())
  );
}

module.exports = {
  uniqueSkills,
  parseSkillsInput
};
