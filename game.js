(() => {
  Promise.all(
    [0, 1, 2, 3].map((i) =>
      fetch("game.chunk." + i + ".js").then((r) => {
        if (!r.ok) throw new Error("chunk " + i + " " + r.status);
        return r.text();
      })
    )
  )
    .then((parts) => {
      const s = document.createElement("script");
      s.textContent = parts.join("");
      document.body.appendChild(s);
    })
    .catch((err) => {
      console.error(err);
      document.body.insertAdjacentHTML(
        "beforeend",
        '<p style="color:#e06060;font-family:system-ui;padding:1rem">Failed to load Exit Run.</p>'
      );
    });
})();
