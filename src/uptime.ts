import durationToHuman from "./duration";

export default async function handleUptime(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const uptime = await env.UPTIME.get(path);

  if (uptime === null) {
    return new Response('Service not found <img src="https://http.cat/404" />', {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (uptime === "down") {
    return new Response("Service is down", { status: 503 });
  }

  const date = new Date(uptime);

  const diff = (new Date().getTime() - date.getTime()) / 1000;

  return new Response(`Service is up for ${durationToHuman(diff)}`, { status: 200 });
}