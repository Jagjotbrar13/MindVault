import json

from fastapi import WebSocket, WebSocketDisconnect


async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    await websocket.send_json({"type": "connected"})
    orchestrator = websocket.app.state.services["orchestrator"]
    try:
        while True:
            payload = json.loads(await websocket.receive_text())
            query = payload.get("query", "")
            if not query:
                await websocket.send_json(
                    {"type": "error", "message": "Missing query."}
                )
                continue
            stream = await orchestrator.process_query(query, stream=True)
            async for line in stream:
                message = json.loads(line)
                await websocket.send_json(message)
    except WebSocketDisconnect:
        return
    except Exception as exc:
        await websocket.send_json({"type": "error", "message": str(exc)})
