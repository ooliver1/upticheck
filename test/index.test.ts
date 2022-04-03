import { handleRequest } from "../src/index";
import getEventListener from "./eventlistener";

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

function promiseWebsocketMsg(item: WebSocket): Promise<null> {
  return Promise.race([
    new Promise<null>((resolve, reject) => {
      const listener = (event: MessageEvent) => {
        item.removeEventListener("message", listener);
        if (typeof event.data === "string" && event.data === "ping") {
          resolve(null);
        } else {
          reject(null); // wtf is it doing
        }
      };
      item.addEventListener("message", listener);
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

  test("is 4504", async () => {
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

      ws.send("h");
      ws.addEventListener("message", getEventListener(ws, "AAA"));

      // let it run for a bit
      await new Promise((resolve) => setTimeout(resolve, 100, null));

      expect(promiseWebsocketErr(ws)).rejects.toEqual(4504);
    }
  });

  test("is again", async () => {
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

      // ping pong once, expect another ping
      ws.send("h");
      await promiseWebsocketMsg(ws);
      ws.send("pong");
      await new Promise((resolve) => setTimeout(resolve, 5100, null));

      expect(promiseWebsocketMsg(ws)).resolves.toBeNull();
    }
  }, 6500);
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

      // let it die
      await new Promise((resolve) => setTimeout(resolve, 7200, null));

      const res = await handleRequest(new Request("http://localhost/uptime/h"), env);
      expect(res.status).toEqual(503);
    }
  }, 7500);

  test("is 404", async () => {
    const env = getMiniflareBindings();
    const res = await handleRequest(
      new Request("http://localhost/uptime/doesntexist"),
      env
    );

    expect(res.status).toEqual(404);
  });

  test("is waiting", async () => {
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

      // let it wait
      await new Promise((resolve) => setTimeout(resolve, 2100, null));

      const resp = await handleRequest(new Request("http://localhost/uptime/h"), env);
      expect((await resp.text()).toLowerCase()).toContain("waiting");

      // let it DIE
      await new Promise((resolve) => setTimeout(resolve, 5100, null));

      const res = await handleRequest(new Request("http://localhost/uptime/h"), env);
      expect(res.status).toEqual(503);
    }
  }, 7500);
});
