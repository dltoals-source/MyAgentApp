# MyAgentApp — Project Context

> **This repo holds two unrelated projects.** Everything below describes
> **MyAgentApp** (`backend/`, `frontend/`). The `wintermaze/` directory is a
> separate browser game with its own `CLAUDE.md`, dependencies, and toolchain —
> read `wintermaze/CLAUDE.md` when working in there and ignore this file.


## What this is
A no-code AI agent builder. Users create custom AI agents with their own name, description, and personality instructions, then chat with them. The goal is to evolve into a platform where agents can use real tools (web search, email, calendar, etc.) and multiple AI models — so users can build agents that do actual grunt work, not just chat.

## Tech stack
- **Frontend:** Next.js 15 (App Router, TypeScript, Tailwind CSS) — `frontend/`
- **Backend:** Python FastAPI + SQLite (SQLAlchemy) — `backend/`
- **AI:** Anthropic Claude (`claude-sonnet-4-6`) via the `anthropic` Python SDK
- **Database:** SQLite file at `backend/agents.db` (auto-created on first run)

## How to run
```bash
# Backend (Terminal 1)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (Terminal 2)
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000
Backend: http://localhost:8000
API docs: http://localhost:8000/docs

## Environment setup
Copy `backend/.env.example` to `backend/.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-...
```

## What's been built (prototype complete)
- **Dashboard** — live agent list, Chat/Edit/Delete per agent, empty state
- **Create Agent** — name, description, system prompt field, 4 preset personality templates
- **Edit Agent** — same form pre-populated, saves via PUT
- **Chat page** — persistent multi-turn history (saved to DB), full conversation sent to Claude on each message, Clear chat button
- **Backend API** — full CRUD for agents + message history endpoints
- **SQLite persistence** — agents and messages survive restarts
- **Auto-migration** — new DB columns added without wiping data
- **Nav bar** — global layout with MyAgentApp logo + My Agents link

## Backend API summary
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/agents` | List all agents |
| POST | `/agents` | Create agent |
| GET | `/agents/:id` | Get agent |
| PUT | `/agents/:id` | Update agent |
| DELETE | `/agents/:id` | Delete agent |
| GET | `/agents/:id/messages` | Get chat history |
| DELETE | `/agents/:id/messages` | Clear chat history |
| POST | `/agents/:id/chat` | Send message (calls Claude) |

## Key files
- `backend/main.py` — all API endpoints
- `backend/models.py` — Agent + Message SQLAlchemy models
- `backend/database.py` — DB engine, session, migration helper
- `frontend/app/dashboard/page.tsx` — agent list
- `frontend/app/agents/new/page.tsx` — create form
- `frontend/app/agents/[id]/page.tsx` — chat UI
- `frontend/app/agents/[id]/edit/page.tsx` — edit form

## Roadmap (agreed direction)

### Phase 1 — Tools (next up)
Give agents real capabilities. Start with:
- Web search (Brave/Serper API)
- URL reader (fetch + parse a webpage)
- Send email
- Users toggle which tools each agent has access to
- Use Claude's native tool use (function calling) API

### Phase 2 — Multi-model support
- Add **LiteLLM** as a backend abstraction layer
- Users pick Claude / GPT-4o / Gemini / Llama per agent
- Users bring their own API keys per model

### Phase 3 — Custom tools
- Users connect their own APIs via webhook
- Define tool name, description, input/output schema, endpoint URL

### Phase 4 — Multi-step workflows
- Agent plans and executes a sequence of actions autonomously
- Human-in-the-loop approval before irreversible steps (send email, post, etc.)

### Phase 5 — Agent-to-agent orchestration
- A "manager" agent breaks tasks into sub-agents
- Each sub-agent specializes (researcher, writer, executor)

### Self-evolution (runs alongside all phases)
- Collect thumbs up/down ratings on chat messages
- Background job: Claude analyzes conversation + ratings → suggests system prompt improvements
- Auto-generate new preset templates from real usage patterns
- Agents flag their own uncertain responses for future prompt tuning

## Build order
**Web app first, then mobile app (React Native).** Do not start mobile work until web is feature-complete and tested.

## GitHub
https://github.com/dltoals-source/MyAgentApp

## Notes for next session
- API key not yet added — chat feature untested end-to-end
- Start Phase 1: add tool support to agents (web search first)
- Need to add thumbs up/down rating UI to chat page (data collection for self-evolution)
