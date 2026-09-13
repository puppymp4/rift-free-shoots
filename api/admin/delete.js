"use strict";
const { isAuthed, blobList, blobDelete, decrypt } = require("../_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (!isAuthed(req)) return res.status(401).json({ ok: false, error: "Not signed in." });
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  let id = "";
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    id = String(b.id || "");
  } catch {
    // handled by the guard below
  }
  if (!id) return res.status(400).json({ ok: false, error: "Missing id." });

  try {
    // Resolve the id to its blob url. Paths carry a random suffix, so the
    // record has to be opened to match on id rather than guessed by name.
    const blobs = await blobList();
    let target = null;
    for (const b of blobs) {
      try {
        const r = await fetch(b.downloadUrl || b.url, { cache: "no-store" });
        if (!r.ok) continue;
        const rec = JSON.parse(decrypt((await r.json()).enc));
        if (rec.id === id) { target = b.url; break; }
      } catch {
        // skip unreadable records
      }
    }

    if (!target) return res.status(404).json({ ok: false, error: "Not found." });

    await blobDelete(target);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("admin delete failed:", err && err.message);
    return res.status(500).json({ ok: false, error: "Could not delete." });
  }
};
