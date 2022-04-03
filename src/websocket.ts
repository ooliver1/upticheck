export function check(
  ev: MessageEvent,
  res: (arg0: any) => void,
  rej: (arg0: any) => void
): void {
  if (typeof ev.data === "string" && ev.data === "pong") {
    res(null);
  } else {
    rej(null); // wtf is it doing
  }
}

export async function stuff(ping: () => Promise<boolean>): Promise<boolean> {
  const passed = await ping();

  if (passed) {
    setTimeout(ping, 5 * 1000);
    return true;
  }

  return false;
}

function promiseWebsocketMsg(item: WebSocket): Promise<null> {
  return Promise.race([
    new Promise<null>((resolve, reject) => {
      const listener = (event: MessageEvent) => {
        item.removeEventListener("message", listener);
        check(event, resolve, reject);
      };
      item.addEventListener("message", listener);
    }),
    new Promise<null>((_, reject) => {
      setTimeout(() => {
        reject(null); // took over 1s to respond
      }, 1000);
    }),
  ]);
}

export async function handlePing(webSocket: WebSocket, env: Env, name: string) {
  async function ping() {
    // await for first call

    try {
      webSocket.send("ping");
    } catch (e) {
      if (e instanceof TypeError) {
        // cannot call on closed ws
        return false;
      }
    }

    try {
      await promiseWebsocketMsg(webSocket); // 1s or msg
    } catch {
      try {
        webSocket.close(4504, "Ping timeout");
      } catch (e) {
        if (e instanceof TypeError) {
          // cannot close closed ws
          return false;
        }
      }

      await env.UPTIME.put(name, "waiting");

      // wait for 5s to see if reconnect
      await new Promise<null>((resolve) => setTimeout(resolve, 5000, null));

      if ((await env.UPTIME.get(name)) === "waiting") {
        await env.UPTIME.put(name, "down");
      }
      return false;
    }

    return true;
  }

  // @ts-ignore
  setTimeout(async () => {
    await stuff(ping);
  }, 1000);
  // im so sorry but i need to 'test'

  return ping;
}

function handleSession(webSocket: WebSocket, env: Env) {
  webSocket.accept();

  webSocket.addEventListener("message", async (event: MessageEvent) => {
    const name = event.data;
    if (name instanceof ArrayBuffer) {
      return webSocket.close(4400, "Expected string message");
    }

    await env.UPTIME.put(name, new Date().toISOString());
    await handlePing(webSocket, env, name);
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
