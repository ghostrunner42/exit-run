(() => {
  const n = 12;
  Promise.all(
    Array.from({ length: n }, (_, i) =>
      fetch("G" + i + ".txt").then((r) => {
        if (!r.ok) throw new Error("G" + i + " " + r.status);
        return r.text();
      })
    )
  )
    .then((parts) => {
      const code = atob(parts.join(""));
      const s = document.createElement("script");
      s.textContent = code;
      document.body.appendChild(s);
    })
    .catch((e) => {
      console.error(e);
      document.body.insertAdjacentHTML(
        "beforeend",
        '<p style="color:#e06060;font-family:system-ui;padding:1rem">Failed to load Exit Run.</p>'
      );
    });
})();
