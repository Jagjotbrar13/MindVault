import asyncio
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import aiosqlite
import networkx as nx
from networkx.readwrite import json_graph

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_STORAGE = PROJECT_ROOT / "backend" / "storage"
DB_PATH = BACKEND_STORAGE / "mindvault.db"
GRAPH_PATH = BACKEND_STORAGE / "graph.json"

NOW = datetime.now(timezone.utc)

DEMO_DOCS = [
    {
        "id": "demo-cmput402-lab1",
        "title": "CMPUT 402 Lab 1 Instructions",
        "source_type": "pdf",
        "summary": "Lab instructions for building Tartan locally, adding verification tests, and configuring GitHub Actions for continuous integration.",
        "chunk_count": 18,
        "tags": ["lecture-notes", "testing", "github-actions", "cmput-402", "todo"],
        "created_at": NOW - timedelta(hours=2),
        "reminder_due_at": NOW - timedelta(minutes=10),
        "reminder_frequency": "once",
        "reminder_status": "due",
    },
    {
        "id": "demo-tartan-system",
        "title": "Tartan Smart Home System Description",
        "source_type": "pdf",
        "summary": "Architecture notes for the Tartan smart-home platform, including sensors, controller responsibilities, safety modes, and expected behaviors.",
        "chunk_count": 34,
        "tags": ["project", "code", "testing", "architecture", "cmput-402"],
        "created_at": NOW - timedelta(hours=8),
        "reminder_due_at": None,
        "reminder_frequency": None,
        "reminder_status": "none",
    },
    {
        "id": "demo-github-actions-ci",
        "title": "GitHub Actions CI Checklist",
        "source_type": "text",
        "summary": "Personal checklist for CI: run Gradle build, execute unit tests, publish reports, and protect the main branch with required checks.",
        "chunk_count": 7,
        "tags": ["github-actions", "ci-cd", "testing", "todo", "code"],
        "created_at": NOW - timedelta(days=1, hours=1),
        "reminder_due_at": NOW + timedelta(hours=20),
        "reminder_frequency": "daily",
        "reminder_status": "scheduled",
    },
    {
        "id": "demo-unit-test-plan",
        "title": "Unit Test Plan for Tartan Requirements",
        "source_type": "text",
        "summary": "Draft plan for six verification tests covering mandatory R1 behavior, easy, medium, and hard requirements with regression notes.",
        "chunk_count": 9,
        "tags": ["testing", "unit-tests", "verification", "cmput-402", "todo"],
        "created_at": NOW - timedelta(days=1, hours=4),
        "reminder_due_at": NOW + timedelta(days=2),
        "reminder_frequency": "weekly",
        "reminder_status": "scheduled",
    },
    {
        "id": "demo-research-raft",
        "title": "Raft Consensus Research Notes",
        "source_type": "url",
        "summary": "Research notes explaining leader election, replicated logs, safety guarantees, and why Raft is easier to understand than Paxos.",
        "chunk_count": 12,
        "tags": ["research", "distributed-systems", "raft", "algorithms"],
        "created_at": NOW - timedelta(days=2, hours=3),
        "reminder_due_at": None,
        "reminder_frequency": None,
        "reminder_status": "none",
    },
    {
        "id": "demo-meeting-ta",
        "title": "TA Meeting Notes - Lab Automation",
        "source_type": "audio",
        "summary": "Meeting notes covering grading expectations, common CI mistakes, flaky tests, and how to explain fixes in the final report.",
        "chunk_count": 15,
        "tags": ["meeting-notes", "testing", "ci-cd", "cmput-402", "report"],
        "created_at": NOW - timedelta(days=3),
        "reminder_due_at": None,
        "reminder_frequency": None,
        "reminder_status": "none",
    },
    {
        "id": "demo-ui-inspiration",
        "title": "MindVault UI Inspiration Board",
        "source_type": "image",
        "summary": "Visual inspiration for glassmorphism panels, aurora backgrounds, graph constellations, and high-contrast focus states.",
        "chunk_count": 5,
        "tags": ["design", "mindvault", "ui", "inspiration"],
        "created_at": NOW - timedelta(days=4, hours=5),
        "reminder_due_at": None,
        "reminder_frequency": None,
        "reminder_status": "none",
    },
    {
        "id": "demo-weekly-review",
        "title": "Weekly Review - Software Testing Sprint",
        "source_type": "text",
        "summary": "Reflection note summarizing progress on tests, CI setup, Tartan documentation, and next actions for the project report.",
        "chunk_count": 6,
        "tags": ["weekly-review", "testing", "project", "reflection", "todo"],
        "created_at": NOW - timedelta(days=6),
        "reminder_due_at": NOW + timedelta(days=5),
        "reminder_frequency": "weekly",
        "reminder_status": "scheduled",
    },
]

DEMO_EDGES = [
    ("demo-cmput402-lab1", "demo-tartan-system", 0.91),
    ("demo-cmput402-lab1", "demo-github-actions-ci", 0.88),
    ("demo-cmput402-lab1", "demo-unit-test-plan", 0.86),
    ("demo-github-actions-ci", "demo-unit-test-plan", 0.84),
    ("demo-github-actions-ci", "demo-meeting-ta", 0.81),
    ("demo-unit-test-plan", "demo-meeting-ta", 0.79),
    ("demo-tartan-system", "demo-unit-test-plan", 0.78),
    ("demo-weekly-review", "demo-unit-test-plan", 0.83),
    ("demo-weekly-review", "demo-github-actions-ci", 0.80),
    ("demo-ui-inspiration", "demo-weekly-review", 0.66),
    ("demo-research-raft", "demo-tartan-system", 0.67),
]

DEMO_QUERIES = [
    (
        "demo-query-1",
        "Summarize my CMPUT 402 lab instructions",
        "Your lab work centers on building Tartan locally, writing verification tests, and wiring GitHub Actions for CI.",
        "phi3:mini",
        0.86,
        NOW - timedelta(minutes=25),
    ),
    (
        "demo-query-2",
        "What reminders are coming up for testing?",
        "You have a due Lab 1 reminder now and upcoming CI/unit-test reminders over the next two days.",
        "llama3:8b",
        0.82,
        NOW - timedelta(hours=3),
    ),
    (
        "demo-query-3",
        "Which notes connect to GitHub Actions?",
        "The CI checklist links strongly to Lab 1 instructions, unit-test planning, and TA meeting notes.",
        "llama3:8b",
        0.88,
        NOW - timedelta(days=1),
    ),
]


async def ensure_schema(db: aiosqlite.Connection) -> None:
    await db.execute("""CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY, title TEXT, source_type TEXT, file_path TEXT, url TEXT,
        summary TEXT, created_at TIMESTAMP, chunk_count INTEGER, metadata TEXT, centroid TEXT,
        tags TEXT DEFAULT '[]', reminder_due_at TEXT, reminder_frequency TEXT,
        reminder_status TEXT DEFAULT 'none', reminder_completed_at TEXT)""")
    await db.execute("""CREATE TABLE IF NOT EXISTS query_history (
        id TEXT PRIMARY KEY, query TEXT, answer TEXT, model_used TEXT, confidence REAL, created_at TIMESTAMP)""")
    await db.execute(
        """CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMP)"""
    )
    for column, definition in {
        "tags": "TEXT DEFAULT '[]'",
        "reminder_due_at": "TEXT",
        "reminder_frequency": "TEXT",
        "reminder_status": "TEXT DEFAULT 'none'",
        "reminder_completed_at": "TEXT",
    }.items():
        rows = await (await db.execute("PRAGMA table_info(documents)")).fetchall()
        if column not in {row[1] for row in rows}:
            await db.execute(f"ALTER TABLE documents ADD COLUMN {column} {definition}")


async def seed_database() -> None:
    BACKEND_STORAGE.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await ensure_schema(db)
        await db.execute("DELETE FROM documents WHERE id LIKE 'demo-%'")
        await db.execute("DELETE FROM query_history WHERE id LIKE 'demo-%'")
        for index, doc in enumerate(DEMO_DOCS):
            centroid = [0.0] * 8
            centroid[index % len(centroid)] = 1.0
            await db.execute(
                """INSERT OR REPLACE INTO documents
                (id,title,source_type,file_path,url,summary,created_at,chunk_count,metadata,centroid,tags,reminder_due_at,reminder_frequency,reminder_status,reminder_completed_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    doc["id"],
                    doc["title"],
                    doc["source_type"],
                    "",
                    "",
                    doc["summary"],
                    doc["created_at"].isoformat(),
                    doc["chunk_count"],
                    json.dumps({"demo": True}),
                    json.dumps(centroid),
                    json.dumps(doc["tags"]),
                    doc["reminder_due_at"].isoformat()
                    if doc["reminder_due_at"]
                    else None,
                    doc["reminder_frequency"],
                    doc["reminder_status"],
                    None,
                ),
            )
        for query in DEMO_QUERIES:
            await db.execute(
                "INSERT OR REPLACE INTO query_history (id,query,answer,model_used,confidence,created_at) VALUES (?,?,?,?,?,?)",
                (
                    query[0],
                    query[1],
                    query[2],
                    query[3],
                    query[4],
                    query[5].isoformat(),
                ),
            )
        await db.execute(
            "INSERT OR REPLACE INTO app_state (key,value,updated_at) VALUES (?,?,?)",
            (
                "digest_read_daily",
                (NOW - timedelta(days=2)).date().isoformat(),
                NOW.isoformat(),
            ),
        )
        await db.commit()


def seed_graph() -> None:
    GRAPH_PATH.parent.mkdir(parents=True, exist_ok=True)
    if GRAPH_PATH.exists():
        graph = json_graph.node_link_graph(
            json.loads(GRAPH_PATH.read_text(encoding="utf-8"))
        )
    else:
        graph = nx.Graph()
    for node in list(graph.nodes):
        if str(node).startswith("demo-"):
            graph.remove_node(node)
    for doc in DEMO_DOCS:
        graph.add_node(
            doc["id"],
            title=doc["title"],
            type=doc["source_type"],
            summary=doc["summary"],
            chunk_count=doc["chunk_count"],
        )
    for source, target, weight in DEMO_EDGES:
        graph.add_edge(source, target, weight=weight)
    GRAPH_PATH.write_text(
        json.dumps(json_graph.node_link_data(graph), indent=2), encoding="utf-8"
    )


async def main() -> None:
    await seed_database()
    seed_graph()
    print(
        f"Seeded {len(DEMO_DOCS)} demo memories, {len(DEMO_EDGES)} graph links, and {len(DEMO_QUERIES)} query history items."
    )
    print(f"Database: {DB_PATH}")
    print(f"Graph: {GRAPH_PATH}")
    print("Restart the backend so the in-memory graph reloads from graph.json.")


if __name__ == "__main__":
    asyncio.run(main())
