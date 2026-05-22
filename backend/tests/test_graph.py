from storage.graph import KnowledgeGraph


def test_graph_persists_and_returns_d3_data(tmp_path) -> None:
    graph_path = tmp_path / "graph.json"
    graph = KnowledgeGraph(str(graph_path))
    graph.add_document("doc-1", "First", ["alpha"], "text", "first summary")
    graph.add_document("doc-2", "Second", ["beta"], "pdf", "second summary")
    graph.add_relation("doc-1", "doc-2", 0.75)

    data = graph.get_graph_data()

    assert graph_path.exists()
    assert {node["id"] for node in data["nodes"]} == {"doc-1", "doc-2"}
    assert data["links"] == [{"source": "doc-1", "target": "doc-2", "weight": 0.75}]
    assert graph.find_related("doc-1") == ["doc-2"]

    reloaded = KnowledgeGraph(str(graph_path))
    assert reloaded.find_related("doc-2") == ["doc-1"]
