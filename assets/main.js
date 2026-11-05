const LANG = document.documentElement.lang === "ru" ? "ru" : "pl";
const PHONE_WA = "48510507500";

// Opening hours come from src/data.js via <html data-hours>, keyed by weekday (Sun=0)
const HOURS = JSON.parse(document.documentElement.dataset.hours || "{}");

const T = {
  pl: {
    open: c => `Otwarte teraz · do ${c}`,
    closingSoon: c => `Otwarte · zamykamy o ${c}`,
    today: o => `Zamknięte · otwieramy dziś o ${o}`,
    tomorrow: o => `Zamknięte · otwieramy jutro o ${o}`,
    later: (d, o) => `Zamknięte · otwieramy w ${d} o ${o}`,
    days: ["niedzielę", "poniedziałek", "wtorek", "środę", "czwartek", "piątek", "sobotę"],
    wa: f => `Dzień dobry! Zgłoszenie ze strony:\nImię: ${f.name}\nTelefon: ${f.phone}\nAuto: ${f.car}\nUsługa: ${f.service}\nOpis: ${f.msg}`
  },
  ru: {
    open: c => `Открыто сейчас · до ${c}`,
    closingSoon: c => `Открыто · закрываемся в ${c}`,
    today: o => `Закрыто · откроемся сегодня в ${o}`,
    tomorrow: o => `Закрыто · откроемся завтра в ${o}`,
    later: (d, o) => `Закрыто · откроемся в ${d} в ${o}`,
    days: ["воскресенье", "понедельник", "вторник", "среду", "четверг", "пятницу", "субботу"],
    wa: f => `Здравствуйте! Заявка с сайта:\nИмя: ${f.name}\nТелефон: ${f.phone}\nАвто: ${f.car}\nУслуга: ${f.service}\nОписание: ${f.msg}`
  }
}[LANG];

// Current day and minutes in Warsaw, whatever the visitor's timezone
function warsawNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, min: +get("hour") * 60 + +get("minute") };
}
const toMin = s => +s.slice(0, 2) * 60 + +s.slice(3);

function openStatus() {
  const { day, min } = warsawNow();
  const h = HOURS[day];
  if (h && min >= toMin(h[0]) && min < toMin(h[1])) {
    return { open: true, text: toMin(h[1]) - min <= 60 ? T.closingSoon(h[1]) : T.open(h[1]) };
  }
  if (h && min < toMin(h[0])) return { open: false, text: T.today(h[0]) };
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    if (HOURS[d]) return { open: false, text: i === 1 ? T.tomorrow(HOURS[d][0]) : T.later(T.days[d], HOURS[d][0]) };
  }
}

function renderStatus() {
  const s = openStatus();
  document.querySelectorAll("[data-status]").forEach(el => {
    el.textContent = s.text;
    el.classList.toggle("open", s.open);
    el.classList.toggle("closed", !s.open);
  });
  const { day } = warsawNow();
  document.querySelectorAll(".hours li").forEach(li => li.classList.toggle("today", +li.dataset.day === day));
}
renderStatus();
setInterval(renderStatus, 60000);

// Lead form → prefilled WhatsApp message (no backend needed)
const form = document.getElementById("leadForm");
if (form) form.addEventListener("submit", e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(form));
  for (const k of ["car", "msg"]) f[k] = f[k] || "-";
  window.open(`https://wa.me/${PHONE_WA}?text=` + encodeURIComponent(T.wa(f)), "_blank", "noopener");
});

// Scroll reveal
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { threshold: 0, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".rv").forEach(el => io.observe(el));
} else {
  document.querySelectorAll(".rv").forEach(el => el.classList.add("in"));
}

// Live Google rating and reviews (Places API (New)). Without an API key the
// built-in fallback values stay on the page.
const G = {
  place: document.documentElement.dataset.gplace,
  key: document.documentElement.dataset.gkey,
  cacheKey: `sl-google-${LANG}`,
  cacheMs: 30 * 60 * 1000,
  locale: LANG === "ru" ? "ru-RU" : "pl-PL",
  count: {
    pl: { one: "opinia", few: "opinie", many: "opinii", suffix: "w Google" },
    ru: { one: "отзыв", few: "отзыва", many: "отзывов", suffix: "в Google" }
  }[LANG]
};

async function fetchGoogle() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(G.cacheKey));
    if (cached && Date.now() - cached.t < G.cacheMs) return cached.d;
  } catch (e) {}
  const res = await fetch(`https://places.googleapis.com/v1/places/${G.place}?languageCode=${LANG}`, {
    headers: { "X-Goog-Api-Key": G.key, "X-Goog-FieldMask": "rating,userRatingCount,reviews" }
  });
  if (!res.ok) throw new Error(`Places API ${res.status}`);
  const data = await res.json();
  try { sessionStorage.setItem(G.cacheKey, JSON.stringify({ t: Date.now(), d: data })); } catch (e) {}
  return data;
}

function applyRating({ rating, userRatingCount }) {
  if (typeof rating !== "number") return;
  const value = rating.toLocaleString(G.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  document.querySelectorAll("[data-g-rating]").forEach(el => { el.textContent = value; });
  document.querySelectorAll(".rating .stars").forEach(el => el.style.setProperty("--r", `${Math.round((rating / 5) * 100)}%`));
  if (typeof userRatingCount === "number") {
    const form = G.count[new Intl.PluralRules(LANG).select(userRatingCount)] || G.count.many;
    document.querySelectorAll("[data-g-count]").forEach(el => { el.textContent = `${userRatingCount} ${form} ${G.count.suffix}`; });
  }
}

// Review text comes from Google, so it is only ever set via textContent
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}

function renderReviews(reviews) {
  const box = document.getElementById("gReviews");
  if (!box || !Array.isArray(reviews) || !reviews.length) return;
  box.replaceChildren(...reviews.slice(0, 3).map(r => {
    const card = el("article", "review g-review");
    const head = el("header");
    const author = r.authorAttribution || {};
    if (author.photoUri) {
      const img = el("img");
      Object.assign(img, { src: author.photoUri, alt: "", width: 40, height: 40, loading: "lazy", referrerPolicy: "no-referrer" });
      head.append(img);
    }
    const who = el("div");
    const name = el(author.uri ? "a" : "b", "g-author", author.displayName || "Google");
    if (author.uri) Object.assign(name, { href: author.uri, target: "_blank", rel: "noopener" });
    who.append(name, el("small", "", r.relativePublishTimeDescription || ""));
    head.append(who);
    const stars = el("div", "stars", "★★★★★");
    stars.style.setProperty("--r", `${((r.rating || 0) / 5) * 100}%`);
    const text = (r.text && r.text.text) || (r.originalText && r.originalText.text) || "";
    card.append(head, stars, el("p", "", text));
    return card;
  }));
  const src = document.querySelector(".g-source");
  if (src) src.hidden = false;
}

if (G.place && G.key) {
  fetchGoogle()
    .then(data => { applyRating(data); renderReviews(data.reviews); })
    .catch(() => { /* keep fallback values */ });
}
