import { handleRequest } from "../src/index";

describe("handle", () => {
  test("handle GET", async () => {
    const env = getMiniflareBindings();
    const result = await handleRequest(new Request("http://localhost"), env);
    expect(result.status).toEqual(200);
    const text = await result.text();
    expect(text).toEqual("request method: GET");
  });
});
