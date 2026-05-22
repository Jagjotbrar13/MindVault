import json
import sys

import requests

API = "http://localhost:8000"


def show(title: str, payload: object) -> None:
    print(f"\n== {title} ==")
    print(json.dumps(payload, indent=2) if not isinstance(payload, str) else payload)


def main() -> None:
    health_response = requests.get(f"{API}/health", timeout=10)
    health_response.raise_for_status()
    health = health_response.json()
    show("health", health)

    if health.get("status") != "ok":
        print("Health check failed.", file=sys.stderr)
        sys.exit(1)

    sample_response = requests.post(
        f"{API}/ingest",
        files={},
        data={
            "text": "Machine learning is a field of AI where systems learn patterns from data."
        },
        timeout=120,
    )
    sample_response.raise_for_status()
    sample = sample_response.json()
    show("sample text", sample)

    answer_response = requests.post(
        f"{API}/query",
        json={"query": "What is machine learning?", "stream": False},
        timeout=180,
    )
    answer_response.raise_for_status()
    answer = answer_response.json()
    show(
        "query",
        {"answer": answer.get("answer"), "confidence": answer.get("confidence")},
    )

    if "confidence" not in answer:
        print("Query result did not include confidence.", file=sys.stderr)
        sys.exit(1)

    graph_response = requests.get(f"{API}/graph", timeout=10)
    graph_response.raise_for_status()
    graph = graph_response.json()
    show(
        "graph",
        {"nodes": len(graph.get("nodes", [])), "links": len(graph.get("links", []))},
    )

    if not graph.get("nodes"):
        print("Graph verification failed: expected at least one node.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
