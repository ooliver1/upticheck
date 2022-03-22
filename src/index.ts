import handleUptime from "./uptime";
import handleWebSocket from "./websocket";

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/ws") {
    return handleWebSocket(request, env);
  } else if (url.pathname.startsWith("/uptime")) {
    return handleUptime(
      request,
      env,
      url.pathname.substring(url.pathname.lastIndexOf("/") + 1)
    );
  }

  return new Response('<img src="https://http.cat/404" />', {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

const worker: ExportedHandler<Env> = { fetch: handleRequest };
export default worker;
