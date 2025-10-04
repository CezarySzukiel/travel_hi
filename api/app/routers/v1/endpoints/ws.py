from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.ws_manager import manager

router = APIRouter()


@router.websocket("/")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    try:

        while True:
            data = await websocket.receive_json()

            await manager.broadcast({"echo": data})

    except WebSocketDisconnect:

        await manager.disconnect(websocket)
