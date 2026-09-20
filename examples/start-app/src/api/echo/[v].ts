// GET /api/echo/:v: params come from the file name ([v]).
export function GET(_request: Request, { params }: { params: { v: string } }) {
  return { echoed: params.v };
}
