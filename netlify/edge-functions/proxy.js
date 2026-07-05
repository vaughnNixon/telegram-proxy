export default async (request, context) => {
  const url = new URL(request.url);
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
