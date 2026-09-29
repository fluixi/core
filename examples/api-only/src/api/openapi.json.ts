import { apiRoutes } from '@fluixi/start/api-routes';
import { openApiRoute } from '@fluixi/api';

// The description of this API, from the route contracts. Import it into Postman or any OpenAPI tool.
export const GET = openApiRoute(() => apiRoutes, {
  title: 'Fluixi API-only example',
  version: '0.1.0',
  servers: [{ url: 'http://localhost:3400', description: 'Local' }],
});
