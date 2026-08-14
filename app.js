const HIVE_COUNT = 10;
const STORAGE_KEY = "diario-arnie-notes-v1";
const SAVE_DELAY = 400;

const hivesGrid = document.querySelector("#hives-grid");
const plannerTitle = document.querySelector("#planner-title");
const monthLabel = document.querySelector("#month-label");
const calendarGrid = document.querySelector("#calendar-grid");
const previousMonthButton = document.querySelector("#previous-month");
const nextMonthButton = document.querySelector("#next-month");
const noteLabel = document.querySelector("#note-label");
const noteText = document.querySelector("#note-text");
const saveStatus = document.querySelector("#save-status");

const HIVE_SVG = `
  <svg viewBox="0 0 100 100" class="hive-icon" aria-hidden="true" focusable="false">
    <rect class="hive-roof" x="6" y="10" width="88" height="13" rx="5"></rect>
    <rect class="hive-box" x="13" y="25" width="74" height="21" rx="4"></rect>
    <rect class="hive-box" x="13" y="48" width="74" height="21" rx="4"></rect>
    <rect class="hive-box" x="13" y="71" width="74" height="17" rx="4"></rect>
    <rect class="hive-entrance" x="40" y="80" width="20" height="4" rx="2"></rect>
    <rect class="hive-stand" x="18" y="90" width="64" height="5" rx="2"></rect>
    <circle class="hive-badge" cx="50" cy="52" r="19"></circle>
    <text class="hive-digit" x="50" y="53" text-anchor="middle" dominant-baseline="central"></text>
  </svg>
`;

const today = new Date();
let selectedHive = 1;
let selectedDate = toDateKey(today);
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let notes = loadNotes();
let saveTimer = 0;

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

function formatDate(dateKey, options = {}) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "full", ...options }).format(
    fromDateKey(dateKey),
  );
}

function getNote(hiveNumber, dateKey) {
  return (notes[hiveNumber] || {})[dateKey] || "";
}

function saveNote(text) {
  const trimmedText = text.trim();
  const hiveNotes = notes[selectedHive] || {};

  if (trimmedText) {
    hiveNotes[selectedDate] = trimmedText;
    notes[selectedHive] = hiveNotes;
  } else {
    delete hiveNotes[selectedDate];

    if (Object.keys(hiveNotes).length === 0) {
      delete notes[selectedHive];
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  saveStatus.textContent = trimmedText ? "Salvato" : "";
  markDaysWithNotes();
  markHivesWithNotes();
}

function hasNotes(hiveNumber) {
  return Object.keys(notes[hiveNumber] || {}).length > 0;
}

function renderHives() {
  hivesGrid.innerHTML = "";

  for (let hiveNumber = 1; hiveNumber <= HIVE_COUNT; hiveNumber += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hive";
    button.innerHTML = HIVE_SVG;
    button.querySelector(".hive-digit").textContent = String(hiveNumber);
    button.setAttribute("aria-label", `Arnia ${hiveNumber}`);
    button.addEventListener("click", () => selectHive(hiveNumber));
    hivesGrid.append(button);
  }

  updateSelectedHive();
  markHivesWithNotes();
}

function markHivesWithNotes() {
  [...hivesGrid.children].forEach((button, index) => {
    button.classList.toggle("has-notes", hasNotes(index + 1));
  });
}

function updateSelectedHive() {
  [...hivesGrid.children].forEach((button, index) => {
    const isSelected = index + 1 === selectedHive;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  plannerTitle.textContent = `Arnia ${selectedHive}`;
}

function getMonthDays(monthStart) {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Array(leadingBlanks).fill(null);

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
      const blank = document.createElement("span");
      blank.className = "day blank";
      calendarGrid.append(blank);
      return;
    }

    const dateKey = toDateKey(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day";
    button.dataset.date = dateKey;
    button.textContent = String(date.getDate());
    button.setAttribute("aria-label", formatDate(dateKey));

    if (dateKey === toDateKey(today)) {
      button.classList.add("today");
    }

    button.addEventListener("click", () => selectDate(dateKey));
    calendarGrid.append(button);
  });

  markDaysWithNotes();
}

function markDaysWithNotes() {
  calendarGrid.querySelectorAll(".day[data-date]").forEach((button) => {
    button.classList.toggle("has-note", Boolean(getNote(selectedHive, button.dataset.date)));
    button.classList.toggle("selected", button.dataset.date === selectedDate);
  });
}

function renderNote() {
  noteLabel.textContent = formatDate(selectedDate);
  noteText.value = getNote(selectedHive, selectedDate);
  saveStatus.textContent = "";
}

function selectHive(hiveNumber) {
  flushPendingSave();
  selectedHive = hiveNumber;
  updateSelectedHive();
  markDaysWithNotes();
  renderNote();
}

function selectDate(dateKey) {
  flushPendingSave();
  selectedDate = dateKey;
  markDaysWithNotes();
  renderNote();
  noteText.focus();
}

function changeMonth(offset) {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
  renderCalendar();
}

function flushPendingSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = 0;
    saveNote(noteText.value);
  }
}

noteText.addEventListener("input", () => {
  saveStatus.textContent = "Salvataggio...";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = 0;
    saveNote(noteText.value);
  }, SAVE_DELAY);
});

noteText.addEventListener("blur", flushPendingSave);
window.addEventListener("beforeunload", flushPendingSave);
previousMonthButton.addEventListener("click", () => changeMonth(-1));
nextMonthButton.addEventListener("click", () => changeMonth(1));

renderHives();
renderCalendar();
renderNote();
