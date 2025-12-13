// ================================
//   PrayerDetails Build Script
//   Fetching from SheetDB
// ================================

import fs from "fs/promises";
import fetch from "node-fetch";

const SHEETDB_URL = "https://sheetdb.io/api/v1/6dmklr71ru3mu"; // your API

// ---------- Helpers ----------
function capitalize(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function safeSplit(value) {
  if (!value || typeof value !== "string") return [];
  return value.split(",").map((v) => v.trim());
}

// ---------- Fetch data from SheetDB ----------
async function loadFromSheetDB() {
  try {
    console.log("📡 Fetching records from SheetDB...");

    const res = await fetch(SHEETDB_URL);
    if (!res.ok) throw new Error("SheetDB HTTP error");

    const data = await res.json();

    console.log(`✅ Loaded ${data.length} rows from SheetDB`);
    return data;
  } catch (err) {
    console.error("❌ SheetDB Fetch Failed:", err);
    process.exit(1);
  }
}

// ---------- Build Masjid Cards ----------
function generateMasjidHTML(data) {
  return data
    .map((m) => {
      const prayers = safeSplit(m.prayers);
      const jummah = m.jummah_time || "—";
      const name = capitalize(m.name || "Unknown Masjid");
      const location = m.location || "Location not provided";
      const mapLink = m.map_link || "#";

      return `
      <article class="masjid-card" id="${m.id}">
        <div class="masjid-info">
          <span class="masjid-icon">🕌</span>
          <div class="masjid-text">
            <h3 class="masjid-name">${name}</h3>
            <p class="masjid-location">${location}</p>
          </div>
        </div>

        <div class="masjid-right">
          <div class="masjid-time">Jummah: ${jummah}</div>
          <div class="masjid-prayers">
            ${prayers.map((p) => `<span class="masjid-prayer">${p}</span>`).join("")}
          </div>
          <a href="${mapLink}" target="_blank" class="masjid-map">📍 Map</a>
        </div>
      </article>
      `;
    })
    .join("\n");
}

// ---------- JSON-LD (SEO Structured Data) ----------
// ---------- JSON-LD (SEO Structured Data) ----------
function generateJSONLD(data) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Noida Jummah Prayer Timings",
    "description": "Verified and updated Jummah timings for Masjids in Noida & NCR.",
    "url": "https://prayerdetails.github.io/",
    "itemListElement": data.map((m, i) => {
      const start = m.jummah_time ? `2025-12-31T${m.jummah_time}:00+05:30` : null;

      return {
        "@type": "ListItem",
        "position": i + 1,
        "item": {
          "@type": "Event",
          "name": `Jummah Prayer at ${capitalize(m.name)}`,
          "description": `Jummah prayer timing for ${capitalize(m.name)} located at ${m.location}.`,
          "eventStatus": "https://schema.org/EventScheduled",
          "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",

          "startDate": start,
          "endDate": start,  // Jummah = short event
          "image": "https://prayerdetails.github.io/favicon.png",

          "organizer": {
            "@type": "Organization",
            "name": capitalize(m.name),
            "url": "https://prayerdetails.github.io/"
          },

          "performer": {
            "@type": "Person",
            "name": "Imam (Masjid)"
          },

          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "INR",
            "availability": "https://schema.org/InStock",
            "url": `https://prayerdetails.github.io/#${m.id}`,
            "validFrom": "2025-01-01T00:00:00+05:30"
          },

          "location": {
            "@type": "Place",
            "name": capitalize(m.name),
            "address": {
              "@type": "PostalAddress",
              "streetAddress": m.location,
              "addressLocality": "Noida",
              "addressRegion": "Uttar Pradesh",
              "addressCountry": "IN"
            }
          }
        }
      };
    })
  };
}

// ---------- Main Build Process ----------
async function build() {
  const data = await loadFromSheetDB();

  console.log("⚙️ Generating HTML...");

  let template = await fs.readFile("./index-template.html", "utf8");

  const masjidHTML = generateMasjidHTML(data);
  const jsonLD = JSON.stringify(generateJSONLD(data), null, 2);

  template = template.replace("<!--MASJID_DATA-->", masjidHTML);
  template = template.replace(
    '<script id="json-ld" type="application/ld+json">',
    `<script id="json-ld" type="application/ld+json">\n${jsonLD}`
  );

  await fs.writeFile("./index.html", template);

  console.log("🎉 Build Complete → index.html generated!");
}

build();
