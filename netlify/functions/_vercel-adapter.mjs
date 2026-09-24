import { Buffer } from 'node:buffer';

function normalizeHeaders(headers = {}) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value.join(',') : String(value)]));
}

export function adaptVercelHandler(handler) {
  return async function netlifyHandler(event) {
    const headers = normalizeHeaders(event.headers);
    let body = event.body;
    if (event.isBase64Encoded && typeof body === 'string') body = Buffer.from(body, 'base64').toString('utf8');
    if (body && typeof body === 'string' && headers['content-type']?.includes('application/json')) {
      try { body = JSON.parse(body); } catch { body = undefined; }
    }

    const req = { method: event.httpMethod, headers, body, query: event.queryStringParameters || {} };
    const response = { statusCode: 200, headers: {}, body: '' };
    const res = {
      setHeader(name, value) { response.headers[name] = String(value); },
      status(code) { response.statusCode = code; return res; },
      json(value) { response.headers['Content-Type'] ||= 'application/json'; response.body = JSON.stringify(value); return response; },
      end(value = '') { response.body = typeof value === 'string' ? value : ''; return response; },
    };

    const result = await handler(req, res);
    if (result && typeof result === 'object' && 'statusCode' in result) return result;
    return response;
  };
}
