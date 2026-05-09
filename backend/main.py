from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import anthropic
import os
from dotenv import load_dotenv
import uuid

from database import engine, get_db, Base, run_migrations
from models import Agent, Message

load_dotenv()

Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(title="MyAgentApp API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


class AgentCreate(BaseModel):
    name: str
    description: str
    system_prompt: Optional[str] = ""


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None


class ChatMessage(BaseModel):
    message: str


def agent_to_dict(agent: Agent) -> dict:
    return {
        "id": agent.id,
        "name": agent.name,
        "description": agent.description,
        "system_prompt": agent.system_prompt,
    }


def message_to_dict(msg: Message) -> dict:
    return {
        "id": msg.id,
        "role": msg.role,
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    }


@app.get("/")
def root():
    return {"status": "MyAgentApp API is running"}


@app.get("/agents")
def list_agents(db: Session = Depends(get_db)):
    return [agent_to_dict(a) for a in db.query(Agent).all()]


@app.post("/agents")
def create_agent(data: AgentCreate, db: Session = Depends(get_db)):
    agent = Agent(
        id=str(uuid.uuid4()),
        name=data.name,
        description=data.description,
        system_prompt=data.system_prompt or "",
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent_to_dict(agent)


@app.get("/agents/{agent_id}")
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent_to_dict(agent)


@app.put("/agents/{agent_id}")
def update_agent(agent_id: str, data: AgentUpdate, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if data.name is not None:
        agent.name = data.name
    if data.description is not None:
        agent.description = data.description
    if data.system_prompt is not None:
        agent.system_prompt = data.system_prompt
    db.commit()
    db.refresh(agent)
    return agent_to_dict(agent)


@app.delete("/agents/{agent_id}")
def delete_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(agent)
    db.commit()
    return {"message": "Agent deleted"}


@app.get("/agents/{agent_id}/messages")
def get_messages(agent_id: str, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return [message_to_dict(m) for m in agent.messages]


@app.delete("/agents/{agent_id}/messages")
def clear_messages(agent_id: str, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.query(Message).filter(Message.agent_id == agent_id).delete()
    db.commit()
    return {"message": "Conversation cleared"}


@app.post("/agents/{agent_id}/chat")
def chat_with_agent(agent_id: str, body: ChatMessage, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Save user message
    user_msg = Message(
        id=str(uuid.uuid4()),
        agent_id=agent_id,
        role="user",
        content=body.message,
    )
    db.add(user_msg)
    db.commit()

    # Build full conversation history for multi-turn context
    history = [
        {"role": m.role, "content": m.content}
        for m in agent.messages
        if m.id != user_msg.id
    ]
    history.append({"role": "user", "content": body.message})

    # Build system prompt
    base_prompt = f"You are {agent.name}. {agent.description}."
    system = f"{base_prompt}\n\n{agent.system_prompt}".strip() if agent.system_prompt else base_prompt

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system,
        messages=history,
    )

    reply_text = response.content[0].text

    # Save assistant reply
    assistant_msg = Message(
        id=str(uuid.uuid4()),
        agent_id=agent_id,
        role="assistant",
        content=reply_text,
    )
    db.add(assistant_msg)
    db.commit()

    return {"reply": reply_text}
