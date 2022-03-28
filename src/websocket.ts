// check me out with my comments here

declare const MINIFLARE: boolean;

function handleSession(webSocket: WebSocket, env: Env) {
  webSocket.accept();

  webSocket.addEventListener("message", async (event: MessageEvent) => {
    const name = event.data;
    if (name instanceof ArrayBuffer) {
      return webSocket.close(4400, "Expected string message");
    }

    await env.UPTIME.put(name, new Date().toISOString());
    const a = await fetch(env.WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "h" }),
    });
    console.log(a.status, await a.text());
    console.log("h");
    webSocket.addEventListener("error", async (event: Event) => {
      await fetch(env.WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `error: ${event.type}: ${event}` }),
      });
    });
    webSocket.addEventListener("close", async (event: CloseEvent) => {
      await fetch(env.WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `closed with ${event.code}` }),
      });
      if (event.code !== 1006) {
        await env.UPTIME.put(name, "down");
      } else {
        await env.UPTIME.put(name, "waiting");

        // wait for 10s to see if reconnect

        await new Promise<null>((resolve) => setTimeout(resolve, 10000, null));

        if ((await env.UPTIME.get(name)) === "waiting") {
          await env.UPTIME.put(name, "down");
        }
      }
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
