// 鉴权（dev/a）：HMAC 签名会话 cookie，密码来自 env（本地默认 admin123，生产用 wrangler secret put）
const encoder = new TextEncoder();

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function hmacHex(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createSessionToken(secret: string): Promise<string> {
  const payload = btoa(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS }));
  return `${payload}.${await hmacHex(payload, secret)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  if (payload === undefined || sig === undefined) return false;
  const expected = await hmacHex(payload, secret);
  // 常量时间比较，避免计时侧信道
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const data = JSON.parse(atob(payload)) as { exp: number };
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = 'blog_session';
