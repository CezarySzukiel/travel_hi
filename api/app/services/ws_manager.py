from fastapi import WebSocket

import asyncio

import logging

logger = logging.getLogger(__name__)


class WSConnectionManager:

    def __init__(self):

        self.active_connections: list[WebSocket] = []

        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):

        await websocket.accept()

        async with self.lock:
            self.active_connections.append(websocket)

        logger.info(f"New connection: {len(self.active_connections)} active")

    async def disconnect(self, websocket: WebSocket):

        async with self.lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

        logger.info(f"Disconnected: {len(self.active_connections)} active")

    async def broadcast(self, message: dict):

        async with self.lock:

            connections = list(self.active_connections)

        for ws in connections:

            try:

                await ws.send_json(message)

            except Exception as e:

                logger.warning(f"Error sending to client: {e}")

                await self.disconnect(ws)


manager = WSConnectionManager()
