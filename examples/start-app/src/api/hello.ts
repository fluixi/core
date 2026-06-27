// GET /api/hello — a file-based API route (returns a Web Response or a plain value → JSON).
export function GET() {
  return Response.json({ msg: 'hello from a fluixi api route' });
}

export function POST(request: Request) {
  return Response.json({ method: 'POST', url: request.url });
}
