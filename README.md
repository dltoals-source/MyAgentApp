# MyAgentApp

A no-code AI agent builder platform for non-technical users.

## Project Structure

```
MyAgentApp/
├── frontend/    # Next.js web app
├── backend/     # Python FastAPI + Claude AI
└── wintermaze/  # Separate project: a browser maze tower defense
```

`wintermaze/` is unrelated to the agent builder — its own stack, its own
dependencies, its own README. The instructions below apply only to MyAgentApp.

## Getting Started

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
