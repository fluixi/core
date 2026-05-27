import { ApiResponse, BaseStore } from "./api/types";

// export async function withLoading<T>(fn: () => Promise<T>, store: BaseStore<T extends ApiResponse<infer V> ? V extends Array<infer U> ? U : V : never>): Promise<T> {
export async function withLoading<T>(fn: () => Promise<T>, store: BaseStore<T extends ApiResponse<infer V> ? 'V' : never>): Promise<T> {
  store.setLoading(true);
  store.setError(null);
  try {
    return await fn();
  } catch (err) {
    store.setError((err as Error).message);
    throw err;
  } finally {
    store.setLoading(false);
  }
}

