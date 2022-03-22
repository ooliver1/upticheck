import { handleRequest } from "../src/index";

function promiseWebsocketErr(item: WebSocket): Promise<null> {
  return Promise.race([
    new Promise<null>((_, reject) => {
      const listener = (event: CloseEvent) => {
        item.removeEventListener("close", listener);
        reject(event.code);
      };
      item.addEventListener("close", listener);
    }),
    new Promise<null>((resolve) => setTimeout(resolve, 1000, null)),
  ]);
}

describe("http status", () => {
  test("is 404", async () => {
    const env = getMiniflareBindings();
    const result = await handleRequest(new Request("http://localhost/"), env);
    expect(result.status).toBe(404);
  });

  test("is 426", async () => {
    const env = getMiniflareBindings();
    const result = await handleRequest(new Request("http://localhost/ws"), env);
    expect(result.status).toEqual(426);
  });
});

describe("websocket status", () => {
  test("is 4401", async () => {
    const env = getMiniflareBindings();
    const req = await handleRequest(
      new Request("ws://localhost/ws", { headers: { Upgrade: "websocket" } }),
      env
    );
    const ws = req.webSocket;
    expect(ws).not.toBeUndefined();

    if (ws) {
      ws.accept();

      ws.send("h");
      expect(promiseWebsocketErr(ws)).rejects.toEqual(4401);
    }
  });

  test("is 4403", async () => {
    const env = getMiniflareBindings();
    const req = await handleRequest(
      new Request("ws://localhost/ws", {
        headers: { Authorization: "invalid", Upgrade: "websocket" },
      }),
      env
    );
    const ws = req.webSocket;
    expect(ws).not.toBeUndefined();

    if (ws) {
      ws.accept();

      ws.send("h");
      expect(promiseWebsocketErr(ws)).rejects.toEqual(4403);
    }
  });

  test("is 4400", async () => {
    const env = getMiniflareBindings();
    const req = await handleRequest(
      new Request("ws://localhost/ws", {
        headers: { Upgrade: "websocket", Authorization: env.KEY },
      }),
      env
    );
    const ws = req.webSocket;
    expect(ws).not.toBeUndefined();

    if (ws) {
      ws.accept();

      // chaotic way to get a buffer
      ws.send(new Uint8Array(["h".charCodeAt(0)]).buffer);
      expect(promiseWebsocketErr(ws)).rejects.toEqual(4400);
    }
  });
});

describe("uptime", () => {
  test("is 200", async () => {
    const env = getMiniflareBindings();
    const result = await handleRequest(
      new Request("http://localhost/ws", {
        headers: { Authorization: env.KEY, Upgrade: "websocket" },
      }),
      env
    );

    const ws = result.webSocket;

    expect(ws).not.toBeUndefined();
    if (ws) {
      ws.accept();
      ws.send("h");

      // let it set
      await new Promise((resolve) => setTimeout(resolve, 1, null));

      const res = await handleRequest(new Request("http://localhost/uptime/h"), env);
      expect(res.status).toEqual(200);
      ws.close();
    }
  });

  test("is 503", async () => {
    const env = getMiniflareBindings();
    const result = await handleRequest(
      new Request("http://localhost/ws", {
        headers: { Authorization: env.KEY, Upgrade: "websocket" },
      }),
      env
    );

    const ws = result.webSocket;

    expect(ws).not.toBeUndefined();
    if (ws) {
      ws.accept();
      ws.send("h");

      // let it set
      await new Promise((resolve) => setTimeout(resolve, 1, null));

      ws.close();

      // let it set
      await new Promise((resolve) => setTimeout(resolve, 1, null));

      const res = await handleRequest(new Request("http://localhost/uptime/h"), env);
      expect(res.status).toEqual(503);
    }
  });

  test("is 404", async () => {
    const env = getMiniflareBindings();
    const res = await handleRequest(
      new Request("http://localhost/uptime/doesntexist"),
      env
    );

    expect(res.status).toEqual(404);
  });
});
