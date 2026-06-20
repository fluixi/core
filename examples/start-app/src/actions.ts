// A server function: the body runs only on the server; the client gets an RPC stub.
export const getServerTime = async (): Promise<string> => {
  'use server';
  return new Date().toISOString();
};
