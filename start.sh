#!/bin/bash
# ╔══════════════════════════════════════════════════════╗
# ║           CareerVector — Full Stack Startup          ║
# ╚══════════════════════════════════════════════════════╝

BOLD="\033[1m"; GREEN="\033[0;32m"; CYAN="\033[0;36m"
YELLOW="\033[0;33m"; RED="\033[0;31m"; RESET="\033[0m"

echo ""
echo -e "${BOLD}${CYAN}  ⚡  CareerVector + AI Job Assistant${RESET}"
echo -e "  Bridging the Employability Gap for Engineering Graduates"
echo ""

# ── Pre-flight checks ──
if ! command -v python3 &>/dev/null; then echo -e "${RED}❌ Python 3 not found.${RESET}"; exit 1; fi
if ! command -v node &>/dev/null;    then echo -e "${RED}❌ Node.js not found.${RESET}"; exit 1; fi

# ── Check .env ──
if [ ! -f "backend/.env" ]; then
  echo -e "${YELLOW}⚠️  backend/.env not found!${RESET}"
  echo -e "   Copy backend/.env.example → backend/.env and add your keys."
  echo -e "   The backend will start but MongoDB and Gemini features won't work."
  echo ""
fi

# ── Install deps ──
echo -e "${YELLOW}[1/4] Python ML dependencies...${RESET}"
pip install -r ml-service/requirements.txt -q --break-system-packages 2>/dev/null || \
pip install -r ml-service/requirements.txt -q

echo -e "${YELLOW}[2/4] Backend Node.js dependencies...${RESET}"
cd backend && npm install --silent && cd ..

echo -e "${YELLOW}[3/4] Frontend dependencies...${RESET}"
cd frontend && npm install --silent && cd ..

echo -e "${YELLOW}[4/4] Launching services...${RESET}"
echo ""
echo -e "${GREEN}  🤖 ML Service (Python/Flask) → http://localhost:5001${RESET}"
echo -e "${GREEN}  ⚙️  Backend (Node.js/Express) → http://localhost:5000${RESET}"
echo -e "${GREEN}  🌐 Frontend (React/Vite)     → http://localhost:3000${RESET}"
echo ""
echo -e "${BOLD}  Chrome Extension:${RESET}"
echo -e "  1. Open chrome://extensions  2. Enable Developer Mode"
echo -e "  3. Load unpacked → select the ${BOLD}extension/${RESET} folder"
echo ""
echo -e "${BOLD}  Press Ctrl+C to stop all services${RESET}"
echo ""

trap 'echo ""; echo "Shutting down all services..."; kill 0' EXIT

python3 ml-service/app.py &
sleep 2
node backend/server.js &
sleep 1
cd frontend && npm run dev &

wait
