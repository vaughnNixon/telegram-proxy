export default async (request, context) => {
  const url = new URL(request.url);
  
  console.log(`[Netlify] Received request: ${request.method} ${url.pathname}`);
  
  // 1. If it's a webhook POST from Telegram, relay it to Hugging Face
  if (url.pathname === "/telegram-webhook" && request.method === "POST") {
    const spaceHost = "znslzlkzkekejzlzm-hermesspace.hf.space";
    const targetUrl = `https://${spaceHost}/telegram-webhook`;
    
    const headers = new Headers(request.headers);
    headers.delete('host');
    
    // Retrieve the HF_TOKEN and clean it
    let hfToken = Netlify.env.get("HF_TOKEN") || Deno.env.get("HF_TOKEN");
    if (hfToken) {
      hfToken = hfToken.trim(); // Remove any leading/trailing spaces or newlines
      console.log(`[Netlify] HF_TOKEN detected! Length: ${hfToken.length} characters`);
      headers.set("Authorization", `Bearer ${hfToken}`);
    } else {
      console.warn("[Netlify] WARNING: HF_TOKEN is missing or undefined!");
    }
    
    try {
      console.log(`[Netlify] Relaying webhook to: ${targetUrl}`);
      
      // We set redirect: "manual" so Deno doesn't automatically follow redirects and strip our headers
      let response = await fetch(targetUrl, {
        method: "POST",
        headers: headers,
        body: await request.text(),
        redirect: "manual"
      });
      
      console.log(`[Netlify] Hugging Face responded with status: ${response.status}`);
      
      // If Hugging Face redirects us, we follow it manually and preserve the Authorization header!
      if (response.status >= 300 && response.status < 400) {
        const redirectUrl = response.headers.get("location");
        console.log(`[Netlify] Following manual redirect to: ${redirectUrl}`);
        
        response = await fetch(redirectUrl, {
          method: "POST",
          headers: headers, // Retains the Authorization header!
          body: await request.text()
        });
        console.log(`[Netlify] Redirect target responded with status: ${response.status}`);
      }
      
      return response;
    } catch (e) {
      console.error("[Netlify] ERROR: Relay to HF failed: ", e);
      return new Response("Relay failed", { status: 502 });
    }
  }

  // 2. Otherwise, act as a standard proxy to Telegram
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
