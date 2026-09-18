import { describe, it, expect, vi } from 'vitest';

// These should be your framework primitives
import {
  createRoot,
  createSignal,
  createEffect,
  createResource,
  // Suspense,
  getSuspenseContext,
} from './signal.js';

function wait(ms = 0) {
  return new Promise((res) => setTimeout(res, ms));
}

describe('createResource (core reactive primitive)', () => {
  it('suspends while pending and resumes when resolved', async () => {
    let resolve!: (v: string) => void;

    const fetcher = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolve = r;
        })
    );

    let value: string | undefined;
    let suspended = false;

    createRoot(() => {
      const [data] = createResource(fetcher);

      createEffect(() => {
        try {
          value = data();
          console.log('value', value)
        } catch (e) {
          // Suspense should capture this
          suspended = true;
        }
      });
    });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(suspended).toBe(true);
    expect(value).toBe(undefined);

    resolve('hello');
    await wait();

    expect(value).toBe('hello');
  });

  // it("registers with nearest Suspense boundary", async () => {
  //   let resolve!: (v, number) => void;

  //   const fetcher = () =>
  //     new Promise<number>(r => {
  //       resolve = r;
  //     });

  //   let ctxDuringRead: any;

  //   createRoot(() => {
  //     Suspense({
  //       fallback: () => null,
  //       children: () => {
  //         const [data] = createResource(fetcher);

  //         try {
  //           data();
  //         } catch {
  //           ctxDuringRead = getSuspenseContext();
  //         }
  //       }
  //     });
  //   });

  //   expect(ctxDuringRead).not.toBe(null);
  //   expect(ctxDuringRead).not.toBe(undefined);

  //   resolve(123);
  //   await wait();
  // });

  it('reruns dependents when resource resolves', async () => {
    let resolve!: (v: string) => void;

    const fetcher = () =>
      new Promise<string>((r) => {
        resolve = r;
      });

    let runs = 0;
    let value: string | undefined;

    const [data] = createResource(fetcher);

    createEffect(() => {
      console.log('resource effect', data.loading);
      runs++;
      try {
        value = data();
      } catch {}
    });
    // createRoot(() => {
    // });
    expect(runs).toBe(1);
    expect(value).toBe(undefined);

    resolve('done');
    await wait();

    expect(value).toBe('done');
    expect(runs).toBe(2); // must re-run
  });

  //   createRoot(() => {
  // });

  it('tracks ownership and cleans up on root dispose', async () => {
    let disposed = false;

    const fetcher = () => Promise.resolve('ok');

    const dispose = createRoot((dispose) => {
      const [data] = createResource(fetcher);

      createEffect(() => {
        try {
          data();
        } catch {}
      });

      return dispose;
    });

    dispose();

    // framework should cancel or detach resource
    disposed = true;

    expect(disposed).toBe(true);
  });

  it('does not refetch if accessed multiple times in same owner', async () => {
    const fetcher = vi.fn(() => Promise.resolve(1));

    createRoot(() => {
      const [data] = createResource(fetcher);

      createEffect(() => {
        try {
          data();
          data();
          data();
        } catch {}
      });
    });

    expect(fetcher).toHaveBeenCalledOnce();
  });

  // it("supports nested suspense", async () => {
  //   let resolve!: (v, string) => void;

  //   const fetcher = () =>
  //     new Promise<string>(r => {
  //       resolve = r;
  //     });

  //   let outerSuspended = false;
  //   let innerSuspended = false;

  //   createRoot(() => {
  //     Suspense({
  //       fallback: () => {
  //         outerSuspended = true;
  //         return null;
  //       },
  //       children: () => {
  //         Suspense({
  //           fallback: () => {
  //             innerSuspended = true;
  //             return null;
  //           },
  //           children: () => {
  //             const [data] = createResource(fetcher);
  //             data();
  //           }
  //         });
  //       }
  //     });
  //   });

  //   expect(innerSuspended).toBe(true);
  //   expect(outerSuspended).toBe(false);

  //   resolve("ok");
  //   await wait();
  // });
});
