import type { WebSocket } from "ws";
import type { PlaceMessageDTO } from "@nzila/shared";

const rooms = new Map<string, Set<WebSocket>>();

export function subscribeToPlace(placeId: string, socket: WebSocket): () => void {
  const room = rooms.get(placeId) ?? new Set<WebSocket>();
  room.add(socket);
  rooms.set(placeId, room);

  return () => {
    room.delete(socket);
    if (room.size === 0) rooms.delete(placeId);
  };
}

export function broadcastPlaceMessage(placeId: string, message: PlaceMessageDTO): void {
  const room = rooms.get(placeId);
  if (!room) return;

  const payload = JSON.stringify({ type: "message", message });
  for (const socket of room) {
    if (socket.readyState !== 1) continue;
    try {
      socket.send(payload);
    } catch {
      room.delete(socket);
    }
  }
}

export function closePlaceRealtime(): void {
  for (const room of rooms.values()) {
    for (const socket of room) {
      try {
        socket.close(1001, "server shutting down");
      } catch {
        void 0;
      }
    }
  }
  rooms.clear();
}
