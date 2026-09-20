// GET /api/whoami — reports what the request looks like after the middleware ran, which
// makes the header layers observable from curl rather than only from a test.
import { userFromRequest } from '../services/auth.js';
import { requestIdFor } from '../services/request-id.js';

export function GET(request: Request) {
  const user = userFromRequest(request);
  return {
    name: user.name,
    roles: user.roles,
    anonymous: user.anonymous,
    requestId: requestIdFor(request) ?? null,
  };
}
