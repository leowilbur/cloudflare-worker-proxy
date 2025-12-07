export interface Env { }

interface ProxyRequest {
   url: string;
   headers?: Record<string, string>;
   body?: unknown;
   method?: string;
}

export default {
   async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      if (request.method === "OPTIONS") {
         return new Response(null, {
            headers: {
               "Access-Control-Allow-Origin": "*",
               "Access-Control-Allow-Methods": "POST, OPTIONS",
               "Access-Control-Allow-Headers": "Content-Type",
            },
         });
      }

      const url = new URL(request.url);

      if (url.pathname === "/proxy" && request.method === "POST") {
         return handleProxy(request);
      }

      return new Response(JSON.stringify({ error: "Not Found" }), {
         status: 404,
         headers: { "Content-Type": "application/json" },
      });
   },
};

async function handleProxy(request: Request): Promise<Response> {
   try {
      const payload: ProxyRequest = await request.json();

      if (!payload.url) {
         return new Response(JSON.stringify({ error: "url is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
         });
      }

      const fetchOptions: RequestInit = {
         method: payload.method || "GET",
         headers: payload.headers || {},
      };

      if (payload.body && (payload.method == "POST" || payload.method == "PATCH" || payload.method == "PUT")) {
         fetchOptions.body = JSON.stringify(payload.body)
      }

      const response = await fetch(payload.url, fetchOptions);
      const responseBody = await response.arrayBuffer();

      const responseHeaders = new Headers();
      response.headers.forEach((value, key) => {
         if (!["content-encoding", "transfer-encoding"].includes(key.toLowerCase())) {
            responseHeaders.set(key, value);
         }
      });
      responseHeaders.set("Access-Control-Allow-Origin", "*");

      return new Response(responseBody, {
         status: response.status,
         headers: responseHeaders,
      });
   } catch (error) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
         status: 400,
         headers: { "Content-Type": "application/json" },
      });
   }
}
