const STORAGE_KEY = "dodam-package-manager-v1";
const DB_NAME = "dodam-package-manager-db";
const DB_STORE = "settings";
const DB_HANDLE_KEY = "autoSaveFileHandle";
const SERVER_SAVE_URL = "./api/save";
const SERVER_LOAD_URL = "./api/load";
const today = new Date();

const state = normalizeState(loadState());
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let saveFileHandle = null;
let autoSaveTimer = null;
let autoSaveStatusTimer = null;
let serverSaveAvailable = false;
let serverSaveTimer = null;

const $ = (selector) => document.querySelector(selector);
const emptyTemplate = $("#emptyTemplate");

const els = {
  studentForm: $("#studentForm"),
  packageForm: $("#packageForm"),
  lessonForm: $("#lessonForm"),
  attendanceForm: $("#attendanceForm"),
  studentName: $("#studentName"),
  studentPhone: $("#studentPhone"),
  packageStudent: $("#packageStudent"),
  lessonStudent: $("#lessonStudent"),
  attendanceStudent: $("#attendanceStudent"),
  attendanceProgram: $("#attendanceProgram"),
  attendanceDate: $("#attendanceDate"),
  attendanceStatus: $("#attendanceStatus"),
  attendanceMemo: $("#attendanceMemo"),
  messageStudent: $("#messageStudent"),
  messageUsageList: $("#messageUsageList"),
  messageText: $("#messageText"),
  copyMessageBtn: $("#copyMessageBtn"),
  copyMessageStatus: $("#copyMessageStatus"),
  studentList: $("#studentList"),
  purchaseDate: $("#purchaseDate"),
  lessonDate: $("#lessonDate"),
  lessonTime: $("#lessonTime"),
  lessonKind: $("#lessonKind"),
  lessonMemo: $("#lessonMemo"),
  calendar: $("#calendar"),
  mobileScheduleList: $("#mobileScheduleList"),
  calendarToggle: $("#calendarToggle"),
  monthTitle: $("#monthTitle"),
  packageStatus: $("#packageStatus"),
  lessonList: $("#lessonList"),
  attendanceList: $("#attendanceList"),
  studentCount: $("#studentCount"),
  monthLessonCount: $("#monthLessonCount"),
  packageLessonCount: $("#packageLessonCount"),
  onedayLessonCount: $("#onedayLessonCount"),
  prevMonth: $("#prevMonth"),
  nextMonth: $("#nextMonth"),
  todayBtn: $("#todayBtn"),
  exportBtn: $("#exportBtn"),
  connectSaveFileBtn: $("#connectSaveFileBtn"),
  autoSaveStatus: $("#autoSaveStatus"),
  importFile: $("#importFile"),
  resetBtn: $("#resetBtn"),
};

initDefaults();
bindEvents();
render();
initStorage();

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return { students: [], packages: [], lessons: [], attendance: [] };
}

function normalizeState(data) {
  return {
    students: Array.isArray(data?.students) ? data.students : [],
    packages: Array.isArray(data?.packages) ? data.packages : [],
    lessons: Array.isArray(data?.lessons) ? data.lessons : [],
    attendance: Array.isArray(data?.attendance) ? data.attendance : [],
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueServerSave();
  queueAutoSave();
}

async function initStorage() {
  await initServerState();
  if (!serverSaveAvailable) {
    await initAutoSaveFile();
  }
}

async function initServerState() {
  try {
    const response = await fetch(SERVER_LOAD_URL, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    serverSaveAvailable = true;
    const normalized = normalizeState(data);
    if (Array.isArray(normalized.students) && Array.isArray(normalized.packages) && Array.isArray(normalized.lessons)) {
      state.students = normalized.students;
      state.packages = normalized.packages;
      state.lessons = normalized.lessons;
      state.attendance = normalized.attendance;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      render();
    }
    els.connectSaveFileBtn.textContent = "자동저장 사용 중";
    els.connectSaveFileBtn.disabled = true;
    setAutoSaveStatus("컴퓨터 파일에 자동 저장 중");
  } catch {
    serverSaveAvailable = false;
  }
}

function queueServerSave() {
  if (!serverSaveAvailable) return;
  window.clearTimeout(serverSaveTimer);
  serverSaveTimer = window.setTimeout(() => {
    writeServerSave();
  }, 250);
}

async function writeServerSave() {
  if (!serverSaveAvailable) return;
  try {
    const response = await fetch(SERVER_SAVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    if (!response.ok) throw new Error("Save failed");
    setAutoSaveStatus(`컴퓨터 파일에 자동 저장됨 · ${formatClock(new Date())}`);
  } catch {
    serverSaveAvailable = false;
    setAutoSaveStatus("브라우저에 자동 저장 중 · 파일 저장 서버 확인 필요");
  }
}

function initDefaults() {
  const isoToday = toISODate(today);
  els.purchaseDate.value = isoToday;
  els.lessonDate.value = isoToday;
  els.attendanceDate.value = isoToday;
}

function bindEvents() {
  els.studentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.students.push({
      id: makeId(),
      name: els.studentName.value.trim(),
      phone: els.studentPhone.value.trim(),
    });
    els.studentForm.reset();
    saveState();
    render();
  });

  els.attendanceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.attendance.push({
      id: makeId(),
      studentId: els.attendanceStudent.value,
      program: els.attendanceProgram.value,
      date: els.attendanceDate.value,
      status: els.attendanceStatus.value,
      memo: els.attendanceMemo.value.trim(),
      makeupDone: false,
      createdAt: Date.now(),
    });
    els.attendanceMemo.value = "";
    saveState();
    render();
  });

  els.packageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const type = Number(new FormData(els.packageForm).get("packageType"));
    state.packages.push({
      id: makeId(),
      studentId: els.packageStudent.value,
      type,
      total: type,
      purchaseDate: els.purchaseDate.value,
      createdAt: Date.now(),
    });
    els.purchaseDate.value = toISODate(today);
    saveState();
    render();
  });

  els.lessonForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.lessons.push({
      id: makeId(),
      studentId: els.lessonStudent.value,
      date: els.lessonDate.value,
      time: els.lessonTime.value,
      kind: els.lessonKind.value,
      memo: els.lessonMemo.value.trim(),
      createdAt: Date.now(),
    });
    visibleMonth = monthFromISO(els.lessonDate.value);
    els.lessonMemo.value = "";
    saveState();
    render();
  });

  els.prevMonth.addEventListener("click", () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
    render();
  });

  els.nextMonth.addEventListener("click", () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    render();
  });

  els.todayBtn.addEventListener("click", () => {
    visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    els.lessonDate.value = toISODate(today);
    render();
  });
  els.calendarToggle.addEventListener("click", () => {
    els.calendar.classList.toggle("is-open");
    els.calendarToggle.textContent = els.calendar.classList.contains("is-open") ? "월 달력 닫기" : "월 달력 보기";
  });

  els.exportBtn.addEventListener("click", exportData);
  els.connectSaveFileBtn.addEventListener("click", connectAutoSaveFile);
  els.importFile.addEventListener("change", importData);
  els.messageStudent.addEventListener("change", () => {
    renderMessage(computePackages());
  });
  els.copyMessageBtn.addEventListener("click", copyMessage);

  els.resetBtn.addEventListener("click", () => {
    if (!confirm("저장된 학생, 패키지, 예약을 모두 삭제할까요?")) return;
    state.students = [];
    state.packages = [];
    state.lessons = [];
    state.attendance = [];
    saveState();
    render();
  });
}

async function initAutoSaveFile() {
  if (!supportsFileSaving()) {
    if (!serverSaveAvailable) setAutoSaveStatus("브라우저에 자동 저장 중 · 파일 저장 서버 확인 필요");
    els.connectSaveFileBtn.disabled = true;
    return;
  }

  saveFileHandle = await loadStoredFileHandle();
  if (!saveFileHandle) {
    setAutoSaveStatus("브라우저에 자동 저장 중 · 파일 저장은 연결 필요");
    return;
  }

  const permission = await verifyFilePermission(saveFileHandle, false);
  if (permission) {
    setAutoSaveStatus("컴퓨터 파일에 자동 저장 준비됨");
  } else {
    setAutoSaveStatus("자동저장 파일 권한 확인 필요");
  }
}

async function connectAutoSaveFile() {
  if (!supportsFileSaving()) {
    alert("이 브라우저에서는 파일 자동저장을 지원하지 않습니다. Chrome 또는 Edge에서 사용해 주세요.");
    return;
  }

  try {
    saveFileHandle = await window.showSaveFilePicker({
      suggestedName: `dodam-packages-${toISODate(today)}.json`,
      types: [
        {
          description: "도담 패키지 데이터",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    await storeFileHandle(saveFileHandle);
    await writeAutoSaveFile();
    setAutoSaveStatus("컴퓨터 파일에 자동 저장 중");
  } catch (error) {
    if (error.name !== "AbortError") {
      setAutoSaveStatus("자동저장 파일 연결 실패");
    }
  }
}

function queueAutoSave() {
  if (!saveFileHandle) return;
  window.clearTimeout(autoSaveTimer);
  autoSaveTimer = window.setTimeout(() => {
    writeAutoSaveFile();
  }, 300);
}

async function writeAutoSaveFile() {
  if (!saveFileHandle) return;

  const allowed = await verifyFilePermission(saveFileHandle, true);
  if (!allowed) {
    setAutoSaveStatus("자동저장 권한 필요 · 파일 다시 연결");
    return;
  }

  try {
    const writable = await saveFileHandle.createWritable();
    await writable.write(JSON.stringify(state, null, 2));
    await writable.close();
    setAutoSaveStatus(`컴퓨터 파일에 자동 저장됨 · ${formatClock(new Date())}`);
  } catch {
    setAutoSaveStatus("자동저장 실패 · 파일 다시 연결");
  }
}

function supportsFileSaving() {
  return "showSaveFilePicker" in window && "indexedDB" in window;
}

async function verifyFilePermission(handle, request) {
  const options = { mode: "readwrite" };
  if ((await handle.queryPermission(options)) === "granted") return true;
  if (request && (await handle.requestPermission(options)) === "granted") return true;
  return false;
}

function setAutoSaveStatus(message) {
  els.autoSaveStatus.textContent = message;
  window.clearTimeout(autoSaveStatusTimer);
  if (message.includes("자동 저장됨")) {
    autoSaveStatusTimer = window.setTimeout(() => {
      if (saveFileHandle) els.autoSaveStatus.textContent = "컴퓨터 파일에 자동 저장 중";
    }, 2500);
  }
}

function render() {
  const computed = computePackages();
  renderSelects();
  renderStudentList();
  renderSummary(computed);
  renderMobileScheduleList(computed);
  renderCalendar(computed);
  renderPackageStatus(computed);
  renderMessage(computed);
  renderLessonList(computed);
  renderAttendanceList();
}

function renderSelects() {
  const selectedPackageStudent = els.packageStudent.value;
  const selectedLessonStudent = els.lessonStudent.value;
  const selectedMessageStudent = els.messageStudent.value;
  const selectedAttendanceStudent = els.attendanceStudent.value;
  const options = state.students
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .map((student) => `<option value="${student.id}">${escapeHTML(student.name)}</option>`)
    .join("");

  const empty = '<option value="" disabled selected>학생을 먼저 등록하세요</option>';
  els.packageStudent.innerHTML = options || empty;
  els.lessonStudent.innerHTML = options || empty;
  els.attendanceStudent.innerHTML = options || empty;
  els.messageStudent.innerHTML = options || empty;
  restoreSelectValue(els.packageStudent, selectedPackageStudent);
  restoreSelectValue(els.lessonStudent, selectedLessonStudent);
  restoreSelectValue(els.attendanceStudent, selectedAttendanceStudent);
  restoreSelectValue(els.messageStudent, selectedMessageStudent);
  els.packageStudent.disabled = state.students.length === 0;
  els.lessonStudent.disabled = state.students.length === 0;
  els.attendanceStudent.disabled = state.students.length === 0;
  els.messageStudent.disabled = state.students.length === 0;
  els.packageForm.querySelector("button").disabled = state.students.length === 0;
  els.lessonForm.querySelector("button").disabled = state.students.length === 0;
  els.attendanceForm.querySelector("button").disabled = state.students.length === 0;
  els.copyMessageBtn.disabled = state.students.length === 0;
}

function renderStudentList() {
  els.studentList.innerHTML = "";
  if (state.students.length === 0) {
    els.studentList.appendChild(emptyTemplate.content.cloneNode(true));
    return;
  }

  state.students
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .forEach((student) => {
      const row = document.createElement("article");
      row.className = "student-row";
      row.innerHTML = `
        <div class="package-head">
          <b>${escapeHTML(student.name)}</b>
          <button class="delete-btn" type="button" data-delete-student="${student.id}">삭제</button>
        </div>
        ${student.phone ? `<div class="meta">${escapeHTML(student.phone)}</div>` : ""}
      `;
      els.studentList.appendChild(row);
    });

  els.studentList.querySelectorAll("[data-delete-student]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.deleteStudent;
      deleteById(state.students, id);
      state.packages = state.packages.filter((pkg) => pkg.studentId !== id);
      state.lessons = state.lessons.filter((lesson) => lesson.studentId !== id);
      state.attendance = state.attendance.filter((record) => record.studentId !== id);
      saveState();
      render();
    });
  });
}

function renderSummary(computed) {
  const monthLessons = getMonthLessons();
  els.studentCount.textContent = `${state.students.length}명`;
  els.monthLessonCount.textContent = `${monthLessons.length}회`;
  els.packageLessonCount.textContent = `${monthLessons.filter((lesson) => lesson.kind === "package").length}회`;
  els.onedayLessonCount.textContent = `${monthLessons.filter((lesson) => lesson.kind === "oneday").length}회`;
}

function renderMobileScheduleList(computed) {
  els.mobileScheduleList.innerHTML = "";
  const lessons = getMonthLessons().sort(sortLessons);
  if (lessons.length === 0) {
    els.mobileScheduleList.appendChild(emptyTemplate.content.cloneNode(true));
    return;
  }

  lessons.forEach((lesson) => {
    const student = findStudent(lesson.studentId);
    const allocation = computed.lessonAllocation.get(lesson.id);
    const row = document.createElement("article");
    row.className = "mobile-schedule-row";
    const kindText = lesson.kind === "oneday" ? "원데이" : allocation ? "패키지" : "패키지 없음";
    row.innerHTML = `
      <div class="mobile-date">
        <b>${formatMonthDay(lesson.date)}</b>
        <span>${getWeekdayName(lesson.date)}</span>
      </div>
      <div class="mobile-schedule-body">
        <div class="lesson-head">
          <b>${escapeHTML(student?.name || "삭제된 학생")}</b>
          <span class="badge ${lesson.kind === "oneday" ? "warning" : allocation ? "" : "danger"}">${kindText}</span>
        </div>
        <div class="meta">${lesson.time || "시간 미정"}${lesson.memo ? ` · ${escapeHTML(lesson.memo)}` : ""}</div>
      </div>
    `;
    els.mobileScheduleList.appendChild(row);
  });
}

function renderCalendar(computed) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  els.monthTitle.textContent = `${year}년 ${month + 1}월`;
  els.calendar.innerHTML = "";

  ["일", "월", "화", "수", "목", "금", "토"].forEach((day) => {
    const weekday = document.createElement("div");
    weekday.className = "weekday";
    weekday.textContent = day;
    els.calendar.appendChild(weekday);
  });

  const start = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - start.getDay());
  const lessonsByDate = groupLessonsByDate(computed);

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const iso = toISODate(date);
    const cell = document.createElement("div");
    cell.className = "day-cell";
    if (date.getMonth() !== month) cell.classList.add("outside");
    if (iso === toISODate(today)) cell.classList.add("today");

    const number = document.createElement("div");
    number.className = "day-number";
    number.innerHTML = `<strong>${date.getDate()}</strong>`;
    cell.appendChild(number);

    (lessonsByDate.get(iso) || []).forEach((lesson) => {
      cell.appendChild(renderLessonChip(lesson, computed));
    });

    els.calendar.appendChild(cell);
  }
}

function renderLessonChip(lesson, computed) {
  const chip = document.createElement("div");
  const allocation = computed.lessonAllocation.get(lesson.id);
  chip.className = `lesson-chip ${lesson.kind}`;
  if (lesson.kind === "package" && !allocation) chip.classList.add("invalid");
  const student = findStudent(lesson.studentId);
  const kindText = lesson.kind === "oneday" ? "원데이" : allocation ? "패키지" : "패키지 없음";
  chip.innerHTML = `
    <b>${escapeHTML(student?.name || "삭제된 학생")}</b>
    <span>${lesson.time || "시간 미정"} · ${kindText}</span>
  `;
  return chip;
}

function renderPackageStatus(computed) {
  els.packageStatus.innerHTML = "";
  if (state.packages.length === 0) {
    els.packageStatus.appendChild(emptyTemplate.content.cloneNode(true));
    return;
  }

  const header = document.createElement("div");
  header.className = "package-row header";
  header.innerHTML = `
    <span>이름</span>
    <span>패키지</span>
    <span>잔여</span>
    <span>사용기한</span>
    <span>관리</span>
  `;
  els.packageStatus.appendChild(header);

  computed.packages.forEach((pkg) => {
    const student = findStudent(pkg.studentId);
    const remaining = pkg.total - pkg.used;
    const status = getPackageStatus(pkg, remaining);
    const row = document.createElement("article");
    row.className = `package-row ${status.className}`;
    row.innerHTML = `
      <b>${escapeHTML(student?.name || "삭제된 학생")}</b>
      <span>${pkg.total}회권</span>
      <span>${Math.max(0, remaining)} / ${pkg.total}회</span>
      <span class="meta">${pkg.expiryDate ? formatDate(pkg.expiryDate) : "첫 수업 후"}</span>
      <button class="delete-btn" type="button" data-delete-package="${pkg.id}">삭제</button>
      <span class="meta">${status.label} · 구매 ${formatDate(pkg.purchaseDate)}</span>
      <span class="meta">사용 ${pkg.used}회</span>
      <span class="meta">첫 수업 ${pkg.firstClassDate ? formatDate(pkg.firstClassDate) : "미정"}</span>
      <span class="meta"></span>
      <span class="meta"></span>
    `;
    els.packageStatus.appendChild(row);
  });

  els.packageStatus.querySelectorAll("[data-delete-package]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteById(state.packages, button.dataset.deletePackage);
      saveState();
      render();
    });
  });
}

function renderMessage(computed) {
  els.copyMessageStatus.textContent = "";
  if (state.students.length === 0) {
    els.messageText.value = "";
    els.messageUsageList.innerHTML = "";
    return;
  }

  const studentId = els.messageStudent.value || state.students[0]?.id;
  if (studentId && els.messageStudent.value !== studentId) {
    els.messageStudent.value = studentId;
  }

  const student = findStudent(studentId);
  const summary = getStudentPackageSummary(studentId, computed);
  const usage = getStudentPackageUsage(studentId, computed);
  renderMessageUsageList(usage);
  els.messageText.value = buildMessage(student, summary, usage);
}

function renderMessageUsageList(usage) {
  els.messageUsageList.innerHTML = "";
  if (usage.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "패키지 사용 내역이 없습니다.";
    els.messageUsageList.appendChild(empty);
    return;
  }

  usage.forEach((item, index) => {
    const row = document.createElement("article");
    row.className = "usage-row";
    row.innerHTML = `
      <div class="usage-title">
        <b>${formatDate(item.date)} ${item.time || "시간 미정"}</b>
        <span class="usage-count">${index + 1}회차</span>
      </div>
      <div class="meta">${escapeHTML(item.memo || "패키지 수업")}</div>
    `;
    els.messageUsageList.appendChild(row);
  });
}

async function copyMessage() {
  if (!els.messageText.value) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(els.messageText.value);
    } else {
      els.messageText.select();
      document.execCommand("copy");
    }
    els.copyMessageStatus.textContent = "복사되었습니다.";
  } catch {
    els.messageText.select();
    document.execCommand("copy");
    els.copyMessageStatus.textContent = "복사되었습니다.";
  }
}

function renderLessonList(computed) {
  els.lessonList.innerHTML = "";
  const lessons = getMonthLessons().sort(sortLessons);
  if (lessons.length === 0) {
    els.lessonList.appendChild(emptyTemplate.content.cloneNode(true));
    return;
  }

  lessons.forEach((lesson) => {
    const student = findStudent(lesson.studentId);
    const allocation = computed.lessonAllocation.get(lesson.id);
    const row = document.createElement("article");
    row.className = "lesson-row";
    const kindText = lesson.kind === "oneday" ? "원데이" : allocation ? "패키지 차감" : "차감할 패키지 없음";
    row.innerHTML = `
      <div class="lesson-head">
        <b>${escapeHTML(student?.name || "삭제된 학생")}</b>
        <span class="badge ${lesson.kind === "oneday" ? "warning" : allocation ? "" : "danger"}">${kindText}</span>
      </div>
      <div class="meta">${formatDate(lesson.date)} ${lesson.time || "시간 미정"}</div>
      ${lesson.memo ? `<div class="meta">${escapeHTML(lesson.memo)}</div>` : ""}
      <div class="row-actions">
        <button class="delete-btn" type="button" data-delete-lesson="${lesson.id}">삭제</button>
      </div>
    `;
    els.lessonList.appendChild(row);
  });

  els.lessonList.querySelectorAll("[data-delete-lesson]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteById(state.lessons, button.dataset.deleteLesson);
      saveState();
      render();
    });
  });
}

function renderAttendanceList() {
  els.attendanceList.innerHTML = "";
  const records = getMonthAttendance().sort(sortAttendance);
  if (records.length === 0) {
    els.attendanceList.appendChild(emptyTemplate.content.cloneNode(true));
    return;
  }

  records.forEach((record) => {
    const student = findStudent(record.studentId);
    const row = document.createElement("article");
    row.className = "attendance-row";
    const statusText = getAttendanceStatusText(record);
    const statusClass = record.status === "absent" && !record.makeupDone ? "danger" : record.makeupDone ? "warning" : "";
    row.innerHTML = `
      <div class="lesson-head">
        <b>${escapeHTML(student?.name || "삭제된 학생")} · ${getProgramName(record.program)}</b>
        <span class="badge ${statusClass}">${statusText}</span>
      </div>
      <div class="meta">${formatDate(record.date)}</div>
      ${record.memo ? `<div class="meta">${escapeHTML(record.memo)}</div>` : ""}
      <div class="row-actions">
        ${record.status === "absent" && !record.makeupDone ? `<button class="ghost small-btn" type="button" data-makeup-attendance="${record.id}">보강 완료</button>` : ""}
        <button class="delete-btn" type="button" data-delete-attendance="${record.id}">삭제</button>
      </div>
    `;
    els.attendanceList.appendChild(row);
  });

  els.attendanceList.querySelectorAll("[data-makeup-attendance]").forEach((button) => {
    button.addEventListener("click", () => {
      const record = state.attendance.find((item) => item.id === button.dataset.makeupAttendance);
      if (record) {
        record.makeupDone = true;
        saveState();
        render();
      }
    });
  });

  els.attendanceList.querySelectorAll("[data-delete-attendance]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteById(state.attendance, button.dataset.deleteAttendance);
      saveState();
      render();
    });
  });
}

function getStudentPackageSummary(studentId, computed) {
  const studentPackages = computed.packages
    .filter((pkg) => pkg.studentId === studentId)
    .map((pkg) => ({
      ...pkg,
      remaining: Math.max(0, pkg.total - pkg.used),
    }));

  const currentDate = toISODate(today);
  const usable = studentPackages.find((pkg) => {
    if (pkg.remaining <= 0) return false;
    if (!pkg.expiryDate) return true;
    return pkg.expiryDate >= currentDate;
  });

  if (usable) return usable;
  return studentPackages[studentPackages.length - 1] || null;
}

function getStudentPackageUsage(studentId, computed) {
  return state.lessons
    .filter((lesson) => lesson.studentId === studentId && lesson.kind === "package" && computed.lessonAllocation.has(lesson.id))
    .slice()
    .sort(sortLessons)
    .map((lesson) => ({
      date: lesson.date,
      time: lesson.time,
      memo: lesson.memo,
      packageId: computed.lessonAllocation.get(lesson.id),
    }));
}

function buildMessage(student, pkg, usage) {
  if (!student) return "";
  if (!pkg) {
    return `${student.name} 학생은 현재 등록된 패키지가 없습니다.`;
  }

  const expiryText = pkg.expiryDate ? `${formatDate(pkg.expiryDate)}까지` : "첫 수업일 기준으로 자동 계산될 예정";
  const lines = [
    `${student.name} 학생 패키지 안내드립니다.`,
    `총 ${pkg.total}회 중 ${pkg.remaining}회 남아있고, 사용기한은 ${expiryText}입니다.`,
  ];

  if (usage.length > 0) {
    lines.push("", "패키지 사용 내역");
    usage.forEach((item, index) => {
      const memo = item.memo ? ` · ${item.memo}` : "";
      lines.push(`${index + 1}. ${formatDate(item.date)} ${item.time || "시간 미정"}${memo}`);
    });
  }

  return lines.join("\n");
}

function computePackages() {
  const packages = state.packages
    .map((pkg) => ({ ...pkg, used: 0, firstClassDate: "", expiryDate: "" }))
    .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate) || a.createdAt - b.createdAt);
  const lessonAllocation = new Map();
  const packageLessons = state.lessons
    .filter((lesson) => lesson.kind === "package")
    .slice()
    .sort(sortLessons);

  packageLessons.forEach((lesson) => {
    const availablePackage = packages.find((pkg) => {
      if (pkg.studentId !== lesson.studentId) return false;
      if (lesson.date < pkg.purchaseDate) return false;
      if (pkg.used >= pkg.total) return false;
      if (!pkg.firstClassDate) return true;
      return lesson.date <= pkg.expiryDate;
    });

    if (!availablePackage) return;
    if (!availablePackage.firstClassDate) {
      availablePackage.firstClassDate = lesson.date;
      availablePackage.expiryDate = toISODate(addMonths(parseISO(lesson.date), availablePackage.total === 10 ? 3 : 6));
    }
    availablePackage.used += 1;
    lessonAllocation.set(lesson.id, availablePackage.id);
  });

  return { packages, lessonAllocation };
}

function getPackageStatus(pkg, remaining) {
  const currentDate = toISODate(today);
  if (pkg.expiryDate && pkg.expiryDate < currentDate) {
    return { label: "기한 만료", className: "expired", badgeClass: "danger" };
  }
  if (remaining <= 0) {
    return { label: "사용 완료", className: "done", badgeClass: "danger" };
  }
  if (!pkg.firstClassDate) {
    return { label: "대기", className: "waiting", badgeClass: "warning" };
  }
  if (remaining <= 2) {
    return { label: "잔여 임박", className: "low", badgeClass: "warning" };
  }
  return { label: "사용 가능", className: "active", badgeClass: "" };
}

function groupLessonsByDate(computed) {
  const groups = new Map();
  getMonthGridLessons().forEach((lesson) => {
    if (!groups.has(lesson.date)) groups.set(lesson.date, []);
    groups.get(lesson.date).push(lesson);
  });
  groups.forEach((lessons) => lessons.sort(sortLessons));
  return groups;
}

function getMonthLessons() {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  return state.lessons.filter((lesson) => {
    const date = parseISO(lesson.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

function getMonthAttendance() {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  return state.attendance.filter((record) => {
    const date = parseISO(record.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

function getMonthGridLessons() {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const start = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - start.getDay());
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 41);
  return state.lessons.filter((lesson) => {
    const date = parseISO(lesson.date);
    return date >= gridStart && date <= gridEnd;
  });
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dodam-packages-${toISODate(today)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.students) || !Array.isArray(imported.packages) || !Array.isArray(imported.lessons)) {
        throw new Error("Invalid data");
      }
      const normalized = normalizeState(imported);
      state.students = normalized.students;
      state.packages = normalized.packages;
      state.lessons = normalized.lessons;
      state.attendance = normalized.attendance;
      saveState();
      render();
    } catch {
      alert("가져올 수 없는 파일입니다.");
    } finally {
      event.target.value = "";
    }
  });
  reader.readAsText(file);
}

function openSettingsDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.addEventListener("upgradeneeded", () => {
      request.result.createObjectStore(DB_STORE);
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function loadStoredFileHandle() {
  try {
    const db = await openSettingsDb();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(DB_STORE, "readonly");
      const store = transaction.objectStore(DB_STORE);
      const request = store.get(DB_HANDLE_KEY);
      request.addEventListener("success", () => resolve(request.result || null));
      request.addEventListener("error", () => reject(request.error));
    });
  } catch {
    return null;
  }
}

async function storeFileHandle(handle) {
  const db = await openSettingsDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readwrite");
    const store = transaction.objectStore(DB_STORE);
    const request = store.put(handle, DB_HANDLE_KEY);
    request.addEventListener("success", () => resolve());
    request.addEventListener("error", () => reject(request.error));
  });
}

function findStudent(id) {
  return state.students.find((student) => student.id === id);
}

function deleteById(list, id) {
  const index = list.findIndex((item) => item.id === id);
  if (index >= 0) list.splice(index, 1);
}

function sortLessons(a, b) {
  return a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || "") || a.createdAt - b.createdAt;
}

function sortAttendance(a, b) {
  return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
}

function monthFromISO(iso) {
  const date = parseISO(iso);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function parseISO(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonths(date, months) {
  const result = new Date(date);
  const originalDay = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() < originalDay) result.setDate(0);
  return result;
}

function formatDate(iso) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${year}.${month}.${day}`;
}

function getProgramName(program) {
  return program === "visit" ? "방문수업" : "한글";
}

function getAttendanceStatusText(record) {
  if (record.status === "absent" && record.makeupDone) return "보강 완료";
  return record.status === "absent" ? "결석" : "출석";
}

function formatMonthDay(iso) {
  const [, month, day] = iso.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function getWeekdayName(iso) {
  return ["일", "월", "화", "수", "목", "금", "토"][parseISO(iso).getDay()];
}

function formatClock(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function restoreSelectValue(select, value) {
  if (value && Array.from(select.options).some((option) => option.value === value)) {
    select.value = value;
  }
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
