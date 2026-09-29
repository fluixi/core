import { route } from '@fluixi/api';
import { z } from 'zod';

export const GET = route({
  response: z.object({ status: z.literal('ok') }),
  handler: () => ({ status: 'ok' as const }),
});
