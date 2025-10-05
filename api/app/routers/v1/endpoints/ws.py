from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.ws_manager import manager

router = APIRouter()


@router.websocket("")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)

    await ws.send_json({"type": "welcome", "message": "connected"})

    try:
        while True:
            msg = await ws.receive_text()
            await manager.broadcast({"type": "echo", "message": msg})

    except WebSocketDisconnect:
        await manager.disconnect(ws)
    except Exception as e:
        print("WS error:", e)
        await manager.disconnect(ws)
