"use strict";
/* Shared helpers for the free-shoots API. No external deps on purpose:
   this project is a static site, adding a package.json would add a build step. */
const {
  createHmac, createHash, createCipheriv, createDecipheriv,
  timingSafeEqual, randomBytes, randomUUID,
} = require("crypto");

const COOKIE_NAME = "rm_admin";
const MAX_AGE = 60 * 60 * 8; // 8 hours
const BLOB_API = "https://blob.vercel-storage.com";
const BLOB_API_VERSION = "12";
const PREFIX = "data/applications/";

function must(key) {
  const v = process.env[key];
  if (!v) throw new Error(key + " is not set");
  return v;
}

/* ---------- session cookie: HMAC-signed, no library ---------- */
function sign(value) {
  return createHmac("sha256", must("SESSION_SECRET")).update(value).digest("hex");
}

function makeToken() {
  const issuedAt = Date.now().toString(36);
  return issuedAt + "." + sign(issuedAt);
}

function verifyToken(token) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [issuedAt, sig] = parts;

  const ageMs = Date.now() - parseInt(issuedAt, 36);
  if (Number.isNaN(ageMs) || ageMs < 0 || ageMs > MAX_AGE * 1000) return false;

  const expected = sign(issuedAt);
  if (expected.length !== sig.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch {
    return false;
  }
}

function checkPassword(input) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof input !== "string") return false;
  // hash both sides so the compare is constant time regardless of length
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

function isAuthed(req) {
  return verifyToken(readCookie(req, COOKIE_NAME));
}

function sessionCookie(token, maxAge) {
  return [
    COOKIE_NAME + "=" + encodeURIComponent(token),
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=" + maxAge,
  ].join("; ");
}

/* ---------- encryption at rest (AES-256-GCM) ----------
   Applications hold names and phone numbers. Encrypting before upload means
   the stored object is ciphertext even if a blob URL is ever exposed. */
function encKey() {
  return createHash("sha256").update(must("SESSION_SECRET")).digest();
}

function encrypt(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

function decrypt(b64) {
  const buf = Buffer.from(b64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const d = createDecipheriv("aes-256-gcm", encKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}

/* ---------- Vercel Blob REST (no SDK) ---------- */
function blobHeaders() {
  return {
    authorization: "Bearer " + must("BLOB_READ_WRITE_TOKEN"),
    "x-api-version": BLOB_API_VERSION,
  };
}

async function blobPut(pathname, body) {
  const res = await fetch(BLOB_API + "/" + pathname, {
    method: "PUT",
    headers: {
      ...blobHeaders(),
      "x-content-type": "application/json",
      "x-add-random-suffix": "1", // unguessable URL
    },
    body,
  });
  if (!res.ok) throw new Error("blob put failed: " + res.status + " " + (await res.text()).slice(0, 200));
  return res.json();
}

async function blobList() {
  const out = [];
  let cursor;
  do {
    const url = new URL(BLOB_API);
    url.searchParams.set("prefix", PREFIX);
    url.searchParams.set("limit", "1000");
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url, { headers: blobHeaders() });
    if (!res.ok) throw new Error("blob list failed: " + res.status);
    const j = await res.json();
    out.push(...(j.blobs || []));
    cursor = j.hasMore ? j.cursor : undefined;
  } while (cursor);
  return out;
}

module.exports = {
  COOKIE_NAME, MAX_AGE, PREFIX,
  makeToken, verifyToken, checkPassword, isAuthed, sessionCookie, readCookie,
  encrypt, decrypt, blobPut, blobList, randomUUID,
};
