// Replace API_URL with your SheetDB / Sheethub API endpoint
const API_URL = "https://sheetdb.io/api/v1/6dmklr71ru3mu";

/* Utility to create elements */
function el(name, attrs = {}, children = []) {
  const e = document.createElement(name);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(child => {
    if (!child) return;
    if (typeof child === "string") e.appendChild(document.createTextNode(child));
    else e.appendChild(child);
  });
  return e;
}

/* Time formatter */
function formatTime(t) {
  return t || "—";
}

/* Render masjids — only one section (no duplicate locator list) */
function renderMasjids(data) {
  const timingsRoot = document.getElementById("timings-list");
  const fallback = document.getElementById("seo-fallback");

  timingsRoot.innerHTML = "";
  if (fallback) fallback.style.display = "none";

  // Sort by Jummah time
  data.sort((a, b) => {
    const parse = s => {
      const d = new Date("1970/01/01 " + (s || "00:00"));
      return isNaN(d) ? 0 : d.getTime();
    };
    return parse(a.jummah) - parse(b.jummah);
  });

  data.forEach(m => {
    const badge = el("div", {class: "masjid-badge"}, [(m.name || "M").slice(0, 2).toUpperCase()]);
    const title = el("h3", {class: "masjid-title"}, m.name || "Unnamed Masjid");
    const sub = el("div", {class: "masjid-sub"}, `${m.area || ""} • ${m.address || ""}`);

    const left = el("div", {class: "masjid-meta"}, [
      badge,
      el("div", {class: "masjid-body"}, [title, sub])
    ]);

    const time = el("div", {class: "masjid-time"}, formatTime(m.jummah));
    const mapBtn = el("a", {
      class: "masjid-map",
      href: m.maps || "#",
      target: "_blank",
      rel: "noopener noreferrer"
    }, "Open in Maps");

    const right = el("div", {class: "masjid-right"}, [time, mapBtn]);

    const item = el("div", {
      class: "masjid",
      role: "article",
      "aria-label": m.name
    }, [left, right]);

    timingsRoot.appendChild(item);
  });

  if (!data.length) {
    timingsRoot.innerHTML = "<p style='color:#6b7280'>No masjid data available yet.</p>";
  }
}

/* Load data with SEO fallback */
function load() {
  fetch(API_URL)
    .then(r => {
      if (!r.ok) throw new Error("Network error");
      return r.json();
    })
    .then(data => {
      const arr = Array.isArray(data) ? data : (data.data || []);
      renderMasjids(arr);
    })
    .catch(err => {
      const timingsRoot = document.getElementById("timings-list");
      const fallback = document.getElementById("seo-fallback");

      if (fallback) {
        fallback.innerHTML = "Unable to load live Namaz timings. Please try again.";
      }

      if (timingsRoot) {
        timingsRoot.innerHTML +=
          "<p style='color:#b91c1c; margin-top:10px;'>Failed to load live data.</p>";
      }

      console.error("Load error:", err);
    });
}

/* Banner close + Year */
document.addEventListener("DOMContentLoaded", () => {
  const close = document.getElementById("close-banner");
  if (close) {
    close.addEventListener("click", () => {
      const bn = document.getElementById("notify-banner");
      if (bn) bn.style.display = "none";
    });
  }

  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  load();
});
