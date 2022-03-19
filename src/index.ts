export async function handleRequest(request: Request, env: Env): Promise<Response> {
  return new Response(`request method: ${request.method}`);
}

const worker: ExportedHandler<Env> = { fetch: handleRequest };
export default worker;
