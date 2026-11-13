export class BoundedJsonError extends Error {
  constructor(readonly reason: 'response_too_large' | 'invalid_json') {
    super('Upstream JSON response rejected');
  }
}

/** Counts decoded bytes, including streamed/chunked bodies; never retains or reports error bodies. */
export async function readBoundedJson(response: Response, maximumBytes = 65536): Promise<unknown> {
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  if (reader) {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }
      received += chunk.value.byteLength;
      if (received > maximumBytes) {
        await reader.cancel().catch(() => undefined);
        throw new BoundedJsonError('response_too_large');
      }
      chunks.push(chunk.value);
    }
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return value;
  } catch {
    throw new BoundedJsonError('invalid_json');
  }
}
