export default function getEventListener(
  ws: WebSocket,
  msg: string
): (e: MessageEvent) => void {
  function ping(event: MessageEvent) {
    if (typeof event.data === "string" && event.data === "ping") {
      ws.send(msg);
    }
  }

  return ping;
}
