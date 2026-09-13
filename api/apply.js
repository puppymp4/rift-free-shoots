"use strict";
const { encrypt, blobPut, PREFIX, randomUUID } = require("./_lib");

const FIELDS = ["Name", "Business name", "Type of business", "Other business type", "Instagram", "Phone"];
const MAX_LEN = 300;

// Per-instance throttle. Not a substitute for a real limiter, but it blunts
// a single client hammering the endpoint.
const hits = new Map();
function throttled(ip) {
  const now = Date.now();
  const win = 60 * 1000;
  const rec = hits.get(ip) || { n: 0, t: now };
  if (now - rec.t > win) { rec.n = 0; rec.t = now; }
  rec.n += 1;
  hits.set(ip, rec);
  if (hits.size > 5000) hits.clear();
  return rec.n > 8;
}

function clean(v) {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, MAX_LEN);
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let raw = typeof req.body === "string" ? req.body : "";
  if (!raw) {
    for await (const chunk of req) raw += chunk;
  }
  const out = {};
  for (const [k, v] of new URLSearchParams(raw)) out[k] = v;
  return out;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method not allowed");
  }

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";

  try {
    const body = await readBody(req);

    // Honeypot: silently accept so bots do not learn they were caught.
    if (clean(body._honey)) return res.redirect(303, "/thanks");
    if (throttled(ip)) return res.status(429).send("Slow down a moment and try again.");

    const data = {};
    for (const f of FIELDS) data[f] = clean(body[f]);

    const digits = (data.Phone || "").replace(/\D/g, "");
    const valid =
      data.Name.length > 1 &&
      data["Business name"].length > 1 &&
      data["Type of business"].length > 0 &&
      digits.length >= 10 && digits.length <= 11;

    if (!valid) return res.status(400).send("Some fields were missing. Go back and try again.");

    const record = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...data,
      meta: {
        ip,
        userAgent: clean(req.headers["user-agent"] || ""),
        referer: clean(req.headers.referer || ""),
      },
    };

    const pathname = PREFIX + record.createdAt.slice(0, 10) + "-" + record.id + ".json";
    await blobPut(pathname, JSON.stringify({ v: 1, enc: encrypt(JSON.stringify(record)) }));

    return res.redirect(303, "/thanks");
  } catch (err) {
    console.error("apply failed:", err && err.message);
    const diag = req.query && req.query.diag === "1" ? " [" + (err && err.message) + "]" : "";
    return res.status(500).send("Something broke on my end. Text me instead and I will sort it out." + diag);
  }
};
