import fs from "fs/promises";
const SITE_URL = "https://prayerdetails.github.io";
const SITE_NAME = "Prayer Details";
const GOOGLE_SHEET_ID = "15ysOx4_XDyvnobCSB9S6ut7569OwCbudGytpgE0wdA8";
const GOOGLE_SHEET_GID = "414096676";
const GOOGLE_SHEET_TAB_NAME = "masjid details";
const GOOGLE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?gid=${GOOGLE_SHEET_GID}&sheet=${encodeURIComponent(GOOGLE_SHEET_TAB_NAME)}&tqx=out:json`;
const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSerlt--tG0yyqmUBEIXzf3pSLbE-RFWqsPhsbtDjKcZ1Qvqlg/viewform";
const HOME_KEYWORDS = [
  "namaz time noida",
  "jumma time noida",
  "jummah time noida",
  "jumma masjid",
  "jama masjid",
  "masjid near me",
  "masjid in noida",
  "jumma namaz in noida",
  "jummah namaz in noida",
  "jumma namaz near me",
  "jummah namaz near me",
  "juma namaz near me",
  "juma namaz in noida",
  "friday prayer near me",
  "mosque near me",
  "mosque in noida"
];
const INDEX_TEMPLATE_URL = new URL("./src/templates/index-template.html", import.meta.url);
const DETAIL_TEMPLATE_URL = new URL("./src/templates/masjid-template.html", import.meta.url);
const SOURCE_STYLE_URL = new URL("./src/styles/style.css", import.meta.url);
const STYLE_OUTPUT_URL = new URL("./style.css", import.meta.url);
const DETAILS_URL = new URL("./masjid-details.json", import.meta.url);
const INDEX_OUTPUT_URL = new URL("./index.html", import.meta.url);
const SITEMAP_OUTPUT_URL = new URL("./sitemap.xml", import.meta.url);
const MASJID_DIRECTORY_URL = new URL("./masjid/", import.meta.url);
const AREA_DIRECTORY_URL = new URL("./area/", import.meta.url);
const ADDRESS_FIELD_CANDIDATES = ["masjid address", "address", "location", "masjid location"];
const MAP_LINK_FIELD_CANDIDATES = ["masjid google map location", "map_link", "google map link", "map link", "masjid location"];

function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJsonForScript(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");
}

function titleCase(value = "") {
  const normalized = cleanText(value);

  if (!normalized) {
    return "";
  }

  return normalized
    .split(" ")
    .map((word) => {
      if (/[^\u0000-\u007F]/.test(word)) {
        return word;
      }

      const compact = word.replace(/[^A-Za-z]/g, "");
      if (compact && compact === compact.toUpperCase() && compact.length <= 4) {
        return word;
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function safeSplit(value) {
  return cleanText(value)
    .split(",")
    .map((item) => cleanText(item))
    .filter(Boolean);
}

function normalizeFieldKey(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getRecordField(record, candidates) {
  const wanted = new Set(candidates.map((value) => normalizeFieldKey(value)));

  for (const [key, rawValue] of Object.entries(record || {})) {
    if (wanted.has(normalizeFieldKey(key))) {
      const value = cleanText(rawValue);
      if (value) {
        return value;
      }
    }
  }

  return "";
}

function pickFirstFieldValue(records, candidates) {
  for (const record of records) {
    const value = getRecordField(record, candidates);
    if (value) {
      return value;
    }
  }

  return "";
}

function buildDailyPrayerTimes(records) {
  return {
    fajr: pickFirstFieldValue(records, ["fajar time", "fajr time", "fajar_time", "fajr_time", "fajar", "fajr", "fajra namaz timing", "fajra namaz time", "fajr namaz timing"]),
    zuhr: pickFirstFieldValue(records, ["zuhar time", "zuhr time", "zohar time", "zuhar_time", "zuhr_time", "zohar_time", "zuhar", "zuhr", "zohar", "zuhar namaz timing", "zuhar namaz time", "zuhr namaz timing"]),
    asr: pickFirstFieldValue(records, ["asar time", "asr time", "asar_time", "asr_time", "asar", "asr", "asar namaz timing", "asar namaz time", "asr namaz timing"]),
    maghrib: pickFirstFieldValue(records, ["magrib time", "maghrib time", "magrib_time", "maghrib_time", "magrib", "maghrib", "magrib namaz timing", "maghrib namaz timing"]),
    isha: pickFirstFieldValue(records, ["isha time", "isha_time", "isha", "isha namaz timing", "isha namaz time"])
  };
}

function buildFridaySchedules(records) {
  const entries = [];

  records.forEach((record) => {
    const prayerLabels = safeSplit(getRecordField(record, ["prayers", "prayer", "jumma prayer label"]));
    const baseLabel = titleCase(prayerLabels[0] || "Khutbah");
    const primaryTime = getRecordField(record, ["jumma kutba time", "jummah_time", "jumma khutba time", "khutbah time", "jummah time"]);
    const secondaryTime = getRecordField(record, ["jumma kutba time 2", "jumma khutba time 2", "second khutbah time", "jummah_time_2"]);

    if (primaryTime) {
      entries.push({
        label: baseLabel,
        time: cleanText(primaryTime)
      });
    }

    if (secondaryTime) {
      entries.push({
        label: titleCase(prayerLabels[1] || "Second Khutbah"),
        time: cleanText(secondaryTime)
      });
    }

    if (!primaryTime && !secondaryTime) {
      const fallbackTime = cleanText(getRecordField(record, ["jummah_time", "jumma kutba time"])) || "Please confirm locally";
      entries.push({
        label: titleCase(prayerLabels.join(" / ") || "Jummah"),
        time: fallbackTime
      });
    }
  });

  return entries
    .filter((item, itemIndex, scheduleList) => {
      const key = `${item.label}|${item.time}`;
      return scheduleList.findIndex((candidate) => `${candidate.label}|${candidate.time}` === key) === itemIndex;
    })
    .sort((left, right) => parseTimeToMinutes(left.time) - parseTimeToMinutes(right.time));
}

function normalizeMapLink(value = "") {
  const cleaned = cleanText(value).replace(/\/$/, "");
  if (!cleaned) {
    return "";
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  // Accept bare google.com/maps... style values from sheets.
  if (/^(?:www\.)?(?:google\.[^/]+|maps\.app\.goo\.gl)\//i.test(cleaned)) {
    return `https://${cleaned.replace(/^www\./i, "")}`;
  }

  return cleaned;
}

function parseCoordinate(value) {
  const [latValue = "", lngValue = ""] = cleanText(value).split(",");
  const lat = Number.parseFloat(latValue);
  const lng = Number.parseFloat(lngValue);

  return {
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null
  };
}

function parseCoordinatesFromMapLink(mapLink = "") {
  const raw = cleanText(mapLink);
  if (!raw) {
    return { lat: null, lng: null };
  }

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  const placeMatch = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i);
  if (placeMatch) {
    return parseCoordinate(`${placeMatch[1]},${placeMatch[2]}`);
  }

  const atMatch = decoded.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,|$)/);
  if (atMatch) {
    return parseCoordinate(`${atMatch[1]},${atMatch[2]}`);
  }

  const queryMatch = decoded.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:&|$)/i);
  if (queryMatch) {
    return parseCoordinate(`${queryMatch[1]},${queryMatch[2]}`);
  }

  return { lat: null, lng: null };
}

async function resolveMapLinkData(records) {
  const linkCandidates = new Set();

  for (const record of records) {
    const link = normalizeMapLink(getRecordField(record, MAP_LINK_FIELD_CANDIDATES));
    if (link) {
      linkCandidates.add(link);
    }
  }

  const resolvedEntries = await Promise.all(
    Array.from(linkCandidates).map(async (link) => {
      const fallback = {
        resolvedLink: link,
        coordinates: parseCoordinatesFromMapLink(link)
      };

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(link, {
          redirect: "follow",
          signal: controller.signal
        });

        clearTimeout(timer);
        const resolvedLink = normalizeMapLink(response.url || link) || link;
        return [
          link,
          {
            resolvedLink,
            coordinates: parseCoordinatesFromMapLink(resolvedLink)
          }
        ];
      } catch {
        return [link, fallback];
      }
    })
  );

  return new Map(resolvedEntries);
}

function formatCoordinates({ lat, lng }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "Not available";
  }

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function slugify(value = "") {
  return cleanText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function removeScheduleSuffix(value = "") {
  return cleanText(value)
    .replace(/\b(first|1st|second|2nd|third|3rd)\s+(khutbah|qutbah)\b/gi, "")
    .replace(/\b(khutbah|qutbah)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLocationForArea(location = "") {
  return cleanText(location).replace(/^[A-Z0-9+]{4,},\s*/i, "");
}

function inferArea(location = "") {
  const normalized = normalizeLocationForArea(location);
  if (!normalized) {
    return "Noida and nearby NCR";
  }

  const lower = normalized.toLowerCase();
  const sectorMatch = normalized.match(/sector\s*\d+[a-z]?/i);

  if (lower.includes("shahaberi")) {
    return "Shahaberi";
  }

  if (lower.includes("jalpura") && lower.includes("greater noida")) {
    return "Jalpura, Greater Noida";
  }

  if (lower.includes("greater noida") && sectorMatch) {
    return `${titleCase(sectorMatch[0])}, Greater Noida`;
  }

  if (lower.includes("barola")) {
    return "Barola, Noida";
  }

  if (lower.includes("greater noida")) {
    return "Greater Noida";
  }

  if (sectorMatch && lower.includes("noida")) {
    return `${titleCase(sectorMatch[0])}, Noida`;
  }

  if (sectorMatch) {
    return titleCase(sectorMatch[0]);
  }

  if (lower.includes("noida")) {
    return "Noida";
  }

  const parts = normalized.split(",").map((item) => cleanText(item)).filter(Boolean);
  return titleCase(parts[0] || normalized);
}

function inferLocality(location = "") {
  const normalized = normalizeLocationForArea(location).toLowerCase();

  if (normalized.includes("greater noida") || normalized.includes("shahaberi") || normalized.includes("jalpura")) {
    return "Greater Noida";
  }

  return "Noida";
}

function parseTimeToMinutes(value = "") {
  const match = cleanText(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  return hours * 60 + minutes;
}

function parseDateValue(value = "") {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return null;
  }

  const date = new Date(cleaned);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildVerificationStatus(records) {
  const likelyDateKeys = [
    "last updated",
    "updated at",
    "updated_on",
    "update date",
    "timestamp",
    "submitted at",
    "created at",
    "date"
  ];

  let latestDate = null;
  for (const record of records) {
    for (const key of likelyDateKeys) {
      const rawValue = getRecordField(record, [key]);
      const parsed = parseDateValue(rawValue);
      if (parsed && (!latestDate || parsed > latestDate)) {
        latestDate = parsed;
      }
    }
  }

  if (!latestDate) {
    return {
      label: "Verification pending",
      className: "pending",
      detail: "Awaiting recent verification"
    };
  }

  const daysSinceUpdate = Math.floor((Date.now() - latestDate.getTime()) / 86400000);
  const dateText = latestDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  if (daysSinceUpdate <= 7) {
    return {
      label: "Verified this week",
      className: "available",
      detail: `Updated ${dateText}`
    };
  }

  if (daysSinceUpdate <= 30) {
    return {
      label: "Verified this month",
      className: "review",
      detail: `Updated ${dateText}`
    };
  }

  return {
    label: "Needs reconfirmation",
    className: "stale",
    detail: `Last updated ${dateText}`
  };
}

function formatCountdown(minutes) {
  if (minutes <= 0) {
    return "now";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
}

function buildNextPrayerInfo(dailyPrayerTimes, schedules) {
  const now = new Date();
  const dailyEntries = [
    { label: "Fajr", time: cleanText(dailyPrayerTimes?.fajr) },
    { label: "Zuhr", time: cleanText(dailyPrayerTimes?.zuhr) },
    { label: "Asr", time: cleanText(dailyPrayerTimes?.asr) },
    { label: "Maghrib", time: cleanText(dailyPrayerTimes?.maghrib) },
    { label: "Isha", time: cleanText(dailyPrayerTimes?.isha) }
  ].filter((item) => parseTimeToMinutes(item.time) !== Number.POSITIVE_INFINITY);

  const candidates = [];

  for (let offset = 0; offset <= 7; offset += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() + offset);

    for (const entry of dailyEntries) {
      const [hours, minutes] = entry.time.split(":").map((value) => Number.parseInt(value, 10));
      const candidate = new Date(day);
      candidate.setHours(hours, minutes, 0, 0);
      if (candidate > now) {
        candidates.push({ label: entry.label, date: candidate });
      }
    }

    if (day.getDay() === 5) {
      for (const schedule of schedules || []) {
        if (parseTimeToMinutes(schedule.time) === Number.POSITIVE_INFINITY) {
          continue;
        }

        const [hours, minutes] = schedule.time.split(":").map((value) => Number.parseInt(value, 10));
        const candidate = new Date(day);
        candidate.setHours(hours, minutes, 0, 0);
        if (candidate > now) {
          candidates.push({ label: schedule.label, date: candidate });
        }
      }
    }
  }

  if (!candidates.length) {
    return {
      text: "Next prayer: please confirm locally",
      label: "Prayer",
      atIso: ""
    };
  }

  candidates.sort((left, right) => left.date - right.date);
  const nextPrayer = candidates[0];
  const diffMinutes = Math.max(1, Math.floor((nextPrayer.date.getTime() - now.getTime()) / 60000));
  return {
    text: `Next ${nextPrayer.label} in ${formatCountdown(diffMinutes)}`,
    label: nextPrayer.label,
    atIso: nextPrayer.date.toISOString()
  };
}

function buildReportTimingLink({ masjidName, area, location, contactPerson, contactNumber, schedules }) {
  const jummahTimes = (schedules || [])
    .map((item) => cleanText(item?.time))
    .filter(Boolean);

  const locationWithArea = cleanText(location).toLowerCase().includes(cleanText(area).toLowerCase())
    ? cleanText(location)
    : `${cleanText(location)} (${cleanText(area)})`;

  const params = new URLSearchParams({
    usp: "pp_url",
    source: "prayerdetails-site",
    area,
    location,
    "entry.908885873": masjidName,
    "entry.1609710692": locationWithArea,
    "entry.100256006": cleanText(contactPerson),
    "entry.1426022243": cleanText(contactNumber),
    "entry.1824984330": jummahTimes[0] || "",
    "entry.567512640": jummahTimes[1] || ""
  });

  return `${GOOGLE_FORM_URL}?${params.toString()}`;
}

function getMonthlySeoStamp(date = new Date()) {
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric"
  });
}

function buildAreaPages(masjids) {
  const grouped = new Map();

  masjids.forEach((masjid) => {
    const key = (masjid.area || "Noida and nearby NCR").toLowerCase();
    const existing = grouped.get(key) || {
      name: masjid.area || "Noida and nearby NCR",
      slug: slugify(masjid.area || "noida-and-nearby-ncr"),
      masjids: []
    };

    existing.masjids.push(masjid);
    grouped.set(key, existing);
  });

  return Array.from(grouped.values())
    .map((areaPage) => ({
      ...areaPage,
      canonical: `${SITE_URL}/area/${areaPage.slug}/`
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function renderPopularSearchLinks(areaPages, masjids) {
  const links = [
    { label: "Masjid Near Me in Noida", href: "index.html#directory", note: "Browse all listings" },
    { label: "Jumma Time in Noida", href: "index.html#directory", note: "Friday prayer coverage" },
    { label: "Jummah Namaz Near Me", href: "index.html#directory", note: "Use nearby search" }
  ];

  areaPages.slice(0, 8).forEach((areaPage) => {
    links.push({
      label: `Namaz Time in ${areaPage.name}`,
      href: `area/${areaPage.slug}/index.html`,
      note: `${areaPage.masjids.length} masjid page${areaPage.masjids.length === 1 ? "" : "s"}`
    });
    links.push({
      label: `Jumma Namaz in ${areaPage.name}`,
      href: `area/${areaPage.slug}/index.html`,
      note: "Area landing page"
    });
  });

  masjids.slice(0, 4).forEach((masjid) => {
    links.push({
      label: `${masjid.name} Jummah Time`,
      href: `masjid/${masjid.slug}/index.html`,
      note: masjid.area
    });
  });

  return links
    .slice(0, 18)
    .map((link) => `<a class="related-link" href="${escapeHtml(link.href)}"><span>${escapeHtml(link.label)}</span><small>${escapeHtml(link.note)}</small></a>`)
    .join("");
}

function pickDisplayName(records) {
  const cleanedNames = records
    .map((record) => titleCase(removeScheduleSuffix(getRecordField(record, ["name", "masjid name"]) || "")))
    .filter(Boolean)
    .sort((left, right) => left.length - right.length);

  return cleanedNames[0] || titleCase(getRecordField(records[0] || {}, ["name", "masjid name"]) || "Masjid");
}

function uniqueSlug(baseSlug, counts) {
  const nextCount = (counts.get(baseSlug) || 0) + 1;
  counts.set(baseSlug, nextCount);
  return nextCount === 1 ? baseSlug : `${baseSlug}-${nextCount}`;
}

function getScheduleSignature(schedules = []) {
  return schedules
    .map((item) => `${cleanText(item?.label).toLowerCase()}|${cleanText(item?.time)}`)
    .sort()
    .join("||");
}

function scoreMasjidCompleteness(masjid) {
  let score = 0;

  if (masjid.mapLink && masjid.mapLink !== "#") score += 2;
  if (masjid.contactNumber) score += 2;
  if (masjid.whatsappNumber) score += 1;
  if (masjid.contactPerson) score += 1;
  if (masjid.management) score += 1;
  if (masjid.hasApiPrayerTiming) score += 2;
  score += (masjid.schedules || []).length;

  return score;
}

function dedupeMasjidsByLocationAndTime(masjids) {
  const deduped = new Map();

  for (const masjid of masjids) {
    const key = `${cleanText(masjid.location).toLowerCase()}||${getScheduleSignature(masjid.schedules)}`;
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, masjid);
      continue;
    }

    const existingScore = scoreMasjidCompleteness(existing);
    const currentScore = scoreMasjidCompleteness(masjid);

    if (currentScore > existingScore) {
      deduped.set(key, masjid);
      continue;
    }

    if (currentScore === existingScore && masjid.name.length < existing.name.length) {
      deduped.set(key, masjid);
    }
  }

  return Array.from(deduped.values());
}

function sentenceList(values) {
  if (!values.length) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function describeSchedule(schedule) {
  return schedule.time === "Please confirm locally"
    ? `${schedule.label}, please confirm locally`
    : `${schedule.label} at ${schedule.time}`;
}

function replaceTokens(template, replacements) {
  return Object.entries(replacements).reduce(
    (output, [token, value]) => output.replaceAll(token, value),
    template
  );
}

function parseGoogleVisualizationResponse(payload = "") {
  const startIndex = payload.indexOf("{");
  const endIndex = payload.lastIndexOf("}");

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("Invalid Google Sheets response format");
  }

  return JSON.parse(payload.slice(startIndex, endIndex + 1));
}

function convertGoogleSheetToRecords(visualizationData) {
  const columns = visualizationData?.table?.cols || [];
  const rows = visualizationData?.table?.rows || [];
  const headers = columns.map((column, index) => {
    const header = cleanText(column?.label || column?.id || `column_${index + 1}`);
    return header || `column_${index + 1}`;
  });

  return rows
    .map((row) => {
      const record = {};

      row?.c?.forEach((cell, index) => {
        const key = headers[index];
        if (!key) {
          return;
        }

        const formattedValue = cleanText(cell?.f || "");
        const rawValue = cell?.v;
        const value = formattedValue || (rawValue == null ? "" : String(rawValue));
        record[key] = cleanText(value);
      });

      return record;
    })
    .filter((record) => Object.values(record).some((value) => cleanText(value)));
}

function isRecordApproved(record) {
  const verificationStatus = getRecordField(record, ["verification status", "verification_status", "status"]);
  return cleanText(verificationStatus).toLowerCase() === "approved";
}

async function loadSourceData() {
  const response = await fetch(GOOGLE_SHEET_URL);
  if (!response.ok) {
    throw new Error(`Google Sheet fetch failed with ${response.status}`);
  }

  const raw = await response.text();
  const visualizationData = parseGoogleVisualizationResponse(raw);
  return convertGoogleSheetToRecords(visualizationData).filter(isRecordApproved);
}

async function loadDetails() {
  try {
    const raw = await fs.readFile(DETAILS_URL, "utf8");
    return JSON.parse(raw);
  } catch {
    return { siteContactEmail: "prayerdetails@gmail.com", masjids: {} };
  }
}

function buildMasjidModel(records, detailsSource, mapLinkData) {
  const grouped = new Map();

  for (const record of records) {
    const location = cleanText(getRecordField(record, ADDRESS_FIELD_CANDIDATES));
    const rawMapLink = normalizeMapLink(getRecordField(record, MAP_LINK_FIELD_CANDIDATES));
    const resolved = mapLinkData?.get(rawMapLink);
    const mapLink = resolved?.resolvedLink || rawMapLink;
    const coordinates = resolved?.coordinates || parseCoordinatesFromMapLink(mapLink);
    const coordinateKey = `${coordinates.lat ?? ""}:${coordinates.lng ?? ""}`;
    const key = mapLink || coordinateKey || location.toLowerCase();
    const existing = grouped.get(key) || {
      records: [],
      location,
      mapLink,
      coordinates
    };

    existing.records.push(record);
    if (!existing.location && location) {
      existing.location = location;
    }
    if (!existing.mapLink && mapLink) {
      existing.mapLink = mapLink;
    }
    if (!Number.isFinite(existing.coordinates.lat) && Number.isFinite(coordinates.lat)) {
      existing.coordinates = coordinates;
    }

    grouped.set(key, existing);
  }

  const slugCounts = new Map();
  const siteContactEmail = detailsSource.siteContactEmail || "prayerdetails@gmail.com";

  const masjidList = Array.from(grouped.values())
    .map((group, index) => {
      const name = pickDisplayName(group.records);
      const location = titleCase(group.location || "Location not available");
      const area = inferArea(group.location);
      const schedules = buildFridaySchedules(group.records);

      const baseSlug = slugify(`${name}-${location}`) || `masjid-${index + 1}`;
      const slug = uniqueSlug(baseSlug, slugCounts);
      const detailEntry = detailsSource.masjids?.[slug] || {};
      const dailyPrayerTimes = buildDailyPrayerTimes(group.records);
      const apiContactNumber = pickFirstFieldValue(group.records, ["contact number", "contact_number", "phone", "phone number", "mobile", "mobile number"]);
      const apiWhatsappNumber = pickFirstFieldValue(group.records, ["whatsapp number", "whatsapp_number", "whatsapp", "whats app number"]);
      const apiContactPerson = pickFirstFieldValue(group.records, ["contact person", "contact_person", "contact person name", "person", "contact name", "contact_name"]);
      const contactNumber = cleanText(detailEntry.contactNumber) || cleanText(apiContactNumber);
      const whatsappNumber = cleanText(detailEntry.whatsappNumber) || cleanText(apiWhatsappNumber) || contactNumber;
      const contactPerson = cleanText(detailEntry.contactPerson) || cleanText(apiContactPerson);
      const verification = buildVerificationStatus(group.records);
      const nextPrayerInfo = buildNextPrayerInfo(dailyPrayerTimes, schedules);

      return {
        slug,
        name,
        location,
        area,
        locality: inferLocality(group.location),
        coordinates: group.coordinates,
        mapLink: group.mapLink || "#",
        schedules,
        dailyPrayerTimes,
        contactNumber,
        whatsappNumber,
        contactPerson,
        management: cleanText(detailEntry.management),
        email: cleanText(detailEntry.email) || siteContactEmail,
        website: cleanText(detailEntry.website),
        notes: cleanText(detailEntry.notes),
        areaServed: cleanText(detailEntry.areaServed) || area,
        hasApiPrayerTiming: hasApiPrayerTiming(dailyPrayerTimes),
        verification,
        nextPrayerCountdown: nextPrayerInfo.text,
        nextPrayerLabel: nextPrayerInfo.label,
        nextPrayerAtIso: nextPrayerInfo.atIso,
        reportTimingLink: buildReportTimingLink({
          masjidName: name,
          area,
          location,
          contactPerson,
          contactNumber,
          schedules
        })
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  return dedupeMasjidsByLocationAndTime(masjidList);
}

function generateHomepageJsonLd(masjids, isoDate) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "Masjid Near Me, Jumma/Jummah Namaz Time in Noida",
        alternateName: [
          "Namaz Time Noida",
          "Jumma Time Noida",
          "Jummah Time Noida",
          "Masjid Near Me",
          "Jumma Namaz Near Me",
          "Jama Masjid Noida"
        ],
        url: `${SITE_URL}/`,
        inLanguage: "en-IN",
        description: "Find namaz time, Jumma/Jummah namaz time, Friday prayer timing, and masjid near me listings in Noida, Greater Noida, and nearby NCR.",
        keywords: HOME_KEYWORDS.join(", "),
        dateModified: isoDate,
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        email: "prayerdetails@gmail.com",
        areaServed: {
          "@type": "Place",
          name: "Noida, Greater Noida and nearby NCR"
        }
      },
      {
        "@type": "CollectionPage",
        "@id": `${SITE_URL}/#directory`,
        name: "Namaz time and masjid directory for Noida",
        url: `${SITE_URL}/`,
        inLanguage: "en-IN",
        about: "Masjid directory with namaz time, Jumma/Jummah prayer timing, contact availability, and map links",
        dateModified: isoDate,
        isPartOf: { "@id": `${SITE_URL}/#website` }
      },
      {
        "@type": "ItemList",
        name: "Masjid pages",
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        itemListElement: masjids.map((masjid, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${SITE_URL}/masjid/${masjid.slug}/`,
          name: masjid.name
        }))
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How can I find masjid near me for Jumma or Jummah namaz?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Use this directory search and nearby button to find masjid near me, jumma masjid near me, and Friday prayer timing with map directions in Noida and nearby NCR."
            }
          },
          {
            "@type": "Question",
            name: "Can I check Jumma namaz in Noida and Jummah namaz in Noida from one place?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Each listed masjid has a dedicated page with Jumma/Jummah time, map access, and contact details when available."
            }
          },
          {
            "@type": "Question",
            name: "Does this website help with namaz time and jumma time queries in Noida?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. The website is optimized for queries like namaz time Noida, jumma time Noida, jummah time Noida, jama masjid, and masjid in Noida."
            }
          }
        ]
      }
    ]
  };
}

function generateDetailJsonLd(masjid, isoDate) {
  const canonical = `${SITE_URL}/masjid/${masjid.slug}/`;
  const questions = [
    {
      question: `What is the Jummah time at ${masjid.name}?`,
      answer: `${masjid.name} currently lists ${sentenceList(masjid.schedules.map((item) => describeSchedule(item)))}.`
    },
    {
      question: `Where is ${masjid.name} located?`,
      answer: `${masjid.name} is listed at ${masjid.location}. Use the map link on this page for directions.`
    },
    {
      question: `How can I contact ${masjid.name}?`,
      answer: masjid.contactNumber
        ? `You can call ${masjid.contactNumber} for verified contact information.`
        : `A verified phone number is not yet available. You can request an update through ${masjid.email}.`
    }
  ];

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}/`
          },
          {
            "@type": "ListItem",
            position: 2,
            name: masjid.name,
            item: canonical
          }
        ]
      },
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: `${masjid.name} Jummah time and contact details`,
        inLanguage: "en-IN",
        description: `Check Friday prayer timing, map directions, and contact details for ${masjid.name} in ${masjid.areaServed}.`,
        dateModified: isoDate,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
        mainEntity: { "@id": `${canonical}#place` }
      },
      {
        "@type": "PlaceOfWorship",
        "@id": `${canonical}#place`,
        name: masjid.name,
        url: canonical,
        description: `Masjid page for ${masjid.name} with Jummah prayer timing, contact information, and directions.`,
        address: {
          "@type": "PostalAddress",
          streetAddress: masjid.location,
          addressLocality: masjid.locality,
          addressRegion: "Uttar Pradesh",
          addressCountry: "IN"
        },
        areaServed: masjid.areaServed,
        isAccessibleForFree: true,
        hasMap: masjid.mapLink || undefined,
        telephone: masjid.contactNumber || undefined,
        email: masjid.email || undefined,
        geo: Number.isFinite(masjid.coordinates.lat) && Number.isFinite(masjid.coordinates.lng)
          ? {
              "@type": "GeoCoordinates",
              latitude: masjid.coordinates.lat,
              longitude: masjid.coordinates.lng
            }
          : undefined
      },
      {
        "@type": "FAQPage",
        mainEntity: questions.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer
          }
        }))
      }
    ]
  };
}

function generateAreaJsonLd(areaPage, isoDate) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${areaPage.canonical}#collection`,
        url: areaPage.canonical,
        name: `Namaz Time and Masjid in ${areaPage.name}`,
        inLanguage: "en-IN",
        description: `Find Jumma/Jummah namaz time, nearby masjids, and Friday prayer details in ${areaPage.name}.`,
        dateModified: isoDate,
        isPartOf: { "@id": `${SITE_URL}/#website` }
      },
      {
        "@type": "ItemList",
        name: `Masjid pages in ${areaPage.name}`,
        itemListElement: areaPage.masjids.map((masjid, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${SITE_URL}/masjid/${masjid.slug}/`,
          name: masjid.name
        }))
      }
    ]
  };
}

function generateAreaHtml(areaPage, lastUpdated, seoRefreshStamp, isoDate) {
  const title = `Namaz Time in ${areaPage.name} | Jumma Time, Jummah Time, Masjid Near Me`;
  const description = `Find namaz time, Jumma/Jummah namaz time and masjid near me in ${areaPage.name} with map and masjid detail pages.`;
  const links = areaPage.masjids
    .map(
      (masjid) => `<a class="related-link" href="../../masjid/${masjid.slug}/index.html"><span>${escapeHtml(masjid.name)}</span><small>${escapeHtml(masjid.schedules.map((item) => describeSchedule(item)).join(" • ") || "Timing pending")}</small></a>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="keywords" content="namaz time ${escapeHtml(areaPage.name.toLowerCase())}, jumma time ${escapeHtml(areaPage.name.toLowerCase())}, jummah time ${escapeHtml(areaPage.name.toLowerCase())}, masjid in ${escapeHtml(areaPage.name.toLowerCase())}, masjid near me">
<meta name="robots" content="index, follow">
<meta name="last-updated-month" content="${escapeHtml(seoRefreshStamp)}">
<link rel="canonical" href="${escapeHtml(areaPage.canonical)}">
<link rel="alternate" hreflang="en-IN" href="${escapeHtml(areaPage.canonical)}">
<link rel="alternate" hreflang="x-default" href="${escapeHtml(areaPage.canonical)}">
<link rel="icon" href="../../favicon.png">
<link rel="stylesheet" href="../../style.css">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${escapeHtml(areaPage.canonical)}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<script id="json-ld" type="application/ld+json">${escapeJsonForScript(generateAreaJsonLd(areaPage, isoDate))}</script>
</head>
<body class="detail-page">
<a class="skip-link" href="#main-content">Skip to main content</a>
<header class="site-shell page-header">
  <div class="topbar">
    <a class="brand" href="../../index.html">Prayer Details</a>
    <div class="topbar-actions">
      <a class="topbar-link" href="../../index.html#directory">Browse all masjids</a>
      <a class="topbar-cta" href="${GOOGLE_FORM_URL}?usp=publish-editor" target="_blank" rel="noopener">Click to Add Your Masjid</a>
    </div>
  </div>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <a href="../../index.html">Home</a>
    <span>/</span>
    <span>${escapeHtml(areaPage.name)}</span>
  </nav>
  <section class="detail-hero hero-panel card-surface" aria-labelledby="area-title">
    <div>
      <p class="eyebrow">Area landing page</p>
      <h1 id="area-title">Namaz time and masjid listings in ${escapeHtml(areaPage.name)}</h1>
      <p class="detail-summary">Use this page for searches like jumma time, jummah time, jumma namaz near me, and masjid near me in ${escapeHtml(areaPage.name)}.</p>
      <div class="hero-pills"><span class="tag-chip">${areaPage.masjids.length} masjid page${areaPage.masjids.length === 1 ? "" : "s"}</span><span class="tag-chip">SEO refreshed ${escapeHtml(seoRefreshStamp)}</span></div>
    </div>
  </section>
</header>
<main id="main-content" class="site-shell page-main">
  <section class="card-surface detail-card" aria-labelledby="area-list-title">
    <h2 id="area-list-title">Masjids in ${escapeHtml(areaPage.name)}</h2>
    <div class="related-links">${links}</div>
  </section>
</main>
<footer class="site-shell footer footer-detail">
  <p>Last updated ${escapeHtml(lastUpdated)}. SEO and schema refreshed ${escapeHtml(seoRefreshStamp)}.</p>
</footer>
</body>
</html>`;
}

function renderScheduleChips(schedules, variant = "default") {
  return schedules
    .map((schedule) => {
      const isKhutbah = /khutbah|jummah/i.test(schedule.label || "");
      const classes = [
        "schedule-chip",
        variant === "compact" ? "schedule-chip-compact" : "",
        isKhutbah ? "schedule-chip-khutbah" : ""
      ]
        .filter(Boolean)
        .join(" ");
      return `<span class="${classes}"><strong>${escapeHtml(schedule.label)}:</strong> ${escapeHtml(schedule.time)}</span>`;
    })
    .join("");
}

function renderTimingList(schedules) {
  return schedules
    .map(
      (schedule) => {
        const isKhutbah = /khutbah|jummah/i.test(schedule.label || "");
        const rowClass = isKhutbah ? "timing-row timing-row-khutbah" : "timing-row";
        return `
        <div class="${rowClass}">
          <span>${escapeHtml(schedule.label)}</span>
          <strong>${escapeHtml(schedule.time)}</strong>
        </div>`;
      }
    )
    .join("");
}

function renderFiveTimesGrid(dailyPrayerTimes, schedules) {
  const timeMap = new Map();
  const normalizedDailyTimes = {
    Fajr: cleanText(dailyPrayerTimes?.fajr),
    Zuhr: cleanText(dailyPrayerTimes?.zuhr),
    Asr: cleanText(dailyPrayerTimes?.asr),
    Maghrib: cleanText(dailyPrayerTimes?.maghrib),
    Isha: cleanText(dailyPrayerTimes?.isha)
  };

  schedules.forEach((schedule) => {
    timeMap.set(schedule.label, schedule.time);
  });

  // Find Jummah time if available
  let jummahTime = null;
  let jummahLabel = null;
  
  if (timeMap.has("Jummah")) {
    jummahTime = timeMap.get("Jummah");
    jummahLabel = "Jummah";
  } else if (timeMap.has("Khutbah")) {
    jummahTime = timeMap.get("Khutbah");
    jummahLabel = "Khutbah";
  } else if (timeMap.has("First Khutbah")) {
    jummahTime = timeMap.get("First Khutbah");
    jummahLabel = "First Khutbah";
  }

  // Create regular prayers row
  const regularPrayers = ["Fajr", "Zuhr", "Asr", "Maghrib", "Isha"]
    .map((label) => {
      const time = normalizedDailyTimes[label];
      if (!time) return null;
      return `<div class="prayer-time-row">
        <span class="prayer-label">${escapeHtml(label)}</span>
        <span class="prayer-time">${escapeHtml(time)}</span>
      </div>`;
    })
    .filter(Boolean)
    .join("");

  const jummahCard = jummahLabel && jummahTime ? `
    <div class="jummah-highlight-card">
      <p class="jummah-label">Friday Prayer</p>
      <p class="jummah-prayer-label">${escapeHtml(jummahLabel)}</p>
      <p class="jummah-time">${escapeHtml(jummahTime)}</p>
    </div>` : '';

  return `
    <div class="prayer-times-table">
      <div class="regular-times-section">
        ${regularPrayers || '<p style="padding: 12px; color: var(--muted); font-size: 0.92rem;">Prayer times will be displayed here.</p>'}
      </div>
      ${jummahCard}
    </div>`;
}

function hasApiPrayerTiming(dailyPrayerTimes) {
  return Object.values(dailyPrayerTimes || {}).some((value) => Boolean(cleanText(value)));
}

function renderPrayerTimesSection(masjid) {
  if (!masjid.hasApiPrayerTiming) {
    return "";
  }

  return `
  <section id="timing-section" class="card-surface detail-card timing-section" aria-labelledby="timing-title">
    <h2 id="timing-title">All 5 Prayer Times</h2>
    ${renderFiveTimesGrid(masjid.dailyPrayerTimes, masjid.schedules)}
    <p class="timing-note">Prayer times may vary by a few minutes. Arrive early, especially for Friday prayers. For current Azan (call to prayer) notifications, check with the masjid directly.</p>
  </section>`;
}

function renderAreaTags(masjids, areaPages) {
  const areaSlugByName = new Map(
    (areaPages || []).map((areaPage) => [cleanText(areaPage.name).toLowerCase(), areaPage.slug])
  );
  const seen = new Set();
  const areas = masjids
    .map((masjid) => masjid.area)
    .filter((area) => {
      const key = area.toLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 8);

  return areas
    .map((area) => {
      const areaSlug = areaSlugByName.get(cleanText(area).toLowerCase());

      if (areaSlug) {
        return `<a class="tag-chip area-link" href="area/${escapeHtml(areaSlug)}/index.html" aria-label="View masjid listings for ${escapeHtml(area)}"><span class="tag-chip-inner">${escapeHtml(area)}</span></a>`;
      }

      return `<button class="tag-chip area-filter" type="button" data-area="${escapeHtml(area)}"><span class="tag-chip-inner">${escapeHtml(area)}</span></button>`;
    })
    .join("");
}

function renderMasjidCards(masjids) {
  return masjids
    .map(
      (masjid) => `
        <article class="masjid-card card-surface" data-lat="${masjid.coordinates.lat ?? ""}" data-lng="${masjid.coordinates.lng ?? ""}" data-name="${escapeHtml(masjid.name)}" data-area="${escapeHtml(masjid.area)}" data-location="${escapeHtml(masjid.location)}" data-prayers="${escapeHtml(masjid.schedules.map((item) => item.label).join(" "))}" data-search="${escapeHtml(`${masjid.name} ${masjid.location} ${masjid.area} ${masjid.schedules.map((item) => item.label).join(" ")}`.toLowerCase())}" data-slug="${escapeHtml(masjid.slug)}">
          <div class="card-header-row">
            <div>
              <p class="eyebrow">${escapeHtml(masjid.area)}</p>
              <h3><a href="masjid/${masjid.slug}/index.html">${escapeHtml(masjid.name)}</a></h3>
            </div>
            <span class="availability-pill ${escapeHtml(masjid.verification.className)}">${escapeHtml(masjid.verification.label)}</span>
          </div>
          <p class="card-location">${escapeHtml(masjid.location)}</p>
          <div class="card-meta-row">
            <p class="card-meta-text"><span class="next-prayer-countdown" data-next-prayer-label="${escapeHtml(masjid.nextPrayerLabel || "Prayer")}" data-next-prayer-at="${escapeHtml(masjid.nextPrayerAtIso || "")}">${escapeHtml(masjid.nextPrayerCountdown)}</span></p>
            <span class="masjid-distance">Enable location for distance</span>
          </div>
          <div class="schedule-row">
            ${renderScheduleChips(masjid.schedules, "compact")}
          </div>
          ${masjid.hasApiPrayerTiming ? `<div class="prayer-times-link">
            <a href="masjid/${masjid.slug}/index.html#timing-section" class="times-link-text">View all 5 prayer times →</a>
          </div>` : ""}
          <div class="card-actions">
            <a class="button button-primary" href="masjid/${masjid.slug}/index.html">View masjid details</a>
            <a class="button button-secondary" href="${escapeHtml(masjid.mapLink)}" target="_blank" rel="noopener">Map directions</a>
            <a class="button button-secondary" href="${escapeHtml(masjid.reportTimingLink)}" target="_blank" rel="noopener">Report incorrect info</a>
          </div>
        </article>`
    )
    .join("");
}

function renderContactBlock(masjid) {
  const rows = [];

  rows.push(`
    <div class="contact-row">
      <span>Management</span>
      <strong>${escapeHtml(masjid.management || "Management details are being verified.")}</strong>
    </div>`);

  rows.push(`
    <div class="contact-row">
      <span>Phone</span>
      <strong>${masjid.contactNumber ? `<a href="tel:${escapeHtml(masjid.contactNumber)}">${escapeHtml(masjid.contactNumber)}</a>` : "Phone number not yet available"}</strong>
    </div>`);

  rows.push(`
    <div class="contact-row">
      <span>WhatsApp</span>
      <strong>${masjid.whatsappNumber ? `<a href="https://wa.me/${escapeHtml(masjid.whatsappNumber.replace(/\D/g, ""))}" target="_blank" rel="noopener">${escapeHtml(masjid.whatsappNumber)}</a>` : "Not listed"}</strong>
    </div>`);

  rows.push(`
    <div class="contact-row">
      <span>Contact person</span>
      <strong>${escapeHtml(masjid.contactPerson || "Community update requested")}</strong>
    </div>`);

  rows.push(`
    <div class="contact-row">
      <span>Verification status</span>
      <strong>${escapeHtml(masjid.verification.label)} (${escapeHtml(masjid.verification.detail)})</strong>
    </div>`);

  rows.push(`
    <div class="contact-row">
      <span>Email</span>
      <strong><a href="mailto:${escapeHtml(masjid.email)}">${escapeHtml(masjid.email)}</a></strong>
    </div>`);

  if (masjid.notes) {
    rows.push(`
      <div class="contact-note">
        <p>${escapeHtml(masjid.notes)}</p>
      </div>`);
  } else {
    rows.push(`
      <div class="contact-note">
        <p>Verified management contacts can be added as they become available. Use the email above if you want to submit an update for this masjid.</p>
      </div>`);
  }

  rows.push(`
    <div class="contact-note">
      <p>If prayer time has changed, help others by reporting it.</p>
      <p><a class="button button-secondary" href="${escapeHtml(masjid.reportTimingLink)}" target="_blank" rel="noopener">Report incorrect info</a></p>
    </div>`);

  return rows.join("");
}

function renderFaqItems(items) {
  return items
    .map(
      (item) => `
        <article class="faq-item">
          <h3>${escapeHtml(item.question)}</h3>
          <p>${escapeHtml(item.answer)}</p>
        </article>`
    )
    .join("");
}

function renderRelatedLinks(currentMasjid, allMasjids) {
  const related = allMasjids
    .filter((candidate) => candidate.slug !== currentMasjid.slug)
    .sort((left, right) => {
      const leftScore = left.area === currentMasjid.area ? 0 : 1;
      const rightScore = right.area === currentMasjid.area ? 0 : 1;
      if (leftScore !== rightScore) {
        return leftScore - rightScore;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 4);

  return related
    .map(
      (masjid) => `
        <a class="related-link" href="../${masjid.slug}/index.html">
          <span>${escapeHtml(masjid.name)}</span>
          <small>${escapeHtml(masjid.area)}</small>
        </a>`
    )
    .join("");
}

function generateHomepageHtml(template, masjids, areaPages, lastUpdated, seoRefreshStamp, isoDate) {
  const areaCount = new Set(masjids.map((masjid) => masjid.area.toLowerCase())).size;
  const homeTitle = "Namaz Time Noida | Jumma Time, Jummah Time, Masjid Near Me";
  const homeDescription = "Find namaz time in Noida, Jumma/Jummah namaz time, jama masjid and masjid near me with map directions, nearby sorting, and dedicated masjid pages.";
  const homeKeywords = HOME_KEYWORDS.join(", ");
  const homeOgDescription = "Search masjid near me, jumma masjid, jumma/jummah namaz in Noida, and Friday prayer timing with map and contact details.";
  const replacements = {
    "__JSON_LD__": escapeJsonForScript(generateHomepageJsonLd(masjids, isoDate)),
    "__HOME_TITLE__": escapeHtml(homeTitle),
    "__HOME_DESCRIPTION__": escapeHtml(homeDescription),
    "__HOME_KEYWORDS__": escapeHtml(homeKeywords),
    "__HOME_OG_DESCRIPTION__": escapeHtml(homeOgDescription),
    "__SEO_REFRESH_STAMP__": escapeHtml(seoRefreshStamp),
    "__MASJID_COUNT__": String(masjids.length),
    "__AREA_COUNT__": String(areaCount),
    "__LAST_UPDATED__": escapeHtml(lastUpdated),
    "<!--POPULAR_SEARCH_LINKS-->": renderPopularSearchLinks(areaPages, masjids),
    "<!--AREA_TAGS-->": renderAreaTags(masjids, areaPages),
    "<!--MASJID_CARDS-->": renderMasjidCards(masjids)
  };

  return replaceTokens(template, replacements);
}

function generateDetailHtml(template, masjid, allMasjids, lastUpdated, isoDate) {
  const canonical = `${SITE_URL}/masjid/${masjid.slug}/`;
  const title = `${masjid.name} | Jumma Time, Jummah Namaz, Masjid in ${masjid.area}`;
  const description = `Check ${masjid.name} for Jumma/Jummah namaz time, Friday prayer timing, map location, and contact information in ${masjid.areaServed}, Noida region.`;
  const keywords = [
    `${masjid.name.toLowerCase()} jumma time`,
    `${masjid.name.toLowerCase()} jummah time`,
    `${masjid.name.toLowerCase()} namaz time`,
    `${masjid.name.toLowerCase()} contact number`,
    `${masjid.area.toLowerCase()} masjid`,
    `masjid in ${masjid.area.toLowerCase()}`,
    "jumma namaz near me",
    "jummah namaz near me",
    "masjid near me",
    "jumma prayer noida"
  ].join(", ");
  const summary = `${masjid.name} serves ${masjid.areaServed}. Use this page to check Jummah timing, open directions, and review any verified management or contact details available for this masjid.`;
  const heroPills = [
    `<span class="tag-chip">${escapeHtml(masjid.area)}</span>`,
    `<span class="tag-chip">${escapeHtml(masjid.verification.label)}</span>`,
    `<span class="tag-chip">${escapeHtml(masjid.nextPrayerCountdown)}</span>`,
    `<span class="tag-chip">${escapeHtml(masjid.schedules.length)} Friday slot${masjid.schedules.length === 1 ? "" : "s"}</span>`
  ].join("");
  const faqItems = [
    {
      question: `What is the Jummah time at ${masjid.name}?`,
      answer: sentenceList(masjid.schedules.map((schedule) => describeSchedule(schedule)))
    },
    {
      question: `Can I use this page for Jumma namaz and Jummah namaz timing searches?`,
      answer: `Yes. This page is designed for both Jumma and Jummah namaz timing searches for ${masjid.name}.`
    },
    {
      question: `Where is ${masjid.name} located?`,
      answer: `${masjid.name} is listed at ${masjid.location}. The map button on this page opens directions.`
    },
    {
      question: `Does ${masjid.name} have a verified contact number?`,
      answer: masjid.contactNumber
        ? `${masjid.name} currently lists ${masjid.contactNumber} as a contact number.`
        : `A verified contact number is not available yet. Use ${masjid.email} to request an update.`
    }
  ];

  const replacements = {
    "__TITLE__": escapeHtml(title),
    "__DESCRIPTION__": escapeHtml(description),
    "__KEYWORDS__": escapeHtml(keywords),
    "__CANONICAL__": canonical,
    "__JSON_LD__": escapeJsonForScript(generateDetailJsonLd(masjid, isoDate)),
    "__BREADCRUMB__": escapeHtml(masjid.name),
    "__PAGE_HEADING__": escapeHtml(masjid.name),
    "__SUMMARY__": escapeHtml(summary),
    "__HERO_PILLS__": heroPills,
    "__TIMING_LIST__": renderTimingList(masjid.schedules),
    "__PRAYER_TIMES_SECTION__": renderPrayerTimesSection(masjid),
    "__MAP_LINK__": escapeHtml(masjid.mapLink),
    "__ADDRESS__": escapeHtml(masjid.location),
    "__AREA_SERVED__": escapeHtml(masjid.areaServed),
    "__PRIMARY_PRAYER__": escapeHtml(masjid.schedules[0]?.label || "Jummah"),
    "__COORDINATES__": escapeHtml(formatCoordinates(masjid.coordinates)),
    "__LAT__": Number.isFinite(masjid.coordinates.lat) ? String(masjid.coordinates.lat) : "",
    "__LNG__": Number.isFinite(masjid.coordinates.lng) ? String(masjid.coordinates.lng) : "",
    "__DISTANCE_FROM_YOU__": "Enable location to calculate",
    "__CONTACT_BLOCK__": renderContactBlock(masjid),
    "__ABOUT_TEXT__": escapeHtml(`${masjid.name} is one of the masjids people search for when looking for Friday prayer in ${masjid.area}. This page gives a cleaner overview than a single list entry by keeping timings, map access, and management details in one place.`),
    "__VISIT_TEXT__": escapeHtml(`If you plan to attend Jummah at ${masjid.name}, arrive a little early and confirm any seasonal timing changes. Community members can also help improve this listing by sharing verified management and phone details.`),
    "__FAQ_ITEMS__": renderFaqItems(faqItems),
    "__RELATED_LINKS__": renderRelatedLinks(masjid, allMasjids),
    "__LAST_UPDATED__": escapeHtml(lastUpdated)
  };

  return replaceTokens(template, replacements);
}

function generateSitemap(masjids, areaPages, isoDate) {
  const urls = [
    {
      loc: `${SITE_URL}/`,
      changefreq: "daily",
      priority: "1.0"
    },
    ...areaPages.map((areaPage) => ({
      loc: `${SITE_URL}/area/${areaPage.slug}/`,
      changefreq: "weekly",
      priority: "0.7"
    })),
    ...masjids.map((masjid) => ({
      loc: `${SITE_URL}/masjid/${masjid.slug}/`,
      changefreq: "weekly",
      priority: "0.8"
    }))
  ];

  const entries = urls
    .map(
      (url) => `  <url>\n    <loc>${url.loc}</loc>\n    <lastmod>${isoDate}</lastmod>\n    <changefreq>${url.changefreq}</changefreq>\n    <priority>${url.priority}</priority>\n  </url>`
    )
    .join("\n\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">\n\n${entries}\n\n</urlset>\n`;
}

async function build() {
  const [rawData, detailsSource, indexTemplate, detailTemplate, sourceStyle] = await Promise.all([
    loadSourceData(),
    loadDetails(),
    fs.readFile(INDEX_TEMPLATE_URL, "utf8"),
    fs.readFile(DETAIL_TEMPLATE_URL, "utf8"),
    fs.readFile(SOURCE_STYLE_URL, "utf8")
  ]);

  const mapLinkData = await resolveMapLinkData(rawData);

  const masjids = buildMasjidModel(rawData, detailsSource, mapLinkData);
  const areaPages = buildAreaPages(masjids);
  const isoDate = new Date().toISOString().slice(0, 10);
  const seoRefreshStamp = getMonthlySeoStamp(new Date());
  const prettyDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  await fs.rm(MASJID_DIRECTORY_URL, { recursive: true, force: true });
  await fs.mkdir(MASJID_DIRECTORY_URL, { recursive: true });
  await fs.rm(AREA_DIRECTORY_URL, { recursive: true, force: true });
  await fs.mkdir(AREA_DIRECTORY_URL, { recursive: true });

  await fs.writeFile(STYLE_OUTPUT_URL, sourceStyle, "utf8");

  const homepage = generateHomepageHtml(indexTemplate, masjids, areaPages, prettyDate, seoRefreshStamp, isoDate);
  await fs.writeFile(INDEX_OUTPUT_URL, homepage, "utf8");

  await Promise.all(
    masjids.map(async (masjid) => {
      const pageDirectory = new URL(`./masjid/${masjid.slug}/`, import.meta.url);
      const pageUrl = new URL(`./masjid/${masjid.slug}/index.html`, import.meta.url);
      await fs.mkdir(pageDirectory, { recursive: true });
      await fs.writeFile(pageUrl, generateDetailHtml(detailTemplate, masjid, masjids, prettyDate, isoDate), "utf8");
    })
  );

  await Promise.all(
    areaPages.map(async (areaPage) => {
      const areaDirectory = new URL(`./area/${areaPage.slug}/`, import.meta.url);
      const areaUrl = new URL(`./area/${areaPage.slug}/index.html`, import.meta.url);
      await fs.mkdir(areaDirectory, { recursive: true });
      await fs.writeFile(areaUrl, generateAreaHtml(areaPage, prettyDate, seoRefreshStamp, isoDate), "utf8");
    })
  );

  await fs.writeFile(SITEMAP_OUTPUT_URL, generateSitemap(masjids, areaPages, isoDate), "utf8");
  const masjidsWithFiveTimes = masjids.filter((masjid) => masjid.hasApiPrayerTiming);
  if (masjidsWithFiveTimes.length) {
    console.log(`Prayer-time links enabled for ${masjidsWithFiveTimes.length} masjid(s): ${masjidsWithFiveTimes.map((masjid) => masjid.name).join(", ")}`);
  } else {
    console.log("Prayer-time links disabled for all masjids (no daily salah values from API columns). ");
  }
  console.log(`Built homepage and ${masjids.length} masjid pages.`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
