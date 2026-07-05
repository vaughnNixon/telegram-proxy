export default async (request, context) => {
  const url = new URL(request.url);
  
  // 1. If it's a webhook POST from Telegram, relay it to Hugging Face
  if (url.pathname === "/telegram-webhook" && request.method === "POST") {
    const spaceHost = "znslzlkzkekejzlzm-hermesspace.hf.space";
    const targetUrl = `https://${spaceHost}/telegram-webhook`;
    
    const headers = new Headers(request.headers);
    headers.delete('host');
    
    try {
      return await fetch(targetUrl, {
        method: "POST",
        headers: headers,
        body: await request.text()
      });
    } catch (e) {
      console.error("Relay to HF failed: ", e);
      return new Response("Relay failed", { status: 502 });
    }
  }

  // 2. Otherwise, act as a standard proxy to Telegram (for getMe, setWebhook, etc.)
  const targetUrl = new URL(url.pathname + url.search, 'https://api.telegram.org');
  const headers = new Headers(request.headers);
  headers.delete('host');

  const response = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers
  });
};
