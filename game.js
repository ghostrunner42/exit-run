(() => {
  const files = ["sheets.js","L0.js","L1.js","L2.js","L3.js","L4.js","L5.js"];
  Promise.all(files.map((f) => fetch(f).then((r) => {
    if (!r.ok) throw new Error(f + " " + r.status);
    return r.text();
  }))).then((parts) => {
    const s = document.createElement("script");
    s.textContent = parts.join("\n");
    document.body.appendChild(s);
  }).catch((e) => {
    console.error(e);
    document.body.insertAdjacentHTML("beforeend",
      '<p style="color:#e06060;font-family:system-ui;padding:1rem">Failed to load Exit Run.</p>');
  });
})();
