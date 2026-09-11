export const SESSION_COOKIE = "mentory_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function bytes(value: string) {
  return new TextEncoder().encode(value);
}

function base64Url(value: Uint8Array) {
  let binary = "";
  value.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signature(value: string) {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) throw new Error("APP_SESSION_SECRET is not configured");
  const key = await crypto.subtle.importKey("raw", bytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes(value))));
}

function equal(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}

export function simpleAuthEnabled() {
  return process.env.SIMPLE_AUTH === "true";
}

export function verifyAppCredentials(username: string, password: string) {
  return equal(username, process.env.APP_USERNAME ?? "") && equal(password, process.env.APP_PASSWORD ?? "");
}

export async function createSessionToken(username: string) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${username}:${expires}`;
  return `${payload}.${await signature(payload)}`;
}

export async function verifySessionToken(token?: string) {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const suppliedSignature = token.slice(dot + 1);
  const separator = payload.lastIndexOf(":");
  const username = payload.slice(0, separator);
  const expires = Number(payload.slice(separator + 1));
  if (!username || !Number.isFinite(expires) || expires <= Date.now() / 1000) return false;
  if (username !== process.env.APP_USERNAME) return false;
  return equal(suppliedSignature, await signature(payload));
}

export const sessionMaxAge = SESSION_SECONDS;
