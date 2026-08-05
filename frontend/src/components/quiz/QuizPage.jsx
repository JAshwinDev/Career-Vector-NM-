"use client";

import React, { useState, useEffect } from "react";
import { logInteraction } from "../../utils/api.js";

export default function QuizPage({ targetRole = "Software Developer", onQuizComplete }) {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    generateQuiz();
  }, [targetRole]);

  // Timer
  useEffect(() => {
    if (!loading && !submitted) {
      const timer = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [loading, submitted]);

  const generateQuiz = async () => {
    try {
      const response = await fetch("http://localhost:5000/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          numQuestions: 10
        })
      });

      const data = await response.json();
      setQuiz(data);
    } catch (err) {
      console.error("Failed to generate quiz:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (option) => {
    const questionId = quiz.questions[currentQuestion].id;
    setAnswers({
      ...answers,
      [questionId]: option
    });
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    const answersList = quiz.questions.map((q) => ({
      questionId: q.id,
      selectedAnswer: answers[q.id] || ""
    }));

    try {
      const response = await fetch(`http://localhost:5000/quiz/${quiz.quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answersList,
          timeSpent
        })
      });

      const data = await response.json();
      setResults(data);
      setSubmitted(true);
      await logInteraction({
        interactionType: "quiz_complete",
        matchScore: data.percentageScore,
        timeSpent,
        actionDetails: {
          targetRole,
          totalQuestions: data.totalQuestions,
          suggestions: data.suggestions || []
        }
      }).catch(() => {});
    } catch (err) {
      console.error("Failed to submit quiz:", err);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loader}>Loading quiz...</div>
      </div>
    );
  }

  if (submitted && results) {
    return (
      <div style={styles.container}>
        <div style={styles.resultsCard}>
          <h1 style={styles.resultsTitle}>Quiz Completed!</h1>

          <div
            style={{
              ...styles.scoreCircle,
              backgroundColor: results.percentageScore >= 80
                ? "#10b981"
                : results.percentageScore >= 60
                ? "#f59e0b"
                : "#ef4444"
            }}
          >
            <div style={styles.scoreNumber}>{results.percentageScore}%</div>
            <div style={styles.scoreLabel}>
              {results.score} / {results.totalQuestions}
            </div>
          </div>

          <div style={styles.feedbackBox}>
            <h2>{results.feedback.message}</h2>
            <p>{results.feedback.recommendation}</p>
          </div>

          <div style={styles.skillsPerformance}>
            <h3>Skills Performance</h3>
            {Object.entries(results.skillsPerformance).map(([skill, percentage]) => (
              <div key={skill} style={styles.skillPerformanceItem}>
                <span style={styles.skillName}>{skill}</span>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${percentage}%`,
                      backgroundColor: percentage >= 80 ? "#10b981" : percentage >= 60 ? "#f59e0b" : "#ef4444"
                    }}
                  />
                </div>
                <span style={styles.percentText}>{percentage}%</span>
              </div>
            ))}
          </div>

          <div style={styles.suggestionsBox}>
            <h3>Recommendations</h3>
            <ul>
              {results.suggestions.map((suggestion, idx) => (
                <li key={idx} style={styles.suggestionItem}>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          <div style={styles.actionsBox}>
            <button
              style={styles.retakeBtn}
              onClick={() => {
                setSubmitted(false);
                setAnswers({});
                setCurrentQuestion(0);
                setTimeSpent(0);
                generateQuiz();
              }}
            >
              Retake Quiz
            </button>
            <button
              style={styles.roadmapBtn}
              onClick={() => {
                onQuizComplete?.({
                  targetRole,
                  roadmap: [],
                  quizResults: results,
                  skillGaps: (results.suggestions || []).map((suggestion) => ({
                    skill: suggestion.replace(/^Improve your\s+|^Review advanced concepts in\s+/i, "").split(" - ")[0],
                    recommendation: suggestion
                  }))
                });
                if (!onQuizComplete) {
                  window.location.href = `/roadmap?targetRole=${encodeURIComponent(targetRole)}`;
                }
              }}
            >
              View Roadmap
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>Failed to load quiz questions.</div>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const answered = answers[question.id] !== undefined;

  return (
    <div style={styles.container}>
      <div style={styles.quizCard}>
        <div style={styles.quizHeader}>
          <h1 style={styles.quizTitle}>{targetRole} Readiness Check</h1>
          <div style={styles.progressInfo}>
            Question {currentQuestion + 1} / {quiz.questions.length}
          </div>
        </div>

        <div style={styles.progressBarContainer}>
          <div
            style={{
              ...styles.progressBar,
              width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%`
            }}
          />
        </div>

        <div style={styles.questionBox}>
          <div style={styles.skillTag}>Skill: {question.skill}</div>
          <h2 style={styles.questionText}>{question.question}</h2>

          <div style={styles.optionsContainer}>
            {question.options.map((option, idx) => (
              <button
                key={idx}
                style={{
                  ...styles.optionButton,
                  backgroundColor:
                    answers[question.id] === option
                      ? "#3b82f6"
                      : "#f3f4f6",
                  color: answers[question.id] === option ? "white" : "#1f2937"
                }}
                onClick={() => handleAnswerSelect(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.navigationBox}>
          <button
            style={styles.navButton}
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            ← Previous
          </button>

          {currentQuestion === quiz.questions.length - 1 ? (
            <button
              style={{
                ...styles.navButton,
                backgroundColor: answered ? "#10b981" : "#d1d5db"
              }}
              onClick={handleSubmit}
              disabled={!answered}
            >
              Submit Quiz
            </button>
          ) : (
            <button
              style={styles.navButton}
              onClick={handleNext}
              disabled={!answered}
            >
              Next →
            </button>
          )}
        </div>

        <div style={styles.timeDisplay}>
          ⏱️ Time: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "32px 20px",
    backgroundColor: "#f9fafb",
    minHeight: "100vh"
  },
  quizCard: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "28px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
  },
  quizHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px"
  },
  quizTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    margin: "0",
    color: "#111827"
  },
  progressInfo: {
    fontSize: "13px",
    color: "#6b7280"
  },
  progressBarContainer: {
    width: "100%",
    height: "6px",
    backgroundColor: "#e5e7eb",
    borderRadius: "4px",
    marginBottom: "24px",
    overflow: "hidden"
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#3b82f6",
    transition: "width 0.3s"
  },
  questionBox: {
    marginBottom: "24px"
  },
  skillTag: {
    display: "inline-block",
    backgroundColor: "#e0e7ff",
    color: "#4338ca",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    marginBottom: "15px",
    fontWeight: "500"
  },
  questionText: {
    fontSize: "20px",
    fontWeight: "bold",
    margin: "15px 0",
    color: "#111827"
  },
  optionsContainer: {
    display: "grid",
    gap: "12px"
  },
  optionButton: {
    padding: "15px",
    border: "2px solid transparent",
    borderRadius: "8px",
    fontSize: "15px",
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "left",
    fontWeight: "500"
  },
  navigationBox: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "20px"
  },
  navButton: {
    flex: 1,
    padding: "12px 20px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s"
  },
  timeDisplay: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: "13px"
  },
  loader: {
    textAlign: "center",
    padding: "40px",
    fontSize: "16px",
    color: "#6b7280"
  },
  resultsCard: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "28px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    textAlign: "center"
  },
  resultsTitle: {
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "24px",
    color: "#111827"
  },
  scoreCircle: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
    color: "white"
  },
  scoreNumber: {
    fontSize: "36px",
    fontWeight: "bold"
  },
  scoreLabel: {
    fontSize: "14px",
    marginTop: "5px"
  },
  feedbackBox: {
    backgroundColor: "#f3f4f6",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "30px"
  },
  skillsPerformance: {
    marginBottom: "30px",
    textAlign: "left"
  },
  skillPerformanceItem: {
    display: "grid",
    gridTemplateColumns: "150px 1fr 50px",
    alignItems: "center",
    gap: "15px",
    marginBottom: "15px"
  },
  skillName: {
    fontWeight: "500",
    color: "#111827"
  },
  progressFill: {
    height: "8px",
    borderRadius: "4px",
    transition: "width 0.3s"
  },
  percentText: {
    fontSize: "12px",
    fontWeight: "bold"
  },
  suggestionsBox: {
    textAlign: "left",
    marginBottom: "30px"
  },
  suggestionItem: {
    marginBottom: "10px",
    color: "#374151",
    lineHeight: "1.6"
  },
  actionsBox: {
    display: "flex",
    gap: "15px",
    justifyContent: "center"
  },
  retakeBtn: {
    padding: "12px 24px",
    backgroundColor: "#6b7280",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500"
  },
  roadmapBtn: {
    padding: "12px 24px",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500"
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    padding: "20px",
    borderRadius: "8px",
    textAlign: "center"
  }
};
