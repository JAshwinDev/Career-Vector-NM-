const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || "http://localhost:5001").replace(/\/+$/, "");

module.exports = { ML_SERVICE_URL };
