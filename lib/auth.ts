const SESSION_COOKIE = "medicare_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

type SessionPayload = {
  user: string;
  exp: number;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET belum dikonfigurasi");

  return secret;
}

function getAdminUsername() {
  const username = process.env.ADMIN_USERNAME;
  if (!username) throw new Error("ADMIN_USERNAME belum dikonfigurasi");

  return username;
}

function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD belum dikonfigurasi");

  return password;
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return toHex(signature);
}

function encodePayload(payload: SessionPayload) {
  return encodeURIComponent(JSON.stringify(payload));
}

function decodePayload(value: string): SessionPayload | null {
  try {
    const payload = JSON.parse(decodeURIComponent(value)) as SessionPayload;
    if (!payload.user || typeof payload.exp !== "number") return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getSessionMaxAge() {
  return SESSION_MAX_AGE;
}

export async function createSessionToken(username: string) {
  const payload = encodePayload({
    user: username,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  });
  const signature = await hmac(payload);

  return `${payload}.${signature}`;
}

export async function verifySessionToken(token?: string) {
  if (!token) return false;

  const [payloadValue, signature] = token.split(".");
  if (!payloadValue || !signature) return false;

  const expectedSignature = await hmac(payloadValue);
  if (signature !== expectedSignature) return false;

  const payload = decodePayload(payloadValue);
  if (!payload) return false;

  return payload.exp > Date.now();
}

export function verifyAdminCredentials(username: string, password: string) {
  return username === getAdminUsername() && password === getAdminPassword();
}
