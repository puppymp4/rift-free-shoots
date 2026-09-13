"use strict";
const { checkPassword, makeToken, sessionCookie, MAX_AGE } = require("../_lib");

const attempts = new Map();
function tooMany(ip) {
  const now = Date.now();
  const win = 15 * 60 * 1000;
  const rec = attempts.get(ip) || { n: 0, t: now };
  if (now - rec.t > win) { rec.n = 0; rec.t = now; }
  rec.n += 1;
  attempts.set(ip, rec);
  if (attempts.size > 5000) attempts.clear();
  return rec.n > 10;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (tooMany(ip)) {
    return res.status(429).json({ ok: false, error: "Too many attempts. Wait 15 minutes." });
  }

  let password = "";
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    password = b.password || "";
  } catch {
    // malformed body falls through to the failure path below
  }

  if (!checkPassword(password)) {
    return res.status(401).json({ ok: false, error: "Wrong password." });
  }

  res.setHeader("Set-Cookie", sessionCookie(makeToken(), MAX_AGE));
  return res.status(200).json({ ok: true });
};
