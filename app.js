const HIVE_COUNT = 10;
const CACHE_KEY = "diario-arnie-cache-v2";
const QUEUE_KEY = "diario-arnie-queue-v2";
const TOKEN_KEY = "diario-arnie-token";
const SAVE_DELAY = 500;
const SAVED_HINT_DURATION = 1500;

const hivesGrid = document.querySelector("#hives-grid");
const dateMain = document.querySelector("#date-main");
const todayBadge = document.querySelector("#today-badge");
const syncStatus = document.querySelector("#sync-status");
const previousDayButton = document.querySelector("#previous-day");
const nextDayButton = document.querySelector("#next-day");
const openCalendarButton = document.querySelector("#open-calendar");
const calendarDialog = document.querySelector("#calendar-dialog");
const monthLabel = document.querySelector("#month-label");
const calendarGrid = document.querySelector("#calendar-grid");
const previousMonthButton = document.querySelector("#previous-month");
const nextMonthButton = document.querySelector("#next-month");
const goTodayButton = document.querySelector("#go-today");
const closeCalendarButton = document.querySelector("#close-calendar");

const HIVE_SVG = `
  <svg viewBox="0 0 100 100" class="hive-icon" aria-hidden="true" focusable="false">
    <rect class="hive-roof" x="5" y="9" width="90" height="14" rx="5"></rect>
    <rect class="hive-box" x="12" y="25" width="76" height="24" rx="4"></rect>
    <rect class="hive-box" x="12" y="51" width="76" height="24" rx="4"></rect>
    <rect class="hive-box" x="12" y="77" width="76" height="14" rx="4"></rect>
    <rect class="hive-entrance" x="40" y="82" width="20" height="4" rx="2"></rect>
    <circle class="hive-badge" cx="50" cy="55" r="23"></circle>
    <text class="hive-digit" x="50" y="56" text-anchor="middle" dominant-baseline="central"></text>
  </svg>
`;

const today = new Date();
let selectedDate = toDateKey(today);
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let dayNotes = {};
let datesWithNotes = new Set();
const hiveCards = [];
const pendingSaves = new Map();
const savedHintTimers = new Map();

function readStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // spazio non disponibile: la nota resta comunque sul server
  }
}

function readCachedDay(dateKey) {
  return readStore(CACHE_KEY, {})[dateKey] || {};
}

function cacheDay(dateKey, notes) {
  const cache = readStore(CACHE_KEY, {});
  cache[dateKey] = notes;
  writeStore(CACHE_KEY, cache);
}

function captureToken() {
  const token = new URLSearchParams(location.search).get("token");

  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    history.replaceState(null, "", location.pathname);
  }
}

async function api(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(token ? { "x-app-token": token } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Richiesta fallita (${response.status})`);
  }

  return response.json();
}

function showStatus(message, tone = "info") {
  syncStatus.textContent = message;
  syncStatus.dataset.tone = tone;
  syncStatus.hidden = !message;
}

function getQueue() {
  return readStore(QUEUE_KEY, []);
}

function queueSave(hive, dateKey, body) {
  const queue = getQueue().filter((item) => !(item.hive === hive && item.date === dateKey));
  queue.push({ hive, date: dateKey, body });
  writeStore(QUEUE_KEY, queue);
  showStatus("Nessuna rete: modifiche in attesa di invio", "warning");
}

async function flushQueue() {
  const queue = getQueue();

  if (queue.length === 0) {
    return;
  }

  const failed = [];

  for (const item of queue) {
    try {
      await api("/api/notes", { method: "PUT", body: JSON.stringify(item) });
    } catch {
      failed.push(item);
    }
  }

  writeStore(QUEUE_KEY, failed);

  if (failed.length === 0) {
    showStatus("");
  }
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function formatDate(dateKey, options) {
  return new Intl.DateTimeFormat("it-IT", options).format(fromDateKey(dateKey));
}

function toMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function showSavedHint(hiveNumber) {
  const { hint } = hiveCards[hiveNumber - 1];
  hint.classList.add("visible");

  clearTimeout(savedHintTimers.get(hiveNumber));
  savedHintTimers.set(
    hiveNumber,
    setTimeout(() => hint.classList.remove("visible"), SAVED_HINT_DURATION),
  );
}

async function saveNote(hiveNumber, dateKey, text) {
  const body = text.trim();

  if (body) {
    dayNotes[hiveNumber] = body;
  } else {
    delete dayNotes[hiveNumber];
  }

  if (dateKey === selectedDate) {
    cacheDay(dateKey, dayNotes);
    updateHiveState(hiveNumber);
  }

  try {
    await api("/api/notes", {
      method: "PUT",
      body: JSON.stringify({ hive: hiveNumber, date: dateKey, body }),
    });

    if (dateKey === selectedDate) {
      showSavedHint(hiveNumber);
    }

    await flushQueue();
  } catch {
    queueSave(hiveNumber, dateKey, body);
  }
}

function scheduleSave(hiveNumber, textarea) {
  const dateKey = selectedDate;
  const pending = pendingSaves.get(hiveNumber);

  if (pending) {
    clearTimeout(pending.timer);
  }

  const flush = () => {
    pendingSaves.delete(hiveNumber);
    saveNote(hiveNumber, dateKey, textarea.value);
  };

  pendingSaves.set(hiveNumber, { timer: setTimeout(flush, SAVE_DELAY), flush });
}

function flushPendingSaves() {
  [...pendingSaves.values()].forEach(({ timer, flush }) => {
    clearTimeout(timer);
    flush();
  });
}

function createHiveCard(hiveNumber) {
  const card = document.createElement("article");
  const head = document.createElement("div");
  const hint = document.createElement("span");
  const textarea = document.createElement("textarea");

  card.className = "hive-card";
  head.className = "hive-head";
  head.innerHTML = HIVE_SVG;
  head.querySelector(".hive-digit").textContent = String(hiveNumber);

  hint.className = "saved-hint";
  hint.textContent = "Salvato";

  textarea.className = "hive-note";
  textarea.placeholder = "Cosa hai fatto oggi?";
  textarea.setAttribute("aria-label", `Note del giorno per l'arnia ${hiveNumber}`);
  textarea.addEventListener("input", () => scheduleSave(hiveNumber, textarea));
  textarea.addEventListener("blur", flushPendingSaves);

  card.append(textarea, head, hint);
  hivesGrid.append(card);

  return { card, textarea, hint };
}

function renderHiveCards() {
  for (let hiveNumber = 1; hiveNumber <= HIVE_COUNT; hiveNumber += 1) {
    hiveCards.push(createHiveCard(hiveNumber));
  }
}

function updateHiveState(hiveNumber) {
  const { card } = hiveCards[hiveNumber - 1];
  card.classList.toggle("filled", Boolean(dayNotes[hiveNumber]));
}

function refreshHiveNotes() {
  hiveCards.forEach(({ textarea, hint }, index) => {
    const hiveNumber = index + 1;

    if (document.activeElement !== textarea) {
      textarea.value = dayNotes[hiveNumber] || "";
    }

    hint.classList.remove("visible");
    updateHiveState(hiveNumber);
  });
}

function updateDateBar() {
  dateMain.textContent = formatDate(selectedDate, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  todayBadge.hidden = selectedDate !== toDateKey(today);
}

async function loadDay(dateKey) {
  dayNotes = readCachedDay(dateKey);
  refreshHiveNotes();

  try {
    const { notes } = await api(`/api/notes?date=${dateKey}`);

    if (dateKey !== selectedDate) {
      return;
    }

    dayNotes = notes;
    cacheDay(dateKey, notes);
    refreshHiveNotes();

    if (getQueue().length === 0) {
      showStatus("");
    }
  } catch {
    showStatus("Non connesso: mostro l'ultima copia salvata sul telefono", "warning");
  }
}

function setSelectedDate(dateKey) {
  flushPendingSaves();
  selectedDate = dateKey;
  updateDateBar();
  loadDay(dateKey);
}

function shiftDay(offset) {
  const date = fromDateKey(selectedDate);
  date.setDate(date.getDate() + offset);
  setSelectedDate(toDateKey(date));
}

function getMonthDays(monthStart) {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = new Array((new Date(year, month, 1).getDay() + 6) % 7).fill(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  monthLabel.textContent = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  getMonthDays(visibleMonth).forEach((date) => {
    if (!date) {
      calendarGrid.append(document.createElement("span"));
      return;
    }

    const dateKey = toDateKey(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day";
    button.textContent = String(date.getDate());
    button.setAttribute("aria-label", formatDate(dateKey, { dateStyle: "full" }));
    button.classList.toggle("today", dateKey === toDateKey(today));
    button.classList.toggle("selected", dateKey === selectedDate);
    button.classList.toggle("has-note", datesWithNotes.has(dateKey));
    button.addEventListener("click", () => {
      setSelectedDate(dateKey);
      calendarDialog.close();
    });

    calendarGrid.append(button);
  });
}

async function loadMonthDots() {
  try {
    const { dates } = await api(`/api/notes?month=${toMonthKey(visibleMonth)}`);
    datesWithNotes = new Set(dates);
    renderCalendar();
  } catch {
    // senza rete il calendario resta usabile, solo senza pallini
  }
}

function openCalendar() {
  const current = fromDateKey(selectedDate);
  visibleMonth = new Date(current.getFullYear(), current.getMonth(), 1);
  datesWithNotes = new Set();
  renderCalendar();
  calendarDialog.showModal();
  loadMonthDots();
}

function changeMonth(offset) {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
  datesWithNotes = new Set();
  renderCalendar();
  loadMonthDots();
}

previousDayButton.addEventListener("click", () => shiftDay(-1));
nextDayButton.addEventListener("click", () => shiftDay(1));
openCalendarButton.addEventListener("click", openCalendar);
previousMonthButton.addEventListener("click", () => changeMonth(-1));
nextMonthButton.addEventListener("click", () => changeMonth(1));
closeCalendarButton.addEventListener("click", () => calendarDialog.close());
goTodayButton.addEventListener("click", () => {
  setSelectedDate(toDateKey(today));
  calendarDialog.close();
});
calendarDialog.addEventListener("click", (event) => {
  if (event.target === calendarDialog) {
    calendarDialog.close();
  }
});
window.addEventListener("online", () => {
  flushQueue().then(() => loadDay(selectedDate));
});
window.addEventListener("beforeunload", flushPendingSaves);

captureToken();
renderHiveCards();
updateDateBar();
flushQueue().finally(() => loadDay(selectedDate));
