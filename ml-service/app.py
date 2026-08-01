from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import re
import pdfplumber

app = Flask(__name__)
CORS(app)

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "job_roles.json")
with open(DATA_PATH, "r", encoding="utf-8") as file_handle:
    JOB_DATA = json.load(file_handle)

ROLES = JOB_DATA["roles"]

ALL_SKILLS = set()
for role_data in ROLES.values():
    ALL_SKILLS.update(role_data["required_skills"].keys())

SKILL_ALIASES = {
    "js": "JavaScript",
    "javascript": "JavaScript",
    "react js": "React",
    "ts": "TypeScript",
    "typescript": "TypeScript",
    "py": "Python",
    "python": "Python",
    "ml": "Machine Learning",
    "machine learning": "Machine Learning",
    "dl": "Deep Learning",
    "deep learning": "Deep Learning",
    "ds": "Data Structures",
    "data structures": "Data Structures",
    "oop": "OOP",
    "object oriented": "OOP",
    "react.js": "React",
    "reactjs": "React",
    "node js": "Node.js",
    "node.js": "Node.js",
    "nodejs": "Node.js",
    "express": "Node.js",
    "express.js": "Node.js",
    "tensorflow": "TensorFlow",
    "tf": "TensorFlow",
    "pytorch": "PyTorch",
    "scikit-learn": "Scikit-learn",
    "scikit learn": "Scikit-learn",
    "sklearn": "Scikit-learn",
    "mongodb": "NoSQL",
    "nosql": "NoSQL",
    "mysql": "SQL",
    "postgresql": "SQL",
    "postgres": "SQL",
    "sql": "SQL",
    "aws": "AWS",
    "amazon web services": "AWS",
    "gcp": "GCP",
    "google cloud": "GCP",
    "azure": "Azure",
    "microsoft azure": "Azure",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "ci/cd": "CI/CD",
    "github actions": "CI/CD",
    "cicd": "CI/CD",
    "git": "Git",
    "github": "Git",
    "linux": "Linux",
    "unix": "Linux",
    "html5": "HTML",
    "html": "HTML",
    "css3": "CSS",
    "css": "CSS",
    "tailwind": "Tailwind CSS",
    "next.js": "Next.js",
    "nextjs": "Next.js",
    "power bi": "Power BI",
    "powerbi": "Power BI",
    "tableau": "Tableau",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "matplotlib": "Matplotlib",
    "excel": "Excel",
    "ms excel": "Excel",
    "jira": "JIRA",
    "agile": "Agile",
    "scrum": "Agile",
    "c++": "C++",
    "cpp": "C++",
    "c#": "C#",
    "csharp": "C#",
    "kotlin": "Kotlin",
    "swift": "Swift",
    "flutter": "Flutter",
    "dart": "Flutter",
    "solidity": "Solidity",
    "figma": "Figma",
    "selenium": "Selenium",
    "postman": "Postman",
    "rest": "REST API",
    "rest api": "REST API",
    "restful api": "REST API",
    "restful": "REST API",
    "api": "REST API"
}


def normalize_skill(skill):
    lower = str(skill).lower().strip()
    if not lower:
        return ""
    return SKILL_ALIASES.get(lower, str(skill).title().strip())


def dedupe_skills(skills):
    unique = []
    seen = set()

    for skill in skills or []:
        normalized = normalize_skill(skill)
        key = normalized.lower()
        if normalized and key not in seen:
            seen.add(key)
            unique.append(normalized)

    return unique


def clean_text_for_matching(text):
    return re.sub(r"\s+", " ", str(text or "").replace("\u00a0", " ")).strip()


def iter_skill_terms(skill):
    base = str(skill or "").strip().lower()
    if not base:
        return set()

    terms = {base}
    terms.add(base.replace(".", " "))
    terms.add(base.replace(".", ""))
    terms.add(base.replace("-", " "))
    terms.add(base.replace("/", " "))
    terms.add(base.replace("/", ""))
    terms.add(base.replace(" ", ""))

    if base.endswith(".js"):
        terms.add(base.replace(".js", " js"))
        terms.add(base.replace(".js", "js"))

    return {term.strip() for term in terms if term.strip()}


def skill_term_matches(text_lower, term):
    special_patterns = {
        "c++": r"(?<!\w)c\+\+(?!\w)",
        "c#": r"(?<!\w)c#(?!\w)",
        "ci/cd": r"\bci\s*/?\s*cd\b"
    }

    pattern = special_patterns.get(term)
    if not pattern:
        pattern = r"\b" + re.escape(term) + r"\b"

    return re.search(pattern, text_lower) is not None


def extract_text_from_pdf(pdf_file):
    text = ""
    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text


def extract_skills_from_text(text):
    found_skills = []
    seen = set()
    text_lower = clean_text_for_matching(text).lower()

    for skill in sorted(ALL_SKILLS, key=len, reverse=True):
        if any(skill_term_matches(text_lower, term) for term in iter_skill_terms(skill)):
            normalized = normalize_skill(skill)
            key = normalized.lower()
            if key not in seen:
                seen.add(key)
                found_skills.append(normalized)

    for alias, canonical in SKILL_ALIASES.items():
        if any(skill_term_matches(text_lower, term) for term in iter_skill_terms(alias)):
            normalized = normalize_skill(canonical)
            key = normalized.lower()
            if key not in seen:
                seen.add(key)
                found_skills.append(normalized)

    return found_skills


def extract_skills_from_requirement_lines(lines):
    if not lines:
        return []

    if isinstance(lines, list):
        combined = " ".join(str(line or "") for line in lines)
    else:
        combined = str(lines or "")

    return extract_skills_from_text(combined)


def build_recommendation(score):
    if score >= 65:
        return "APPLY NOW"
    if score >= 35:
        return "MAYBE APPLY"
    return "SKIP - Low Match"


def compute_compatibility(student_skills, role_name):
    if role_name not in ROLES:
        return 0.0, [], []

    role_skills = ROLES[role_name]["required_skills"]
    student_skill_set = set(skill.lower() for skill in dedupe_skills(student_skills))
    total_weight = sum(role_skills.values())
    matched_weight = 0.0
    matched_skills = []
    missing_skills = []

    for skill, weight in role_skills.items():
        if skill.lower() in student_skill_set:
            matched_weight += weight
            matched_skills.append(skill)
        else:
            missing_skills.append({"skill": skill, "weight": weight})

    missing_skills.sort(key=lambda item: item["weight"], reverse=True)
    weighted_score = (matched_weight / total_weight) if total_weight > 0 else 0.0

    return round(weighted_score * 100, 1), matched_skills, missing_skills


def compute_all_role_scores(skills):
    scores = {}
    for role_name in ROLES:
        score, _, _ = compute_compatibility(skills, role_name)
        scores[role_name] = score

    return dict(sorted(scores.items(), key=lambda item: item[1], reverse=True))


def infer_target_role(job_description, job_skills):
    role_scores = compute_all_role_scores(job_skills)
    if role_scores and next(iter(role_scores.values()), 0) > 0:
        target_role = next(iter(role_scores.keys()))
        return target_role, dict(list(role_scores.items())[:5])

    description_lower = str(job_description or "").lower()
    heuristic_scores = {}

    for role_name, role_data in ROLES.items():
        score = 0
        role_lower = role_name.lower()

        if role_lower in description_lower:
            score += 30

        for token in role_lower.split():
            if len(token) > 3 and token in description_lower:
                score += 6

        description_tokens = set(re.findall(r"[a-zA-Z]{4,}", role_data["description"].lower()))
        score += min(sum(1 for token in description_tokens if token in description_lower) * 2, 35)
        heuristic_scores[role_name] = score

    sorted_scores = dict(sorted(heuristic_scores.items(), key=lambda item: item[1], reverse=True))
    target_role = next(iter(sorted_scores.keys()), "Software Developer")

    return target_role, dict(list(sorted_scores.items())[:5])


def generate_roadmap(missing_skills, role_name):
    if role_name not in ROLES:
        return []

    role_roadmap_data = ROLES[role_name].get("roadmap", {})
    # Create case-insensitive lookup map for roadmap skills
    roadmap_lookup = {skill.lower(): (skill, data) for skill, data in role_roadmap_data.items()}
    
    roadmap = []
    top_missing = [item["skill"] for item in missing_skills[:10]]
    week = 1

    for skill_name in top_missing:
        skill_lower = skill_name.lower()
        if skill_lower in roadmap_lookup:
            original_skill, data = roadmap_lookup[skill_lower]
            roadmap.append({
                "skill": skill_name,
                "duration": data["duration"],
                "resources": data["resources"],
                "start_week": week
            })

            duration_match = re.search(r"(\d+)", data["duration"])
            if duration_match:
                week += int(duration_match.group(1))
        else:
            roadmap.append({
                "skill": skill_name,
                "duration": "2 weeks",
                "resources": [
                    {
                        "title": f'Search "{skill_name}" on YouTube',
                        "url": f'https://www.youtube.com/results?search_query={skill_name.replace(" ", "+")}+tutorial',
                        "type": "video"
                    },
                    {
                        "title": f"{skill_name} - freeCodeCamp",
                        "url": f'https://www.freecodecamp.org/news/search/?query={skill_name.replace(" ", "+")}',
                        "type": "article"
                    }
                ],
                "start_week": week
            })
            week += 2

    return roadmap


def build_job_match_analysis(job_description, user_skills, job_requirements=None, job_requirements_text=None):
    normalized_user_skills = dedupe_skills(user_skills)
    cleaned_job_description = clean_text_for_matching(job_description)
    extracted_requirement_skills = extract_skills_from_requirement_lines(job_requirements_text)
    job_skills = dedupe_skills(extract_skills_from_text(cleaned_job_description))

    if job_requirements:
        job_skills = dedupe_skills(job_skills + job_requirements)

    if extracted_requirement_skills:
        job_skills = dedupe_skills(job_skills + extracted_requirement_skills)

    target_role, inferred_role_scores = infer_target_role(cleaned_job_description, job_skills)
    role_score, role_matched, role_missing = compute_compatibility(normalized_user_skills, target_role)

    user_skill_set = {skill.lower() for skill in normalized_user_skills}
    matched_job_skills = [skill for skill in job_skills if skill.lower() in user_skill_set]
    job_overlap_score = round((len(matched_job_skills) / max(len(job_skills), 1)) * 100, 1) if job_skills else role_score

    role_skill_weights = {
        skill.lower(): weight for skill, weight in ROLES[target_role]["required_skills"].items()
    }

    missing_map = {
        item["skill"].lower(): {
            "skill": item["skill"],
            "weight": item["weight"]
        }
        for item in role_missing
    }

    for skill in job_skills:
        key = skill.lower()
        if key in user_skill_set:
            continue

        current = missing_map.get(key, {"skill": skill, "weight": 0})
        current["skill"] = current.get("skill") or skill
        current["weight"] = max(current.get("weight", 0), role_skill_weights.get(key, 1.0))
        missing_map[key] = current

    missing_details = sorted(missing_map.values(), key=lambda item: item["weight"], reverse=True)
    roadmap = generate_roadmap(missing_details, target_role)
    user_role_scores = dict(list(compute_all_role_scores(normalized_user_skills).items())[:5])
    matched_skills = dedupe_skills(matched_job_skills + role_matched)
    missing_skills = [item["skill"] for item in missing_details[:8]]
    final_score = round((role_score * 0.7) + (job_overlap_score * 0.3), 1)
    rounded_score = int(round(final_score))
    recommendation = build_recommendation(rounded_score)

    if missing_skills:
        summary = (
            f"This job aligns most closely with {target_role}. "
            f"Focus on {', '.join(missing_skills[:3])} to improve your match."
        )
    else:
        summary = f"This job aligns most closely with {target_role}, and your profile already covers the main requirements."

    return {
        "job_skills": job_skills,
        "target_role": target_role,
        "role_description": ROLES[target_role]["description"],
        "compatibility_score": rounded_score,
        "matchScore": rounded_score,
        "matched_skills": matched_skills,
        "matchedSkills": matched_skills,
        "missing_skills": missing_details[:8],
        "missingSkills": missing_skills,
        "roadmap": roadmap,
        "all_role_scores": user_role_scores,
        "allRoleScores": user_role_scores,
        "inferred_role_scores": inferred_role_scores,
        "student_skills": normalized_user_skills,
        "studentSkills": normalized_user_skills,
        "recommendation": recommendation,
        "summary": summary
    }



@app.route("/roles", methods=["GET"])
def get_roles():
    roles_info = {}
    for role_name, data in ROLES.items():
        roles_info[role_name] = {
            "description": data["description"],
            "skill_count": len(data["required_skills"])
        }

    return jsonify(roles_info)


@app.route("/analyze", methods=["POST"])
def analyze():
    target_role = request.form.get("role", "")
    manual_skills = request.form.get("skills", "")
    student_skills = []

    if "resume" in request.files:
        pdf_file = request.files["resume"]
        if pdf_file.filename.endswith(".pdf"):
            try:
                text = extract_text_from_pdf(pdf_file)
                student_skills = extract_skills_from_text(text)
            except Exception as exc:
                return jsonify({"error": f"PDF parsing failed: {str(exc)}"}), 400

    if manual_skills:
        student_skills.extend(manual_skills.split(","))

    student_skills = dedupe_skills(student_skills)

    if not student_skills:
        return jsonify({"error": "No skills found. Please upload a resume or enter skills manually."}), 400

    if not target_role or target_role not in ROLES:
        return jsonify({"error": f'Invalid role. Choose from: {", ".join(ROLES.keys())}'}), 400

    score, matched, missing = compute_compatibility(student_skills, target_role)
    roadmap = generate_roadmap(missing, target_role)
    all_scores = dict(list(compute_all_role_scores(student_skills).items())[:5])

    return jsonify({
        "student_skills": student_skills,
        "target_role": target_role,
        "compatibility_score": score,
        "matched_skills": matched,
        "missing_skills": missing[:8],
        "roadmap": roadmap,
        "all_role_scores": all_scores,
        "role_description": ROLES[target_role]["description"]
    })


@app.route("/recommend", methods=["POST"])
def recommend_roles():
    data = request.get_json(silent=True) or {}
    user_skills = dedupe_skills(data.get("skills", []))

    if not user_skills:
        return jsonify({"error": "No skills provided"}), 400

    recommendations = []

    for role_name in ROLES:
        score, matched, missing = compute_compatibility(user_skills, role_name)
        if score > 20:
            recommendations.append({
                "role": role_name,
                "matchScore": score,
                "matchedSkills": matched,
                "missingSkills": [item["skill"] for item in missing[:5]],
                "description": ROLES[role_name]["description"]
            })

    recommendations.sort(key=lambda item: item["matchScore"], reverse=True)

    return jsonify({"recommendations": recommendations[:5]})


@app.route("/skills/extract", methods=["POST"])
def extract_skills_endpoint():
    student_skills = []

    if "resume" in request.files:
        pdf_file = request.files["resume"]
        try:
            text = extract_text_from_pdf(pdf_file)
            student_skills = extract_skills_from_text(text)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 400

    text_input = request.form.get("text", "")
    if text_input:
        student_skills.extend(extract_skills_from_text(text_input))

    return jsonify({"skills": dedupe_skills(student_skills)})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/job-match", methods=["POST"])
def job_match():
    data = request.get_json(silent=True) or {}
    job_description = str(data.get("jobDescription", "")).strip()
    user_skills = dedupe_skills(data.get("userSkills", []))
    job_requirements = dedupe_skills(data.get("jobRequirements", []))
    job_requirements_text = data.get("jobRequirementsText", [])

    if not job_description:
        return jsonify({"error": "jobDescription is required."}), 400

    if not user_skills:
        return jsonify({"error": "userSkills are required."}), 400

    return jsonify(build_job_match_analysis(job_description, user_skills, job_requirements, job_requirements_text))


@app.route("/generate-roadmap", methods=["POST"])
def generate_roadmap_endpoint():
    data = request.get_json(silent=True) or {}
    user_skills = dedupe_skills(data.get("userSkills", []))
    job_skills = dedupe_skills(data.get("jobSkills", []))
    target_role = data.get("targetRole", "")
    job_requirements = dedupe_skills(data.get("jobRequirements", []))

    if not user_skills:
        return jsonify({"error": "userSkills are required."}), 400

    # Combine job skills and requirements for better roadmap
    all_job_skills = dedupe_skills(job_skills + job_requirements)

    # Determine target role if not provided
    if not target_role:
        target_role = infer_target_role_from_skills(all_job_skills, user_skills)

    # Generate comprehensive roadmap
    roadmap_data = generate_comprehensive_roadmap(user_skills, all_job_skills, target_role)

    return jsonify({
        "roadmap": roadmap_data["roadmap"],
        "targetRole": target_role,
        "skillGaps": roadmap_data["skill_gaps"],
        "estimatedTime": roadmap_data["estimated_time"],
        "learningPath": roadmap_data["learning_path"]
    })


def infer_target_role_from_skills(job_skills, user_skills):
    """Infer the most likely target role based on job skills and user skills"""
    if not job_skills:
        return "Software Developer"

    # Calculate compatibility scores for all roles
    role_scores = {}
    for role_name, role_data in ROLES.items():
        role_required_skills = set(skill.lower() for skill in role_data["required_skills"].keys())
        job_skill_set = set(skill.lower() for skill in job_skills)

        # Calculate overlap between job skills and role requirements
        overlap = len(role_required_skills.intersection(job_skill_set))
        total_required = len(role_required_skills)

        if total_required > 0:
            role_scores[role_name] = (overlap / total_required) * 100

    # Return the role with highest compatibility
    if role_scores:
        return max(role_scores.items(), key=lambda x: x[1])[0]

    return "Software Developer"


def generate_comprehensive_roadmap(user_skills, job_skills, target_role):
    """Generate a comprehensive learning roadmap based on skill gaps"""
    user_skill_set = set(skill.lower() for skill in user_skills)
    job_skill_set = set(skill.lower() for skill in job_skills)

    # Identify skill gaps
    skill_gaps = []
    for skill in job_skills:
        if skill.lower() not in user_skill_set:
            skill_gaps.append(skill)

    # Get role-specific roadmap if available
    role_roadmap_data = {}
    roadmap_lookup = {}
    if target_role in ROLES:
        role_roadmap_data = ROLES[target_role].get("roadmap", {})
        # Create case-insensitive lookup map for roadmap skills
        roadmap_lookup = {skill.lower(): (skill, data) for skill, data in role_roadmap_data.items()}

    # Generate learning path
    learning_path = []
    current_week = 1

    # Prioritize critical skills first
    critical_skills = ["JavaScript", "Python", "SQL", "Git", "React", "Node.js"]
    prioritized_gaps = []

    # Add critical skills that are missing
    for skill in critical_skills:
        if skill in skill_gaps:
            prioritized_gaps.append(skill)

    # Add remaining gaps
    for skill in skill_gaps:
        if skill not in prioritized_gaps:
            prioritized_gaps.append(skill)

    for skill in prioritized_gaps[:12]:  # Limit to top 12 skills
        skill_info = {
            "skill": skill,
            "priority": "high" if skill in critical_skills else "medium",
            "startWeek": current_week,
            "duration": 2,  # Default 2 weeks
            "resources": []
        }

        # Use role-specific data if available
        skill_lower = skill.lower()
        if skill_lower in roadmap_lookup:
            original_skill, roadmap_info = roadmap_lookup[skill_lower]
            skill_info["duration"] = int(re.search(r"(\d+)", roadmap_info["duration"]).group(1)) if re.search(r"(\d+)", roadmap_info["duration"]) else 2
            skill_info["resources"] = roadmap_info["resources"]
        else:
            # Generate default resources
            skill_info["resources"] = [
                {
                    "title": f"{skill} Fundamentals - freeCodeCamp",
                    "url": f"https://www.freecodecamp.org/news/search/?query={skill.replace(' ', '+')}",
                    "type": "article",
                    "platform": "freeCodeCamp"
                },
                {
                    "title": f"{skill} Tutorial - YouTube",
                    "url": f"https://www.youtube.com/results?search_query={skill.replace(' ', '+')}+tutorial",
                    "type": "video",
                    "platform": "YouTube"
                },
                {
                    "title": f"{skill} Documentation",
                    "url": f"https://developer.mozilla.org/en-US/search?q={skill.replace(' ', '+')}",
                    "type": "documentation",
                    "platform": "MDN"
                }
            ]

        learning_path.append(skill_info)
        current_week += skill_info["duration"]

    # Calculate estimated time
    total_weeks = sum(item["duration"] for item in learning_path)
    estimated_time = f"{total_weeks} weeks"

    return {
        "roadmap": learning_path,
        "skill_gaps": skill_gaps,
        "estimated_time": estimated_time,
        "learning_path": learning_path
    }


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
