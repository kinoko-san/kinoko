/* ============================================================
   KINOKO — client runtime
   - JST readout
   - source link resolution
   - fetch + typewriter render of today's haiku
   ============================================================ */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---- JST clock ------------------------------------------------ */
  const clockEl = document.getElementById("clock");
  function tickClock() {
    if (!clockEl) return;
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const g = (t) => parts.find((p) => p.type === t)?.value ?? "--";
    clockEl.textContent = `${g("hour")}:${g("minute")}:${g("second")} JST`;
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ---- year -------------------------------------------------------- */
  document.querySelectorAll("#year").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---- source repository link ------------------------------------ */
  // Override by adding: <meta name="kinoko:repo" content="https://github.com/you/kinoko">
  (() => {
    const link = document.getElementById("repo-link");
    if (!link) return;
    const meta = document
      .querySelector('meta[name="kinoko:repo"]')
      ?.getAttribute("content");
    let url = meta;
    if (!url) {
      const host = location.hostname; // e.g. user.github.io
      const m = host.match(/^([a-z0-9-]+)\.github\.io$/i);
      if (m) {
        const seg = location.pathname.split("/").filter(Boolean)[0];
        url =
          seg && seg !== "index.html" && seg !== "about.html"
            ? `https://github.com/${m[1]}/${seg}`
            : `https://github.com/${m[1]}/${m[1]}.github.io`;
      }
    }
    if (url) {
      link.href = url;
    } else {
      link.removeAttribute("href");
      link.style.opacity = "0.4";
    }
  })();

  /* ---- haiku ----------------------------------------------------- */
  const panel = document.getElementById("haiku");
  const body = document.getElementById("haiku-body");
  const dateEl = document.getElementById("haiku-date");
  const cycleEl = document.getElementById("haiku-cycle");
  if (!panel || !body) return;

  const fmtDate = (iso) => {
    const d = new Date(iso + "T00:00:00+09:00");
    if (isNaN(d)) return iso;
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tokyo",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
      .format(d)
      .toUpperCase();
  };

  function renderError(msg) {
    panel.classList.add("is-error");
    body.innerHTML = "";
    const line = document.createElement("span");
    line.className = "line";
    line.textContent = msg;
    body.appendChild(line);
    if (dateEl) dateEl.textContent = "SIGNAL LOST";
  }

  function renderHaiku(lines) {
    body.innerHTML = "";
    const spans = lines.map((text) => {
      const s = document.createElement("span");
      s.className = "line";
      body.appendChild(s);
      return { s, text };
    });

    if (reduceMotion) {
      spans.forEach(({ s, text }) => (s.textContent = text));
      return;
    }

    const caret = document.createElement("span");
    caret.className = "caret";
    caret.textContent = "_";

    let li = 0;
    function typeLine() {
      if (li >= spans.length) {
        caret.remove();
        return;
      }
      const { s, text } = spans[li];
      s.appendChild(caret);
      let ci = 0;
      const step = () => {
        if (ci < text.length) {
          caret.before(document.createTextNode(text[ci++]));
          setTimeout(step, 42 + Math.random() * 46);
        } else {
          li++;
          setTimeout(typeLine, 360);
        }
      };
      step();
    }
    typeLine();
  }

  fetch("haiku.json", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((data) => {
      const lines = Array.isArray(data.lines) ? data.lines : data.haiku;
      if (!Array.isArray(lines) || lines.length < 1) {
        throw new Error("malformed spore");
      }
      if (dateEl && data.date) dateEl.textContent = fmtDate(data.date);
      if (cycleEl) {
        cycleEl.textContent =
          data.cycle != null
            ? "cycle " + String(data.cycle).padStart(4, "0")
            : "";
      }
      renderHaiku(lines.map((s) => String(s)));
    })
    .catch((err) => {
      renderError(
        "// the mycelial archive is unreachable\n// (" +
          (err && err.message ? err.message : "unknown") +
          ")"
      );
    });
})();
