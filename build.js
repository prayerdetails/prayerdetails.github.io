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
      <article class="masjid-card">
        <div class="masjid-info">
          <span class="masjid-icon">🕌</span>
          <div class="masjid-text">
            <h3 class="masjid-name"><a href="${mapLink}" target="_blank">${name}</a></h3>
            <p class="masjid-location">${location}</p>
          </div>
        </div>

        <div class="masjid-right">
          <div class="masjid-time">Jummah: ${jummah}</div>
          <div class="masjid-prayers">
            ${prayers.map((p) => `<span class="masjid-prayer">${p}</span>`).join("")}
          </div>
          <a href="${mapLink}" target="_blank" class="masjid-map">📍Click for Location</a>
        </div>
      </article>
      `;
    })
    .join("\n");
}

// ---------- JSON-LD (SEO Structured Data) ----------
function generateJSONLD(data) {
  return {
    "@context": "https://schema.org",
    "@graph": [

      /* =====================
         Website + Search
      ===================== */
      {
        "@type": "WebSite",
        "@id": "https://prayerdetails.github.io/#website",
        "url": "https://prayerdetails.github.io/",
        "name": "Jumma & Jummah Namaz Time in Noida",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://prayerdetails.github.io/?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },

      /* =====================
         Breadcrumbs
      ===================== */
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://prayerdetails.github.io/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Jumma Namaz Time in Noida"
          }
        ]
      },

      /* =====================
         Location Context (Near Me)
      ===================== */
      {
        "@type": "Place",
        "@id": "https://prayerdetails.github.io/#noida",
        "name": "Noida",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Noida",
          "addressRegion": "Uttar Pradesh",
          "addressCountry": "IN"
        }
      },

      /* =====================
         Collection / Directory Page
      ===================== */
      {
        "@type": "CollectionPage",
        "name": "Masjid-wise Jumma & Jummah Prayer Timings in Noida",
        "description": "A directory of mosques and Jummah prayer timings near you in Noida, Greater Noida and Delhi NCR.",
        "about": {
          "@type": "Thing",
          "name": "Jumma & Jummah Prayer"
        },
        "isPartOf": {
          "@id": "https://prayerdetails.github.io/#website"
        }
      },

      /* =====================
         FAQ (Near-me Intent)
      ===================== */
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is Jumma namaz time in Noida today?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Jumma namaz time in Noida varies by masjid. Each mosque conducts Jummah prayer at its own scheduled time."
            }
          },
          {
            "@type": "Question",
            "name": "Is this Jummah prayer time near me?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. This page lists Jummah prayer timings for mosques in Noida, Greater Noida, Noida Extension and nearby NCR areas."
            }
          },
          {
            "@type": "Question",
            "name": "Is there a fixed Jummah time in Noida?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No. There is no single fixed Jummah timing. Each masjid follows its own Friday prayer schedule."
            }
          }
        ]
      },

      /* =====================
         ItemList (Masjid Events)
      ===================== */
      {
        "@type": "ItemList",
        "name": "Noida Jumma & Jummah Prayer Timings",
        "itemListElement": data.map((m, i) => {
          const start = m.jummah_time
            ? `2025-12-31T${m.jummah_time}:00+05:30`
            : null;

          return {
            "@type": "ListItem",
            "position": i + 1,
            "item": {
              "@type": "Event",
              "name": `Jummah Prayer at ${capitalize(m.name)}`,
              "description": `Friday Jummah prayer timing for ${capitalize(m.name)} masjid in Noida.`,
              "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
              "eventStatus": "https://schema.org/EventScheduled",
              "startDate": start,
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
      }
    ]
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
