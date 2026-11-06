/** A Standard Schema validator (zod, valibot, arktype...): checks a job's data at send and before it runs. */
export interface StandardSchema<Output = unknown> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => { value: Output; issues?: undefined } | { issues: readonly { message: string }[] } | Promise<
      { value: Output; issues?: undefined } | { issues: readonly { message: string }[] }
    >;
  };
}

export interface RetryPolicy {
  /** Attempts after the first. */
  limit: number;
  /** Seconds before the first retry; doubled each time with `backoff`. */
  delaySeconds?: number;
  backoff?: boolean;
}

/** What a handler knows besides the data. */
export interface JobRun {
  id: string;
  /** 0 on the first attempt. */
  attempt: number;
  /** What `captureContext` took when the job was sent; also the locals of the request context around the handler. */
  context: Record<string, unknown>;
}

export interface JobDefinition<Data = unknown> {
  /** Unique, dotted: `invitations.send`. Also the queue's name. */
  readonly name: string;
  readonly schema?: StandardSchema<Data>;
  readonly retry: RetryPolicy;
  /** A run longer than this is failed and retried. */
  readonly timeoutSeconds: number;
  readonly handler: (data: Data, run: JobRun) => Promise<void> | void;
}

const NAME = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export class JobDefinitionError extends Error {}

/**
 * A background job. Delivery is at least once: a handler may run again after a crash or a
 * timeout, so it must be idempotent.
 */
export function defineJob<Data>(definition: {
  name: string;
  schema?: StandardSchema<Data>;
  retry?: Partial<RetryPolicy>;
  timeoutSeconds?: number;
  handler: (data: Data, run: JobRun) => Promise<void> | void;
}): JobDefinition<Data> {
  if (!NAME.test(definition.name)) throw new JobDefinitionError(`job name "${definition.name}" must be lowercase, dotted: "invitations.send"`);
  return Object.freeze({
    name: definition.name,
    schema: definition.schema,
    retry: { limit: definition.retry?.limit ?? 3, delaySeconds: definition.retry?.delaySeconds ?? 10, backoff: definition.retry?.backoff ?? true },
    timeoutSeconds: definition.timeoutSeconds ?? 15 * 60,
    handler: definition.handler,
  });
}
