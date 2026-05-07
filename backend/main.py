from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import anthropic
import os
from dotenv import load_dotenv
import uuid

load_dotenv()

app = FastAPI(title="MyAgentApp API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# In-memory store (we'll replace with a database later)
agents = {}


class AgentCreate(BaseModel):
    name: str
    description: str


class ChatMessage(BaseModel):
    message: str


@app.get("/")
def root():
    return {"status": "MyAgentApp API is running"}


@app.get("/agents")
def list_agents():
    return list(agents.values())


@app.post("/agents")
def create_agent(data: AgentCreate):
    agent_id = str(uuid.uuid4())
    agent = {"id": agent_id, "name": data.name, "description": data.description}
    agents[agent_id] = agent
    return agent


@app.get("/agents/{agent_id}")
def get_agent(agent_id: str):
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agents[agent_id]


@app.delete("/agents/{agent_id}")
def delete_agent(agent_id: str):
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    del agents[agent_id]
    return {"message": "Agent deleted"}


@app.post("/agents/{agent_id}/chat")
def chat_with_agent(agent_id: str, body: ChatMessage):
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = agents[agent_id]
    system_prompt = f"You are {agent['name']}. {agent['description']}. Be helpful, friendly, and concise."

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": body.message}],
    )

    return {"reply": response.content[0].text}
