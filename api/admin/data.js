"use strict";
const { isAuthed, blobList, decrypt } = require("../_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (!isAuthed(req)) return res.status(401).json({ ok: false, error: "Not signed in." });

  try {
    const blobs = await blobList();

    const items = await Promise.all(blobs.map(async (b) => {
      try {
        const r = await fetch(b.downloadUrl || b.url, { cache: "no-store" });
        if (!r.ok) return null;
        const wrapper = await r.json();
        return JSON.parse(decrypt(wrapper.enc));
      } catch {
        return null; // one bad record should not take down the whole list
      }
    }));

    const applications = items
      .filter(Boolean)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return res.status(200).json({ ok: true, count: applications.length, applications });
  } catch (err) {
    console.error("admin data failed:", err && err.message);
    return res.status(500).json({ ok: false, error: "Could not load applications." });
  }
};
