export const POST = async ({ request }: { request: Request }) => {
  const configured = import.meta.env.PUBLIC_API_BASE_URL?.trim();
  const apiBase = configured ? configured.replace(/\/$/, "") : "http://localhost:5001/api";
  const body = await request.text();

  const response = await fetch(`${apiBase}/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": request.headers.get("content-type") || "application/json",
    },
    body,
  });

  const payload = await response.text();
  const headers: Record<string, string> = {
    "Content-Type": response.headers.get("content-type") || "application/json",
  };

  const cookie = response.headers.get("set-cookie");
  if (cookie) {
    headers["Set-Cookie"] = cookie;
  }

  return new Response(payload, {
    status: response.status,
    headers,
  });
};