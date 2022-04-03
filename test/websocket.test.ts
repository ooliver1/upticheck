import { check, handlePing, stuff } from "../src/webSocket";
import getEventListener from "./eventlistener";

test("resolves", async () => {
  const ev = new MessageEvent("message", { data: "pong" });
  await new Promise((resolve, reject) => {
    expect(check(ev, resolve, reject)).resolves.toBeNull();
  });
});

test("passes", async () => {
  const [client, server] = Object.values(new WebSocketPair());
  client.accept();
  server.accept();
  const listener = getEventListener(client, "pong");
  client.addEventListener("message", listener);
  expect(await (await handlePing(server, getMiniflareBindings(), "h"))()).toBe(true);
  client.removeEventListener("message", listener);
});

test("pings", async () => {
  expect(
    await stuff(async () => {
      return true;
    })
  ).toBe(true);
});
