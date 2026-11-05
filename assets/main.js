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
