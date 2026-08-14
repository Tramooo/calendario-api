const HIVE_COUNT = 10;
const STORAGE_KEY = "diario-arnie-notes-v1";
const SAVE_DELAY = 400;
const SAVED_HINT_DURATION = 1500;

const hivesGrid = document.querySelector("#hives-grid");
const dateMain = document.querySelector("#date-main");
const todayBadge = document.querySelector("#today-badge");
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
let notes = loadNotes();
const hiveCards = [];
const pendingSaves = new Map();
const savedHintTimers = new Map();

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
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

function getNote(hiveNumber, dateKey) {
  return (notes[hiveNumber] || {})[dateKey] || "";
}

function hasAnyNote(dateKey) {
  return Object.values(notes).some((hiveNotes) => Boolean(hiveNotes[dateKey]));
}

function saveNote(hiveNumber, dateKey, text) {
  const trimmedText = text.trim();
  const hiveNotes = notes[hiveNumber] || {};

  if (trimmedText) {
    hiveNotes[dateKey] = trimmedText;
    notes[hiveNumber] = hiveNotes;
  } else {
    delete hiveNotes[dateKey];

    if (Object.keys(hiveNotes).length === 0) {
      delete notes[hiveNumber];
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));

  if (dateKey === selectedDate) {
    showSavedHint(hiveNumber);
    updateHiveState(hiveNumber);
  }
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

  head.append(hint);
  card.append(head, textarea);
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
  card.classList.toggle("filled", Boolean(getNote(hiveNumber, selectedDate)));
}

function refreshHiveNotes() {
  hiveCards.forEach(({ textarea, hint }, index) => {
    textarea.value = getNote(index + 1, selectedDate);
    hint.classList.remove("visible");
    updateHiveState(index + 1);
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

function setSelectedDate(dateKey) {
  flushPendingSaves();
  selectedDate = dateKey;
  updateDateBar();
  refreshHiveNotes();
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
    button.classList.toggle("has-note", hasAnyNote(dateKey));
    button.addEventListener("click", () => {
      setSelectedDate(dateKey);
      calendarDialog.close();
    });

    calendarGrid.append(button);
  });
}

function openCalendar() {
  const current = fromDateKey(selectedDate);
  visibleMonth = new Date(current.getFullYear(), current.getMonth(), 1);
  renderCalendar();
  calendarDialog.showModal();
}

function changeMonth(offset) {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
  renderCalendar();
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
window.addEventListener("beforeunload", flushPendingSaves);

renderHiveCards();
updateDateBar();
refreshHiveNotes();
