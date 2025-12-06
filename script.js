// Replace API_URL with your SheetDB / Sheethub API endpoint if different
const API_URL = "https://sheetdb.io/api/v1/6dmklr71ru3mu";

// utility to create elements quickly
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

function formatTime(t) {
  return t || "—";
}

// render masjid lists
function renderMasjids(data) {
  const timingsRoot = document.getElementById("timings-list");
  const locatorRoot = document.getElementById("locator-list");
  timingsRoot.innerHTML = "";
  locatorRoot.innerHTML = "";

  // try to sort by jummah time if present (hh:mm AM/PM)
  data.sort((a,b) => {
    const ta = a.jummah || "";
    const tb = b.jummah || "";
    const parse = s => {
      // fallback if not parseable
      const d = new Date("1970/01/01 " + (s || "00:00"));
      return isNaN(d) ? 0 : d.getTime();
    };
    return parse(ta) - parse(tb);
  });

  data.forEach((m, idx) => {
    // left block
    const badge = el("div", {class:"masjid-badge"}, [(m.name||"M").slice(0,2).toUpperCase()]);
    const title = el("h3", {class:"masjid-title"}, m.name || "Unnamed Masjid");
    const sub = el("div", {class:"masjid-sub"}, `${m.area || ""} • ${m.address || ""}`);

    const left = el("div", {class:"masjid-meta"}, [badge, el("div", {class:"masjid-body"}, [title, sub])]);

    // right block
    const time = el("div", {class:"masjid-time"}, formatTime(m.jummah));
    const mapBtn = el("a", {class:"masjid-map", href:m.maps || "#", target:"_blank", rel:"noopener noreferrer"}, "Open in Maps");
    const right = el("div", {class:"masjid-right"}, [time, mapBtn]);

    const item = el("div", {class:"masjid", role:"article", "aria-label": m.name}, [left, right]);

    // append to both lists (timings list shows main info; locator list could be same for now)
    timingsRoot.appendChild(item.cloneNode(true));
    locatorRoot.appendChild(item);
  });

  if (!data.length) {
    timingsRoot.innerHTML = "<p style='color:#6b7280'>No masjid data available yet.</p>";
    locatorRoot.innerHTML = "<p style='color:#6b7280'>No locations available yet.</p>";
  }
}

// fetch data
function load() {
  fetch(API_URL)
    .then(r => {
      if (!r.ok) throw new Error("Network error");
      return r.json();
    })
    .then(data => {
      // SheetDB sometimes returns an object wrapper or array; normalize
      const arr = Array.isArray(data) ? data : (data.data || []);
      renderMasjids(arr);
    })
    .catch(err => {
      const elErr = document.getElementById("timings-list");
      if (elErr) elErr.innerHTML = "<p style='color:#b91c1c'>Failed to load data. Please try later.</p>";
      console.error("Load error:", err);
    });
}

// banner dismiss & year
document.addEventListener("DOMContentLoaded", () => {
  const close = document.getElementById("close-banner");
  if (close) close.addEventListener("click", () => {
    document.getElementById("notify-banner").style.display = "none";
  });
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  load();
});
