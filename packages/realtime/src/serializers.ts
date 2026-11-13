import type { RawData, SendData } from './transport.js';

/** Turns outgoing messages into frames and incoming frames into messages. */
export interface Serializer<In, Out> {
  encode(message: Out): SendData;
  /** Throwing rejects the frame: the connection reports a `decode-failed` error and stays open. */
  decode(data: RawData): In;
}

/** Frames as they are: strings for text, `ArrayBuffer` or `Blob` for binary. The default. */
export const raw: Serializer<RawData, SendData> = {
  encode: (message) => message,
  decode: (data) => data,
};

/** JSON over text frames. A binary frame fails to decode. */
export function json<In = unknown, Out = unknown>(): Serializer<In, Out> {
  return {
    encode: (message) => JSON.stringify(message),
    decode: (data) => {
      if (typeof data !== 'string') throw new TypeError('json(): received a binary frame');
      return JSON.parse(data) as In;
    },
  };
}
