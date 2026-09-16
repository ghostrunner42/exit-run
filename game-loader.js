(() => {
  Promise.all([
    fetch("game.p1.js").then((r) => r.text()),
    fetch("game.p2.js").then((r) => r.text()),
  ]).then(([a, b]) => {
    const s = document.createElement("script");
    s.textContent = a + b;
    document.body.appendChild(s);
  }).catch((err) => {
    console.error("Exit Run failed to load game parts", err);
    document.body.insertAdjacentHTML(
      "beforeend",
      '<p style="color:#e06060;font-family:system-ui;padding:1rem">Failed to load game.js parts.</p>'
    );
  });
})();
