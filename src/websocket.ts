// check me out with my comments here

function handleSession(webSocket: WebSocket, env: Env) {
  webSocket.accept();
  console.log("h");

  webSocket.addEventListener("message", async (event: MessageEvent) => {
    const name = event.data;
    if (name instanceof ArrayBuffer) {
      return webSocket.close(4400, "Expected string message");
    }

    await env.UPTIME.put(name, new Date().toISOString());
    webSocket.addEventListener("close", async () => {
      await env.UPTIME.put(name, "down");
    });
  });
}

function instantClose(webSocket: WebSocket, code: number, reason: string) {
  webSocket.accept();

  // open event and/or readyState would be so ideal cloudflare, please
  webSocket.addEventListener("message", () => {
    return webSocket.close(code, reason);
  });
}

export default function handleWebSocket(request: Request, env: Env): Response {
  // upgr as it all aligns
  const upgrHeader = request.headers.get("Upgrade");
  const authHeader = request.headers.get("Authorization");

  const [client, server] = Object.values(new WebSocketPair());

  if (!upgrHeader || upgrHeader !== "websocket") {
    return new Response("Expected Upgrade: Websocket", { status: 426 });
  }

  // codes prepended with 4 - websocket custom codes (4{4xx-http})
  if (!authHeader) {
    instantClose(server, 4401, "Expected Authorization header");
  } else if (authHeader !== env.KEY) {
    instantClose(server, 4403, "Invalid Authorization header");
  } else {
    handleSession(server, env);
  }

  return new Response(null, { status: 101, webSocket: client });
}
