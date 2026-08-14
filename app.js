const HIVE_COUNT = 10;
const STORAGE_KEY = "diario-arnie-notes-v1";

const hivesGrid = document.querySelector("#hives-grid");
const selectedHiveLabel = document.querySelector("#selected-hive-label");
const selectedDateLabel = document.querySelector("#selected-date-label");
const monthLabel = document.querySelector("#month-label");
const calendarGrid = document.querySelector("#calendar-grid");
const previousMonthButton = document.querySelector("#previous-month");
const nextMonthButton = document.querySelector("#next-month");
const noteForm = document.querySelector("#note-form");
const noteText = document.querySelector("#note-text");
const deleteNoteButton = document.querySelector("#delete-note");
const saveStatus = document.querySelector("#save-status");

const today = new Date();
let selectedHive = 1;
let selectedDate = toDateKey(today);
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let notes = loadNotes();

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function persistNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
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
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "full",
    ...options,
  }).format(fromDateKey(dateKey));
}

function getHiveNotes(hiveNumber = selectedHive) {
  return notes[hiveNumber] || {};
}

function getNote(hiveNumber, dateKey) {
  return getHiveNotes(hiveNumber)[dateKey] || "";
}

function setNote(hiveNumber, dateKey, text) {
  if (!notes[hiveNumber]) {
    notes[hiveNumber] = {};
  }

  const trimmedText = text.trim();

  if (trimmedText) {
    notes[hiveNumber][dateKey] = trimmedText;
  } else {
    delete notes[hiveNumber][dateKey];
  }

  if (Object.keys(notes[hiveNumber]).length === 0) {
    delete notes[hiveNumber];
  }

  persistNotes();
}

function getLastActivityLabel(hiveNumber) {
  const hiveNotes = getHiveNotes(hiveNumber);
  const latestDate = Object.keys(hiveNotes).sort().at(-1);

  if (!latestDate) {
    return "Nessuna nota registrata";
  }

  const excerpt = hiveNotes[latestDate].slice(0, 54);
  const suffix = hiveNotes[latestDate].length > 54 ? "..." : "";

  return `${formatDate(latestDate, { dateStyle: "medium" })}: ${excerpt}${suffix}`;
}

function renderHives() {
  hivesGrid.innerHTML = "";

  for (let hiveNumber = 1; hiveNumber <= HIVE_COUNT; hiveNumber += 1) {
    const button = document.createElement("button");
    const number = document.createElement("span");
    const meta = document.createElement("span");

    button.type = "button";
    button.className = `hive-card${hiveNumber === selectedHive ? " active" : ""}`;
    button.setAttribute("aria-pressed", String(hiveNumber === selectedHive));

    number.className = "hive-number";
    number.textContent = `Arnia ${hiveNumber}`;
    meta.className = "hive-meta";
    meta.textContent = getLastActivityLabel(hiveNumber);

    button.append(number, meta);
    button.addEventListener("click", () => {
      selectedHive = hiveNumber;
      saveStatus.textContent = "";
      renderApp();
    });
    hivesGrid.append(button);
  }
}

function getMonthDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayBasedOffset = (firstDay.getDay() + 6) % 7;
  const days = [];

  for (let index = 0; index < mondayBasedOffset; index += 1) {
    days.push(null);
  }

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
    const button = document.createElement("button");
    button.type = "button";

    if (!date) {
      button.className = "calendar-day empty";
      button.tabIndex = -1;
      calendarGrid.append(button);
      return;
    }

    const dateKey = toDateKey(date);
    const classNames = ["calendar-day"];

    if (dateKey === selectedDate) {
      classNames.push("selected");
    }

    if (dateKey === toDateKey(today)) {
      classNames.push("today");
    }

    if (getNote(selectedHive, dateKey)) {
      classNames.push("has-note");
    }

    button.className = classNames.join(" ");
    button.textContent = String(date.getDate());
    button.setAttribute("aria-label", formatDate(dateKey));
    button.addEventListener("click", () => {
      selectedDate = dateKey;
      saveStatus.textContent = "";
      renderApp();
    });

    calendarGrid.append(button);
  });
}

function renderNotePanel() {
  selectedHiveLabel.textContent = `Arnia ${selectedHive}`;
  selectedDateLabel.textContent = formatDate(selectedDate);
  noteText.value = getNote(selectedHive, selectedDate);
  deleteNoteButton.disabled = noteText.value.length === 0;
}

function renderApp() {
  renderHives();
  renderCalendar();
  renderNotePanel();
}

previousMonthButton.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  saveStatus.textContent = "";
  renderCalendar();
});

nextMonthButton.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  saveStatus.textContent = "";
  renderCalendar();
});

noteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setNote(selectedHive, selectedDate, noteText.value);
  saveStatus.textContent = "Nota salvata.";
  renderApp();
});

deleteNoteButton.addEventListener("click", () => {
  setNote(selectedHive, selectedDate, "");
  saveStatus.textContent = "Nota eliminata.";
  renderApp();
});

renderApp();
