import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from api.routes import graph, health, ingest, memory, query
from api.websocket import websocket_endpoint
from ingestion.pipeline import IngestPipeline
from memory.embedder import Embedder
from memory.graph_builder import GraphBuilder
from memory.retriever import Retriever
from orchestrator.orchestrator import MasterOrchestrator
from storage.database import Database
from storage.graph import KnowledgeGraph
from storage.vector_store import VectorStore
from utils.ollama_client import OllamaClient

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    storage_root = Path(os.getenv("STORAGE_PATH", "storage"))
    for name in ["uploads", "images", "thumbnails", "screenshots", "chroma"]:
        (storage_root / name).mkdir(parents=True, exist_ok=True)
    database = Database()
    await database.initialize()
    vector_store = VectorStore()
    graph_store = KnowledgeGraph()
    ollama = OllamaClient()
    embedder = Embedder(ollama)
    retriever = Retriever(embedder, vector_store)
    graph_builder = GraphBuilder(graph_store, database)
    pipeline = IngestPipeline(embedder, vector_store, database, graph_builder)
    app.state.services = {
        "database": database,
        "vector_store": vector_store,
        "graph": graph_store,
        "ollama": ollama,
        "embedder": embedder,
        "retriever": retriever,
        "pipeline": pipeline,
        "orchestrator": MasterOrchestrator(retriever, database),
    }
    yield


app = FastAPI(title="MindVault API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_ORIGIN", "http://localhost:3000"),
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(ingest.router)
app.include_router(query.router)
app.include_router(graph.router)
app.include_router(memory.router)
app.include_router(health.router)
app.add_api_websocket_route("/ws", websocket_endpoint)


@app.get("/")
async def root() -> dict:
    return {"name": "MindVault", "status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
