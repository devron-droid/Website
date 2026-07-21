/* ==========================================================
   INVICTA PLANNER — APPLICATION LOGIC
   ========================================================== */

(function(){
"use strict";

/* ---------------- STORAGE KEYS ---------------- */
const LS_KEY = "invicta_state_v1";

/* ---------------- DEFAULT STATE ---------------- */
function defaultState(){
  return {
    user: { name: "", pic: "", age: "", occupation: "", bio: "", location: "" },
    onboarded: false,
    settings: {
      theme: "dark",
      accent: "#4F8CFF",
      fontFamily: "'Inter', sans-serif",
      fontSize: 15,
      animSpeed: 1, // 0 slow,1 normal,2 fast -> mapped
      blur: 18,
      notifications: false,
      sound: true,
      autosave: true
    },
    tasks: [],          // {id,title,priority,due,completed,createdAt}
    habits: [],         // {id,name,history:{date:true},createdAt}
    goals: [],          // {id,title,desc,deadline,milestones:[{id,text,done}],createdAt}
    notes: [],          // {id,title,content,category,pinned,updatedAt}
    journal: [],        // {id,date,title,content,mood,createdAt}
    pomodoro: { sessions: [], modeMinutes: 25 }, // sessions: {date,minutes}
    water: { goal: 2000, log: {} }, // log: {date:[{amount,time}]}
    mood: {}, // {date: mood}
    todayFocus: { date:"", text:"" },
    quoteIndex: 0
  };
}

let state = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const def = defaultState();
    return Object.assign(def, parsed, {
      user: Object.assign(def.user, parsed.user||{}),
      settings: Object.assign(def.settings, parsed.settings||{}),
      pomodoro: Object.assign(def.pomodoro, parsed.pomodoro||{}),
      water: Object.assign(def.water, parsed.water||{})
    });
  }catch(e){
    console.error("Failed to load state", e);
    return defaultState();
  }
}

function saveState(){
  try{
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }catch(e){
    console.error("Failed to save state", e);
    showToast("Storage error: could not save data");
  }
}

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function todayISO(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function fmtDate(d){ return d.toLocaleDateString(undefined,{weekday:'long', year:'numeric', month:'long', day:'numeric'}); }

/* ---------------- TOAST ---------------- */
let toastTimer;
function showToast(msg){
  const t = document.getElementById("toast");
  if(t) {
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> t.classList.remove("show"), 2600);
  }
}

/* ---------------- CONFIRM DIALOG ---------------- */
function confirmDialog(message){
  return new Promise(resolve=>{
    const overlay = document.getElementById("confirm-overlay");
    const msgEl = document.getElementById("confirm-message");
    if(!overlay || !msgEl) { resolve(false); return; }
    
    msgEl.textContent = message;
    overlay.classList.remove("hidden");
    const ok = document.getElementById("confirm-ok");
    const cancel = document.getElementById("confirm-cancel");
    function cleanup(val){
      overlay.classList.add("hidden");
      if(ok) ok.removeEventListener("click", onOk);
      if(cancel) cancel.removeEventListener("click", onCancel);
      resolve(val);
    }
    function onOk(){ cleanup(true); }
    function onCancel(){ cleanup(false); }
    if(ok) ok.addEventListener("click", onOk);
    if(cancel) cancel.addEventListener("click", onCancel);
  });
}

/* ---------------- ICONS (monochrome SVG, stroke based) ---------------- */
const ICONS = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="12" width="8" height="9" rx="2"/><rect x="3" y="14" width="8" height="7" rx="2"/></svg>`,
  tasks: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 11l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/><rect x="3" y="4" width="18" height="16" rx="3"/></svg>`,
  habits: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2" stroke-linecap="round"/></svg>`,
  goals: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18" stroke-linecap="round"/></svg>`,
  notes: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 4h11l3 3v13H5z"/><path d="M9 9h7M9 13h7M9 17h4" stroke-linecap="round"/></svg>`,
  journal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5c3-1.5 6-1.5 8 0v14c-2-1.5-5-1.5-8 0V5z"/><path d="M20 5c-3-1.5-6-1.5-8 0v14c2-1.5 5-1.5 8 0V5z"/></svg>`,
  pomodoro: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M10 2h4" stroke-linecap="round"/></svg>`,
  analytics: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20V10M12 20V4M20 20v-7" stroke-linecap="round"/></svg>`,
  water: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3s7 7.5 7 12a7 7 0 11-14 0c0-4.5 7-12 7-12z"/></svg>`,
  mood: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" stroke-linecap="round"/></svg>`,
  quotes: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 8c-2 0-3 1.5-3 3.5S5 15 7 15c0 2-1 3.5-2.5 4M17 8c-2 0-3 1.5-3 3.5S15 15 17 15c0 2-1 3.5-2.5 4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke-linecap="round"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V21a2 2 0 11-4 0v-.2a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 112.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H3a2 2 0 010-4h.2a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9.3a1.7 1.7 0 001-1.6V3a2 2 0 014 0v.2a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9.3a1.7 1.7 0 001.6 1H21a2 2 0 010 4h-.2a1.7 1.7 0 00-1.6 1z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20l1-4L16 5l3 3L8 19l-4 1z" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2l2 6 6 2-5 4 1 6-5-3-5 3 1-6-5-4 6-2z"/></svg>`
};
function renderIcons(){
  document.querySelectorAll("[data-icon]").forEach(el=>{
    const key = el.getAttribute("data-icon");
    if(ICONS[key]) el.innerHTML = ICONS[key];
  });
}

/* ---------------- QUOTES ---------------- */
const QUOTES = [
  ["The secret of getting ahead is getting started.", "Mark Twain"],
  ["Discipline is choosing between what you want now and what you want most.", "Abraham Lincoln"],
  ["Small daily improvements are the key to staggering long-term results.", "James Clear"],
  ["Focus on being productive instead of busy.", "Tim Ferriss"],
  ["You do not rise to the level of your goals; you fall to the level of your systems.", "James Clear"],
  ["The future depends on what you do today.", "Mahatma Gandhi"],
  ["Well begun is half done.", "Aristotle"],
  ["Action is the foundational key to all success.", "Pablo Picasso"],
  ["It always seems impossible until it is done.", "Nelson Mandela"],
  ["Motivation gets you going, but discipline keeps you growing.", "John C. Maxwell"],
  ["Do the hard jobs first. The easy jobs will take care of themselves.", "Dale Carnegie"],
  ["Success is the sum of small efforts repeated day in and day out.", "Robert Collier"],
  ["The way to get started is to quit talking and begin doing.", "Walt Disney"],
  ["Your future is created by what you do today, not tomorrow.", "Robert Kiyosaki"],
  ["A goal without a plan is just a wish.", "Antoine de Saint-Exupery"]
];

/* ---------------- APPLY SETTINGS ---------------- */
function applySettings(){
  const s = state.settings;
  document.documentElement.style.setProperty("--accent", s.accent);
  const hex = s.accent.replace('#','');
  const r = parseInt(hex.substr(0,2),16), g=parseInt(hex.substr(2,2),16), b=parseInt(hex.substr(4,2),16);
  document.documentElement.style.setProperty("--accent-rgb", `${r},${g},${b}`);
  document.documentElement.style.setProperty("--font-family", s.fontFamily);
  document.documentElement.style.setProperty("--font-size", s.fontSize+"px");
  document.documentElement.style.setProperty("--blur", s.blur+"px");
  const speedMap = {0:"0.6s",1:"0.35s",2:"0.15s"};
  document.documentElement.style.setProperty("--anim-speed", speedMap[s.animSpeed] ?? "0.35s");

  if(s.theme === "system"){
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle("light-theme", !prefersDark);
  } else {
    document.body.classList.toggle("light-theme", s.theme === "light");
  }

  // reflect in settings UI
  document.querySelectorAll("#theme-segmented button").forEach(b=>b.classList.toggle("active", b.dataset.theme===s.theme));
  document.querySelectorAll("#accent-swatches .swatch").forEach(b=>b.classList.toggle("active", b.dataset.accent.toLowerCase()===s.accent.toLowerCase()));
  
  const fontFamSelect = document.getElementById("font-family-select");
  if(fontFamSelect) fontFamSelect.value = s.fontFamily;
  const fontSizeRange = document.getElementById("font-size-range");
  if(fontSizeRange) fontSizeRange.value = s.fontSize;
  const animSpeedRange = document.getElementById("anim-speed-range");
  if(animSpeedRange) animSpeedRange.value = s.animSpeed;
  const blurRange = document.getElementById("blur-range");
  if(blurRange) blurRange.value = s.blur;
  
  const toggleNotif = document.getElementById("toggle-notifications");
  if(toggleNotif) toggleNotif.checked = s.notifications;
  const toggleSound = document.getElementById("toggle-sound");
  if(toggleSound) toggleSound.checked = s.sound;
  const toggleAutosave = document.getElementById("toggle-autosave");
  if(toggleAutosave) toggleAutosave.checked = s.autosave;
}

/* ---------------- CLOCK ---------------- */
function updateClock(){
  const now = new Date();
  const hour = now.getHours();
  let greeting = "Good Evening";
  if(hour < 12) greeting = "Good Morning";
  else if(hour < 17) greeting = "Good Afternoon";
  
  const greetEl = document.getElementById("greeting-text");
  if(greetEl) greetEl.textContent = greeting;
  const hDate = document.getElementById("header-date");
  if(hDate) hDate.textContent = fmtDate(now);
  const hTime = document.getElementById("header-time");
  if(hTime) hTime.textContent = now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

/* ---------------- NAVIGATION ---------------- */
function goToView(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  const target = document.getElementById("view-"+view);
  if(target) target.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active", n.dataset.view===view));
  renderView(view);
}

function renderView(view){
  switch(view){
    case "dashboard": renderDashboard(); break;
    case "tasks": renderTasks(); break;
    case "habits": renderHabits(); break;
    case "goals": renderGoals(); break;
    case "calendar": renderCalendar(); break;
    case "notes": renderNotes(); break;
    case "journal": renderJournal(); break;
    case "pomodoro": renderPomodoroStats(); break;
    case "analytics": renderAnalytics(); break;
    case "water": renderWater(); break;
    case "mood": renderMood(); break;
    case "quotes": break;
    case "profile": renderProfile(); break;
    case "settings": break;
  }
}

/* ---------------- MODAL HELPER ---------------- */
function openModal(html, onOpen){
  const overlay = document.getElementById("modal-overlay");
  const box = document.getElementById("modal-box");
  if(box && overlay) {
    box.innerHTML = html;
    overlay.classList.remove("hidden");
    if(onOpen) onOpen(box);
  }
}
function closeModal(){
  const overlay = document.getElementById("modal-overlay");
  if(overlay) overlay.classList.add("hidden");
}
document.addEventListener("click", (e)=>{
  if(e.target.id === "modal-overlay") closeModal();
});

/* ==========================================================
   DASHBOARD
   ========================================================== */
function renderDashboard(){
  const hName = document.getElementById("hello-name");
  if(hName) hName.textContent = "Hello, " + (state.user.name || "there");
  const today = todayISO();

  if(state.todayFocus.date !== today) state.todayFocus = {date: today, text: ""};
  const focusInput = document.getElementById("today-focus-input");
  if(focusInput) focusInput.value = state.todayFocus.text || "";

  const dashQuote = document.getElementById("dash-quote");
  if(dashQuote) {
    const [qt] = QUOTES[state.quoteIndex % QUOTES.length];
    dashQuote.textContent = `"${qt}"`;
  }

  const totalTasks = state.tasks.length;
  const doneTasks = state.tasks.filter(t=>t.completed).length;
  const statTasks = document.getElementById("stat-tasks");
  if(statTasks) statTasks.textContent = `${doneTasks} / ${totalTasks}`;

  const habitsToday = state.habits.filter(h=>h.history[today]).length;
  const statHabits = document.getElementById("stat-habits");
  if(statHabits) statHabits.textContent = `${habitsToday} / ${state.habits.length}`;

  const statGoals = document.getElementById("stat-goals");
  if(statGoals) statGoals.textContent = state.goals.length;
  const statCal = document.getElementById("stat-calendar");
  if(statCal) statCal.textContent = new Date().toLocaleDateString(undefined,{month:'short', day:'numeric'});
  const statNotes = document.getElementById("stat-notes");
  if(statNotes) statNotes.textContent = state.notes.length;
  const statJournal = document.getElementById("stat-journal");
  if(statJournal) statJournal.textContent = state.journal.length;

  const pomoToday = state.pomodoro.sessions.filter(s=>s.date===today).length;
  const statPomo = document.getElementById("stat-pomodoro");
  if(statPomo) statPomo.textContent = pomoToday;

  const waterToday = (state.water.log[today]||[]).reduce((a,b)=>a+b.amount,0);
  const statWater = document.getElementById("stat-water");
  if(statWater) statWater.textContent = `${waterToday} ml`;

  const statMood = document.getElementById("stat-mood");
  if(statMood) statMood.textContent = state.mood[today] || "--";
}

document.addEventListener("input", (e)=>{
  if(e.target.id === "today-focus-input"){
    state.todayFocus = {date: todayISO(), text: e.target.value};
    saveState();
  }
});

document.addEventListener("click", (e)=>{
  const card = e.target.closest(".grid-card[data-nav]");
  if(card){ goToView(card.dataset.nav); }
});

/* ==========================================================
   TASKS
   ========================================================== */
function renderTasks(){
  const searchEl = document.getElementById("task-search");
  const filterEl = document.getElementById("task-filter");
  const sortEl = document.getElementById("task-sort");
  
  const search = (searchEl ? searchEl.value : "").toLowerCase();
  const filter = filterEl ? filterEl.value : "all";
  const sort = sortEl ? sortEl.value : "date";

  let list = state.tasks.filter(t=> t.title.toLowerCase().includes(search));
  if(filter === "active") list = list.filter(t=>!t.completed);
  if(filter === "completed") list = list.filter(t=>t.completed);

  const prioRank = {High:0, Medium:1, Low:2};
  if(sort === "priority") list = [...list].sort((a,b)=>prioRank[a.priority]-prioRank[b.priority]);
  else if(sort === "due") list = [...list].sort((a,b)=> (a.due||"9999").localeCompare(b.due||"9999"));
  else list = [...list].sort((a,b)=> b.createdAt - a.createdAt);

  const ul = document.getElementById("task-list");
  if(!ul) return;
  ul.innerHTML = "";
  
  const emptyEl = document.getElementById("task-empty");
  if(emptyEl) emptyEl.classList.toggle("hidden", state.tasks.length>0);

  list.forEach(task=>{
    const li = document.createElement("li");
    li.className = "list-item" + (task.completed ? " completed" : "");
    li.innerHTML = `
      <div class="check-circle ${task.completed?'checked':''}" data-check="${task.id}">${ICONS.check}</div>
      <div class="item-body">
        <div class="item-title">${escapeHtml(task.title)}</div>
        <div class="item-meta">
          <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
          ${task.due ? `<span>Due ${task.due}</span>` : ""}
        </div>
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-edit-task="${task.id}">${ICONS.edit}</button>
        <button class="icon-btn" data-del-task="${task.id}">${ICONS.trash}</button>
      </div>`;
    ul.appendChild(li);
  });

  const total = state.tasks.length;
  const done = state.tasks.filter(t=>t.completed).length;
  const pct = total ? Math.round(done/total*100) : 0;
  
  const counterEl = document.getElementById("task-counter");
  if(counterEl) counterEl.textContent = `${done} of ${total} tasks completed`;
  const percentEl = document.getElementById("task-percent");
  if(percentEl) percentEl.textContent = pct+"%";
  const progressFill = document.getElementById("task-progress-fill");
  if(progressFill) progressFill.style.width = pct+"%";
}

function taskModal(existing){
  const isEdit = !!existing;
  openModal(`
    <h2>${isEdit?"Edit Task":"New Task"}</h2>
    <div class="modal-field"><label>Title</label><input type="text" id="mf-title" value="${existing?escapeAttr(existing.title):""}"></div>
    <div class="modal-field"><label>Priority</label>
      <select id="mf-priority">
        <option ${existing?.priority==="High"?"selected":""}>High</option>
        <option ${!existing || existing.priority==="Medium"?"selected":""}>Medium</option>
        <option ${existing?.priority==="Low"?"selected":""}>Low</option>
      </select>
    </div>
    <div class="modal-field"><label>Due Date</label><input type="date" id="mf-due" value="${existing?.due||""}"></div>
    <div class="modal-actions">
      <button class="btn-secondary sm" id="mf-cancel">Cancel</button>
      <button class="btn-primary sm" id="mf-save">${isEdit?"Save":"Create"}</button>
    </div>
  `, (box)=>{
    box.querySelector("#mf-title").focus();
    box.querySelector("#mf-cancel").onclick = closeModal;
    box.querySelector("#mf-save").onclick = () => {
      const title = box.querySelector("#mf-title").value.trim();
      if(!title){ showToast("Task title cannot be empty"); return; }
      const priority = box.querySelector("#mf-priority").value;
      const due = box.querySelector("#mf-due").value;
      if(isEdit){
        existing.title = title; existing.priority = priority; existing.due = due;
      } else {
        state.tasks.push({id:uid(), title, priority, due, completed:false, createdAt:Date.now()});
      }
      saveState(); closeModal(); renderTasks(); showToast(isEdit?"Task updated":"Task created");
    };
  });
}

/* ==========================================================
   HABITS
   ========================================================== */
function last7Days(){
  const days = [];
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    days.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"));
  }
  return days;
}
function calcStreak(history){
  let streak = 0;
  let d = new Date();
  while(true){
    const key = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    if(history[key]){ streak++; d.setDate(d.getDate()-1); } else break;
  }
  return streak;
}
function calcLongestStreak(history){
  const dates = Object.keys(history).filter(k=>history[k]).sort();
  let longest=0, cur=0, prev=null;
  dates.forEach(dstr=>{
    const d = new Date(dstr);
    if(prev){
      const diff = (d - prev)/86400000;
      cur = diff===1 ? cur+1 : 1;
    } else cur = 1;
    longest = Math.max(longest, cur);
    prev = d;
  });
  return longest;
}
function renderHabits(){
  const wrap = document.getElementById("habit-list");
  if(!wrap) return;
  wrap.innerHTML = "";
  
  const emptyEl = document.getElementById("habit-empty");
  if(emptyEl) emptyEl.classList.toggle("hidden", state.habits.length>0);
  const today = todayISO();
  const week = last7Days();

  state.habits.forEach(habit=>{
    const weekChecked = week.filter(d=>habit.history[d]).length;
    const monthDays = [];
    for(let i=0;i<30;i++){ const d=new Date(); d.setDate(d.getDate()-i); monthDays.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")); }
    const monthChecked = monthDays.filter(d=>habit.history[d]).length;
    const pct = Math.round(monthChecked/30*100);
    const circumference = 2*Math.PI*26;
    const offset = circumference * (1-pct/100);

    const card = document.createElement("div");
    card.className = "grid-card habit-card glass";
    card.innerHTML = `
      <div class="habit-card-top">
        <div>
          <div class="habit-name">${escapeHtml(habit.name)}</div>
          <div class="habit-streaks"><span>Streak ${calcStreak(habit.history)}d</span><span>Best ${calcLongestStreak(habit.history)}d</span></div>
        </div>
        <button class="icon-btn" data-del-habit="${habit.id}">${ICONS.trash}</button>
      </div>
      <div class="habit-ring-wrap">
        <svg viewBox="0 0 64 64" class="habit-ring" style="transform:rotate(-90deg)">
          <circle cx="32" cy="32" r="26" fill="none" stroke="var(--surface-strong)" stroke-width="6"/>
          <circle cx="32" cy="32" r="26" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
        </svg>
      </div>
      <div class="grid-card-sub">Week: ${weekChecked}/7 &nbsp;•&nbsp; Month: ${pct}%</div>
      <button class="btn-secondary sm" data-check-habit="${habit.id}">${habit.history[today] ? "Checked Today ✓" : "Check Today"}</button>
    `;
    wrap.appendChild(card);
  });
}
function habitModal(){
  openModal(`
    <h2>New Habit</h2>
    <div class="modal-field"><label>Habit Name</label><input type="text" id="mf-habit-name" placeholder="e.g. Read 20 pages"></div>
    <div class="modal-actions">
      <button class="btn-secondary sm" id="mf-cancel">Cancel</button>
      <button class="btn-primary sm" id="mf-save">Create</button>
    </div>
  `, box=>{
    box.querySelector("#mf-habit-name").focus();
    box.querySelector("#mf-cancel").onclick = closeModal;
    box.querySelector("#mf-save").onclick = ()=>{
      const name = box.querySelector("#mf-habit-name").value.trim();
      if(!name){ showToast("Habit name cannot be empty"); return; }
      state.habits.push({id:uid(), name, history:{}, createdAt:Date.now()});
      saveState(); closeModal(); renderHabits(); showToast("Habit created");
    };
  });
}

/* ==========================================================
   GOALS
   ========================================================== */
function goalProgress(goal){
  if(!goal.milestones.length) return 0;
  return Math.round(goal.milestones.filter(m=>m.done).length / goal.milestones.length * 100);
}
function renderGoals(){
  const wrap = document.getElementById("goal-list");
  if(!wrap) return;
  wrap.innerHTML = "";
  
  const emptyEl = document.getElementById("goal-empty");
  if(emptyEl) emptyEl.classList.toggle("hidden", state.goals.length>0);
  state.goals.forEach(goal=>{
    const pct = goalProgress(goal);
    const div = document.createElement("div");
    div.className = "list-item goal-item";
    div.innerHTML = `
      <div class="item-body" style="width:100%">
        <div class="goal-header">
          <div class="goal-title">${escapeHtml(goal.title)}</div>
          <div class="goal-deadline">${goal.deadline ? "Due "+goal.deadline : ""}</div>
        </div>
        <div class="goal-desc">${escapeHtml(goal.desc||"")}</div>
        <div class="goal-milestones">
          ${goal.milestones.map(m=>`
            <label class="milestone-row ${m.done?'done':''}">
              <input type="checkbox" ${m.done?"checked":""} data-goal="${goal.id}" data-milestone="${m.id}">
              <span>${escapeHtml(m.text)}</span>
            </label>`).join("")}
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="grid-card-sub" style="margin-top:6px">${pct}% complete</div>
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-del-goal="${goal.id}">${ICONS.trash}</button>
      </div>`;
    wrap.appendChild(div);
  });
}
function goalModal(){
  openModal(`
    <h2>New Goal</h2>
    <div class="modal-field"><label>Title</label><input type="text" id="mf-title"></div>
    <div class="modal-field"><label>Description</label><textarea id="mf-desc" rows="2"></textarea></div>
    <div class="modal-field"><label>Deadline</label><input type="date" id="mf-deadline"></div>
    <div class="modal-field"><label>Milestones (one per line)</label><textarea id="mf-milestones" rows="3" placeholder="Milestone 1&#10;Milestone 2"></textarea></div>
    <div class="modal-actions">
      <button class="btn-secondary sm" id="mf-cancel">Cancel</button>
      <button class="btn-primary sm" id="mf-save">Create</button>
    </div>
  `, box=>{
    box.querySelector("#mf-title").focus();
    box.querySelector("#mf-cancel").onclick = closeModal;
    box.querySelector("#mf-save").onclick = ()=>{
      const title = box.querySelector("#mf-title").value.trim();
      if(!title){ showToast("Goal title cannot be empty"); return; }
      const desc = box.querySelector("#mf-desc").value.trim();
      const deadline = box.querySelector("#mf-deadline").value;
      const milestones = box.querySelector("#mf-milestones").value.split("\n").map(s=>s.trim()).filter(Boolean).map(text=>({id:uid(), text, done:false}));
      state.goals.push({id:uid(), title, desc, deadline, milestones, createdAt:Date.now()});
      saveState(); closeModal(); renderGoals(); showToast("Goal created");
    };
  });
}

/* ==========================================================
   CALENDAR
   ========================================================== */
let calViewDate = new Date();
let calSelectedDate = todayISO();
function renderCalendar(){
  const grid = document.getElementById("calendar-grid");
  if(!grid) return;
  grid.innerHTML = "";
  const monthLabel = calViewDate.toLocaleDateString(undefined,{month:'long', year:'numeric'});
  
  const mLabelEl = document.getElementById("cal-month-label");
  if(mLabelEl) mLabelEl.textContent = monthLabel;

  ["Su","Mo","Tu","We","Th","Fr","Sa"].forEach(d=>{
    const el = document.createElement("div"); el.className="cal-dow"; el.textContent=d; grid.appendChild(el);
  });

  const year = calViewDate.getFullYear(), month = calViewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const today = todayISO();

  for(let i=0;i<firstDay;i++){ const e=document.createElement("div"); e.className="cal-cell empty"; grid.appendChild(e); }

  for(let day=1; day<=daysInMonth; day++){
    const dateStr = year+"-"+String(month+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
    const cell = document.createElement("div");
    cell.className = "cal-cell";
    if(dateStr === today) cell.classList.add("today");
    if(dateStr === calSelectedDate) cell.classList.add("selected");
    const hasTask = state.tasks.some(t=>t.due===dateStr);
    cell.innerHTML = `<span>${day}</span>${hasTask?'<span class="dot"></span>':''}`;
    cell.dataset.date = dateStr;
    grid.appendChild(cell);
  }
  renderDayPanel();
}
function renderDayPanel(){
  const dPanelTitle = document.getElementById("day-panel-title");
  if(dPanelTitle) dPanelTitle.textContent = new Date(calSelectedDate+"T00:00:00").toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'});
  const tasksOnDay = state.tasks.filter(t=>t.due===calSelectedDate);
  const content = document.getElementById("day-panel-content");
  if(!content) return;
  if(!tasksOnDay.length){
    content.innerHTML = `<p style="color:var(--text-secondary); font-size:13.5px;">No tasks due this day.</p>`;
  } else {
    content.innerHTML = `<ul class="list">` + tasksOnDay.map(t=>`
      <li class="list-item ${t.completed?'completed':''}">
        <div class="item-body"><div class="item-title">${escapeHtml(t.title)}</div>
        <div class="item-meta"><span class="priority-badge priority-${t.priority.toLowerCase()}">${t.priority}</span></div></div>
      </li>`).join("") + `</ul>`;
  }
}

/* ==========================================================
   NOTES
   ========================================================== */
function renderNotes(){
  const searchEl = document.getElementById("note-search");
  const catEl = document.getElementById("note-category-filter");
  const search = (searchEl ? searchEl.value : "").toLowerCase();
  const cat = catEl ? catEl.value : "all";
  
  let list = state.notes.filter(n => (n.title+n.content).toLowerCase().includes(search));
  if(cat !== "all") list = list.filter(n=>n.category===cat);
  list = [...list].sort((a,b)=> (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt));

  const wrap = document.getElementById("note-list");
  if(!wrap) return;
  wrap.innerHTML = "";
  
  const emptyEl = document.getElementById("note-empty");
  if(emptyEl) emptyEl.classList.toggle("hidden", state.notes.length>0);
  
  list.forEach(note=>{
    const card = document.createElement("div");
    card.className = "grid-card note-card glass" + (note.pinned ? " pinned":"");
    card.dataset.note = note.id;
    card.innerHTML = `
      <div class="note-top">
        <span class="note-cat">${note.category}</span>
        <button class="icon-btn" data-pin-note="${note.id}" title="Pin">${ICONS.pin}</button>
      </div>
      <div class="note-title">${escapeHtml(note.title)}</div>
      <div class="note-preview">${escapeHtml(note.content)}</div>
    `;
    wrap.appendChild(card);
  });
}
function noteModal(existing){
  const isEdit = !!existing;
  openModal(`
    <h2>${isEdit?"Edit Note":"New Note"}</h2>
    <div class="modal-field"><label>Title</label><input type="text" id="mf-title" value="${existing?escapeAttr(existing.title):""}"></div>
    <div class="modal-field"><label>Category</label>
      <select id="mf-category">
        ${["General","Work","Personal","Ideas"].map(c=>`<option ${existing?.category===c?"selected":""}>${c}</option>`).join("")}
      </select>
    </div>
    <div class="modal-field"><label>Content</label><textarea id="mf-content" rows="6">${existing?escapeHtml(existing.content):""}</textarea></div>
    <div class="modal-actions">
      ${isEdit ? `<button class="btn-danger sm" id="mf-delete" style="margin-right:auto">Delete</button>` : ""}
      <button class="btn-secondary sm" id="mf-cancel">Cancel</button>
      <button class="btn-primary sm" id="mf-save">${isEdit?"Save":"Create"}</button>
    </div>
  `, box=>{
    box.querySelector("#mf-title").focus();
    box.querySelector("#mf-cancel").onclick = closeModal;
    if(isEdit) box.querySelector("#mf-delete").onclick = async ()=>{
      const ok = await confirmDialog("Delete this note?");
      if(ok){ state.notes = state.notes.filter(n=>n.id!==existing.id); saveState(); closeModal(); renderNotes(); showToast("Note deleted"); }
    };
    box.querySelector("#mf-save").onclick = ()=>{
      const title = box.querySelector("#mf-title").value.trim();
      if(!title){ showToast("Note title cannot be empty"); return; }
      const category = box.querySelector("#mf-category").value;
      const content = box.querySelector("#mf-content").value;
      if(isEdit){ existing.title=title; existing.category=category; existing.content=content; existing.updatedAt=Date.now(); }
      else state.notes.push({id:uid(), title, category, content, pinned:false, updatedAt:Date.now()});
      saveState(); closeModal(); renderNotes(); showToast(isEdit?"Note saved":"Note created");
    };
  });
}

/* ==========================================================
   JOURNAL
   ========================================================== */
function renderJournal(){
  const jSearch = document.getElementById("journal-search");
  const search = (jSearch ? jSearch.value : "").toLowerCase();
  let list = state.journal.filter(j=>(j.title+j.content).toLowerCase().includes(search));
  list = [...list].sort((a,b)=>b.createdAt-a.createdAt);
  const wrap = document.getElementById("journal-list");
  if(!wrap) return;
  wrap.innerHTML = "";
  
  const emptyEl = document.getElementById("journal-empty");
  if(emptyEl) emptyEl.classList.toggle("hidden", state.journal.length>0);
  list.forEach(entry=>{
    const div = document.createElement("div");
    div.className = "journal-entry glass";
    div.innerHTML = `
      <div class="journal-entry-head">
        <span class="journal-date">${entry.date}</span>
        <span class="journal-mood-tag">${entry.mood}</span>
      </div>
      <div class="journal-title">${escapeHtml(entry.title)}</div>
      <div class="journal-content">${escapeHtml(entry.content)}</div>
      <div class="item-actions" style="margin-top:10px; justify-content:flex-end; display:flex;">
        <button class="icon-btn" data-del-journal="${entry.id}">${ICONS.trash}</button>
      </div>
    `;
    wrap.appendChild(div);
  });
}
function journalModal(){
  openModal(`
    <h2>New Journal Entry</h2>
    <div class="modal-field"><label>Title</label><input type="text" id="mf-title"></div>
    <div class="modal-field"><label>Mood</label>
      <select id="mf-mood">${["Excellent","Good","Normal","Bad","Terrible"].map(m=>`<option>${m}</option>`).join("")}</select>
    </div>
    <div class="modal-field"><label>Content</label><textarea id="mf-content" rows="6"></textarea></div>
    <div class="modal-actions">
      <button class="btn-secondary sm" id="mf-cancel">Cancel</button>
      <button class="btn-primary sm" id="mf-save">Save Entry</button>
    </div>
  `, box=>{
    box.querySelector("#mf-title").focus();
    box.querySelector("#mf-cancel").onclick = closeModal;
    box.querySelector("#mf-save").onclick = ()=>{
      const title = box.querySelector("#mf-title").value.trim();
      if(!title){ showToast("Entry title cannot be empty"); return; }
      const mood = box.querySelector("#mf-mood").value;
      const content = box.querySelector("#mf-content").value;
      state.journal.push({id:uid(), date:todayISO(), title, mood, content, createdAt:Date.now()});
      saveState(); closeModal(); renderJournal(); showToast("Journal entry saved");
    };
  });
}

/* ==========================================================
   POMODORO
   ========================================================== */
let pomoTotalSeconds = 25*60;
let pomoRemaining = pomoTotalSeconds;
let pomoInterval = null;
let pomoRunning = false;
const RING_CIRC = 2*Math.PI*108;

function setRing(pct){
  const el = document.getElementById("ring-progress");
  if(el) {
    el.style.strokeDasharray = RING_CIRC;
    el.style.strokeDashoffset = RING_CIRC * (1-pct);
  }
}
function updateTimerDisplay(){
  const m = Math.floor(pomoRemaining/60), s = pomoRemaining%60;
  const tDisplay = document.getElementById("timer-display");
  if(tDisplay) tDisplay.textContent = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  setRing(1 - pomoRemaining/pomoTotalSeconds);
}
function playBeep(){
  if(!state.settings.sound) return;
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; g.gain.value = 0.15;
    o.start(); setTimeout(()=>{ o.stop(); ctx.close(); }, 300);
  }catch(e){}
}
function completePomodoro(){
  clearInterval(pomoInterval); pomoInterval=null; pomoRunning=false;
  playBeep();
  state.pomodoro.sessions.push({date:todayISO(), minutes: Math.round(pomoTotalSeconds/60)});
  saveState();
  renderPomodoroStats();
  showToast("Pomodoro session complete!");
  pomoRemaining = pomoTotalSeconds;
  updateTimerDisplay();
}
function renderPomodoroStats(){
  const today = todayISO();
  const todaySessions = state.pomodoro.sessions.filter(s=>s.date===today);
  
  const pToday = document.getElementById("pomo-today");
  if(pToday) pToday.textContent = todaySessions.length;
  const pTotal = document.getElementById("pomo-total");
  if(pTotal) pTotal.textContent = state.pomodoro.sessions.length;
  const pMinutes = document.getElementById("pomo-minutes");
  if(pMinutes) pMinutes.textContent = todaySessions.reduce((a,b)=>a+b.minutes,0);
}

/* ==========================================================
   WATER
   ========================================================== */
function renderWater(){
  const today = todayISO();
  const log = state.water.log[today] || [];
  const total = log.reduce((a,b)=>a+b.amount,0);
  const goal = state.water.goal;
  const pct = Math.min(1, total/goal);
  const circ = 2*Math.PI*88;
  
  const ring = document.getElementById("water-ring-progress");
  if(ring) {
    ring.style.strokeDasharray = circ;
    ring.style.strokeDashoffset = circ*(1-pct);
  }
  const wDisplay = document.getElementById("water-amount-display");
  if(wDisplay) wDisplay.textContent = `${total} ml`;
  const wGoalLabel = document.getElementById("water-goal-label");
  if(wGoalLabel) wGoalLabel.textContent = `of ${goal} ml goal`;
  const wGoalInput = document.getElementById("water-goal-input");
  if(wGoalInput) wGoalInput.value = goal;

  const hist = document.getElementById("water-history");
  if(hist) {
    hist.innerHTML = log.length ? log.slice().reverse().map(e=>`<div class="mini-list-row"><span>${e.time}</span><span>+${e.amount} ml</span></div>`).join("") : `<div class="mini-list-row"><span>No entries yet today</span></div>`;
  }
}

/* ==========================================================
   MOOD
   ========================================================== */
function renderMood(){
  const today = todayISO();
  document.querySelectorAll(".mood-options .mood-btn").forEach(b=>b.classList.toggle("selected", b.dataset.mood===state.mood[today]));
  drawMoodMonthlyChart();
}

/* ==========================================================
   QUOTES
   ========================================================== */
function showQuote(){
  const [text, author] = QUOTES[state.quoteIndex % QUOTES.length];
  const qText = document.getElementById("quote-text");
  if(qText) qText.textContent = `"${text}"`;
  const qAuthor = document.getElementById("quote-author");
  if(qAuthor) qAuthor.textContent = `— ${author}`;
}

/* ==========================================================
   PROFILE
   ========================================================== */
function renderProfile(){
  const u = state.user;
  const pName = document.getElementById("profile-name");
  if(pName) pName.value = u.name|| "";
  const pAge = document.getElementById("profile-age");
  if(pAge) pAge.value = u.age||"";
  const pOcc = document.getElementById("profile-occupation");
  if(pOcc) pOcc.value = u.occupation||"";
  const pLoc = document.getElementById("profile-location");
  if(pLoc) pLoc.value = u.location||"";
  const pBio = document.getElementById("profile-bio");
  if(pBio) pBio.value = u.bio||"";
  
  const pic = document.getElementById("profile-pic-preview");
  if(pic) pic.innerHTML = u.pic ? `<img src="${u.pic}">` : (u.name ? u.name[0].toUpperCase() : "U");
}
function updateSidebarUser(){
  const username = document.getElementById("sidebar-username");
  if(username) username.textContent = state.user.name || "User";
  const avatar = document.getElementById("sidebar-avatar");
  if(avatar) avatar.innerHTML = state.user.pic ? `<img src="${state.user.pic}">` : (state.user.name ? state.user.name[0].toUpperCase() : "U");
}

/* ==========================================================
   ANALYTICS (Canvas Charts)
   ========================================================== */
function roundRect(ctx,x,y,w,h,r){
  if(h<=0) h=0.001;
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
function drawBarChart(canvas, labels, values, color){
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w*dpr; canvas.height = h*dpr;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,w,h);
  const max = Math.max(1, ...values);
  const padding = 24, bottomPad = 22;
  const chartH = h - padding - bottomPad;
  const barW = (w - padding*2) / values.length * 0.6;
  const gap = (w - padding*2) / values.length;
  ctx.font = "11px Inter, sans-serif";
  values.forEach((v,i)=>{
    const barH = (v/max) * chartH;
    const x = padding + i*gap + (gap-barW)/2;
    const y = h - bottomPad - barH;
    const grad = ctx.createLinearGradient(0,y,0,h-bottomPad);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color+"33");
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, barW, barH, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(170,170,170,0.9)";
    ctx.textAlign = "center";
    ctx.fillText(labels[i], x+barW/2, h-6);
  });
}
function drawLineChart(canvas, labels, values, color){
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w*dpr; canvas.height = h*dpr;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,w,h);
  const max = Math.max(1, ...values);
  const padding = 24, bottomPad = 22;
  const chartH = h - padding - bottomPad;
  const stepX = (w-padding*2) / Math.max(1,values.length-1);
  ctx.beginPath();
  values.forEach((v,i)=>{
    const x = padding + i*stepX;
    const y = h - bottomPad - (v/max)*chartH;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin="round"; ctx.stroke();
  values.forEach((v,i)=>{
    const x = padding + i*stepX;
    const y = h - bottomPad - (v/max)*chartH;
    ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2); ctx.fillStyle=color; ctx.fill();
  });
  ctx.font = "11px Inter, sans-serif"; ctx.fillStyle="rgba(170,170,170,0.9)"; ctx.textAlign="center";
  labels.forEach((l,i)=>{ ctx.fillText(l, padding+i*stepX, h-6); });
}
function renderAnalytics(){
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || "#4F8CFF";
  const week = last7Days();
  const dayLabels = week.map(d=> new Date(d+"T00:00:00").toLocaleDateString(undefined,{weekday:'short'}));

  const tasksByDay = week.map(d=> state.tasks.filter(t=>{
    const created = new Date(t.createdAt); const cKey = created.getFullYear()+"-"+String(created.getMonth()+1).padStart(2,"0")+"-"+String(created.getDate()).padStart(2,"0");
    return cKey===d && t.completed;
  }).length);
  drawBarChart(document.getElementById("chart-tasks"), dayLabels, tasksByDay, accent);

  const habitByDay = week.map(d=>{
    if(!state.habits.length) return 0;
    return Math.round(state.habits.filter(h=>h.history[d]).length / state.habits.length * 100);
  });
  drawBarChart(document.getElementById("chart-habits"), dayLabels, habitByDay, accent);

  const pomoByDay = week.map(d=> state.pomodoro.sessions.filter(s=>s.date===d).length);
  drawBarChart(document.getElementById("chart-pomodoro"), dayLabels, pomoByDay, accent);

  const waterByDay = week.map(d=> (state.water.log[d]||[]).reduce((a,b)=>a+b.amount,0));
  drawLineChart(document.getElementById("chart-water"), dayLabels, waterByDay, accent);

  const moodScale = {Excellent:5, Good:4, Normal:3, Bad:2, Terrible:1};
  const moodByDay = week.map(d=> moodScale[state.mood[d]] || 0);
  drawLineChart(document.getElementById("chart-mood"), dayLabels, moodByDay, accent);

  const monthDays = [];
  for(let i=29;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); monthDays.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")); }
  const weekTotal = tasksByDay.reduce((a,b)=>a+b,0);
  const monthTotal = monthDays.reduce((sum,d)=> sum + state.tasks.filter(t=>{
    const created = new Date(t.createdAt); const cKey = created.getFullYear()+"-"+String(created.getMonth()+1).padStart(2,"0")+"-"+String(created.getDate()).padStart(2,"0");
    return cKey===d && t.completed;
  }).length, 0);
  drawBarChart(document.getElementById("chart-productivity"), ["This Week","This Month"], [weekTotal, monthTotal], accent);
}
function drawMoodMonthlyChart(){
  const chartEl = document.getElementById("chart-mood-monthly");
  if(!chartEl) return;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || "#4F8CFF";
  const monthDays = [];
  for(let i=29;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); monthDays.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")); }
  const moodScale = {Excellent:5, Good:4, Normal:3, Bad:2, Terrible:1};
  const values = monthDays.map(d=> moodScale[state.mood[d]] || 0);
  const labels = monthDays.map((d,i)=> i%5===0 ? new Date(d+"T00:00:00").getDate().toString() : "");
  drawLineChart(chartEl, labels, values, accent);
}
window.addEventListener("resize", ()=>{
  const activeView = document.querySelector(".view.active");
  if(activeView && activeView.id === "view-analytics") renderAnalytics();
  if(activeView && activeView.id === "view-mood") drawMoodMonthlyChart();
});

/* ==========================================================
   GLOBAL SEARCH
   ========================================================== */
function runGlobalSearch(query){
  query = query.toLowerCase().trim();
  const results = [];
  if(!query) return results;
  state.tasks.forEach(t=>{ if(t.title.toLowerCase().includes(query)) results.push({type:"Task", label:t.title, view:"tasks"}); });
  state.habits.forEach(h=>{ if(h.name.toLowerCase().includes(query)) results.push({type:"Habit", label:h.name, view:"habits"}); });
  state.goals.forEach(g=>{ if(g.title.toLowerCase().includes(query)) results.push({type:"Goal", label:g.title, view:"goals"}); });
  state.notes.forEach(n=>{ if((n.title+n.content).toLowerCase().includes(query)) results.push({type:"Note", label:n.title, view:"notes"}); });
  state.journal.forEach(j=>{ if((j.title+j.content).toLowerCase().includes(query)) results.push({type:"Journal", label:j.title, view:"journal"}); });
  return results;
}

/* ==========================================================
   UTIL
   ========================================================== */
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[s]));
}
function escapeAttr(str){ return escapeHtml(str); }

/* ==========================================================
   ONBOARDING FLOW
   ========================================================== */
function startOnboarding(){
  setTimeout(()=>{
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.style.opacity = "0";
      setTimeout(()=>{
        loadingScreen.classList.add("hidden");
        if(state.onboarded){
          launchApp();
        } else {
          const welcomeScreen = document.getElementById("welcome-screen");
          if (welcomeScreen) welcomeScreen.classList.remove("hidden");
        }
      }, 600);
    }
  }, 2500);
}
function submitName(){
  const nameInput = document.getElementById("name-input");
  const name = nameInput ? nameInput.value.trim() : "";
  if(!name){ showToast("Please enter your name"); return; }
  state.user.name = name;
  state.onboarded = true;
  saveState();
  const nameScreen = document.getElementById("name-screen");
  if(nameScreen) nameScreen.classList.add("hidden");
  launchApp();
}
function launchApp(){
  const appShell = document.getElementById("app-shell");
  if(appShell) appShell.classList.remove("hidden");
  applySettings();
  updateSidebarUser();
  renderIcons();
  updateClock();
  setInterval(updateClock, 1000);
  showQuote();
  goToView("dashboard");
  updateTimerDisplay();
  setRing(0);
}

/* ==========================================================
   SAFE INITIALIZATION DECLARATION
   ========================================================== */
function initEventListeners() {
  // TASKS
  const addTaskBtn = document.getElementById("add-task-btn");
  if (addTaskBtn) addTaskBtn.addEventListener("click", ()=>taskModal(null));
  
  ["task-search","task-filter","task-sort"].forEach(id=>{
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", renderTasks);
      el.addEventListener("change", renderTasks);
    }
  });
  
  const taskList = document.getElementById("task-list");
  if (taskList) taskList.addEventListener("click", async (e)=>{
    const check = e.target.closest("[data-check]");
    const edit = e.target.closest("[data-edit-task]");
    const del = e.target.closest("[data-del-task]");
    if(check){
      const t = state.tasks.find(t=>t.id===check.dataset.check);
      if(t) { t.completed = !t.completed; saveState(); renderTasks(); }
    } else if(edit){
      taskModal(state.tasks.find(t=>t.id===edit.dataset.editTask));
    } else if(del){
      const ok = await confirmDialog("Delete this task permanently?");
      if(ok){ state.tasks = state.tasks.filter(t=>t.id!==del.dataset.delTask); saveState(); renderTasks(); showToast("Task deleted"); }
    }
  });

  // HABITS
  const addHabitBtn = document.getElementById("add-habit-btn");
  if (addHabitBtn) addHabitBtn.addEventListener("click", habitModal);
  
  const habitList = document.getElementById("habit-list");
  if (habitList) habitList.addEventListener("click", async (e)=>{
    const check = e.target.closest("[data-check-habit]");
    const del = e.target.closest("[data-del-habit]");
    if(check){
      const h = state.habits.find(h=>h.id===check.dataset.checkHabit);
      if(h) {
        const today = todayISO();
        h.history[today] = !h.history[today];
        saveState(); renderHabits();
      }
    } else if(del){
      const ok = await confirmDialog("Delete this habit and its history?");
      if(ok){ state.habits = state.habits.filter(h=>h.id!==del.dataset.delHabit); saveState(); renderHabits(); showToast("Habit deleted"); }
    }
  });

  // GOALS
  const addGoalBtn = document.getElementById("add-goal-btn");
  if (addGoalBtn) addGoalBtn.addEventListener("click", goalModal);
  
  const goalList = document.getElementById("goal-list");
  if (goalList) {
    goalList.addEventListener("click", async (e)=>{
      const del = e.target.closest("[data-del-goal]");
      if(del){
        const ok = await confirmDialog("Delete this goal?");
        if(ok){ state.goals = state.goals.filter(g=>g.id!==del.dataset.delGoal); saveState(); renderGoals(); showToast("Goal deleted"); }
      }
    });
    goalList.addEventListener("change", (e)=>{
      const cb = e.target.closest("[data-milestone]");
      if(cb){
        const goal = state.goals.find(g=>g.id===cb.dataset.goal);
        if(goal) {
          const m = goal.milestones.find(m=>m.id===cb.dataset.milestone);
          if(m) { m.done = cb.checked; saveState(); renderGoals(); }
        }
      }
    });
  }

  // CALENDAR
  const calPrev = document.getElementById("cal-prev");
  if (calPrev) calPrev.addEventListener("click", ()=>{ calViewDate.setMonth(calViewDate.getMonth()-1); renderCalendar(); });
  const calNext = document.getElementById("cal-next");
  if (calNext) calNext.addEventListener("click", ()=>{ calViewDate.setMonth(calViewDate.getMonth()+1); renderCalendar(); });
  const calGrid = document.getElementById("calendar-grid");
  if (calGrid) calGrid.addEventListener("click", (e)=>{
    const cell = e.target.closest(".cal-cell[data-date]");
    if(cell){ calSelectedDate = cell.dataset.date; renderCalendar(); }
  });

  // NOTES
  const addNoteBtn = document.getElementById("add-note-btn");
  if (addNoteBtn) addNoteBtn.addEventListener("click", ()=>noteModal(null));
  ["note-search","note-category-filter"].forEach(id=>{
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", renderNotes);
      el.addEventListener("change", renderNotes);
    }
  });
  const noteList = document.getElementById("note-list");
  if (noteList) noteList.addEventListener("click", (e)=>{
    const pin = e.target.closest("[data-pin-note]");
    if(pin){
      const n = state.notes.find(n=>n.id===pin.dataset.pinNote);
      if(n) { n.pinned = !n.pinned; saveState(); renderNotes(); }
      return;
    }
    const card = e.target.closest("[data-note]");
    if(card){ noteModal(state.notes.find(n=>n.id===card.dataset.note)); }
  });

  // JOURNAL
  const addJournalBtn = document.getElementById("add-journal-btn");
  if (addJournalBtn) addJournalBtn.addEventListener("click", journalModal);
  const journalSearch = document.getElementById("journal-search");
  if (journalSearch) journalSearch.addEventListener("input", renderJournal);
  const journalList = document.getElementById("journal-list");
  if (journalList) journalList.addEventListener("click", async (e)=>{
    const del = e.target.closest("[data-del-journal]");
    if(del){
      const ok = await confirmDialog("Delete this journal entry?");
      if(ok){ state.journal = state.journal.filter(j=>j.id!==del.dataset.delJournal); saveState(); renderJournal(); showToast("Entry deleted"); }
    }
  });

  // POMODORO
  const timerStart = document.getElementById("timer-start");
  if (timerStart) timerStart.addEventListener("click", () => {
    if(pomoRunning) return;
    pomoRunning = true;
    pomoInterval = setInterval(()=>{
      pomoRemaining--;
      updateTimerDisplay();
      if(pomoRemaining<=0) completePomodoro();
    }, 1000);
  });
  const timerPause = document.getElementById("timer-pause");
  if (timerPause) timerPause.addEventListener("click", ()=>{
    pomoRunning = false; clearInterval(pomoInterval); pomoInterval=null;
  });
  const timerReset = document.getElementById("timer-reset");
  if (timerReset) timerReset.addEventListener("click", ()=>{
    pomoRunning=false; clearInterval(pomoInterval); pomoInterval=null;
    pomoRemaining = pomoTotalSeconds; updateTimerDisplay();
  });
  const timerMute = document.getElementById("timer-mute");
  if (timerMute) timerMute.addEventListener("click", ()=>{
    state.settings.sound = !state.settings.sound; saveState();
    showToast(state.settings.sound ? "Sound on" : "Sound muted");
    applySettings();
  });
  document.querySelectorAll(".mode-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".mode-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const customRow = document.getElementById("custom-timer-row");
      if(btn.dataset.mins === "custom"){
        if (customRow) customRow.classList.remove("hidden");
      } else {
        if (customRow) customRow.classList.add("hidden");
        pomoRunning=false; clearInterval(pomoInterval); pomoInterval=null;
        pomoTotalSeconds = parseInt(btn.dataset.mins)*60;
        pomoRemaining = pomoTotalSeconds;
        updateTimerDisplay();
      }
    });
  });
  const setCustomTimer = document.getElementById("set-custom-timer");
  if (setCustomTimer) setCustomTimer.addEventListener("click", ()=>{
    const minutesInput = document.getElementById("custom-minutes");
    const val = minutesInput ? parseInt(minutesInput.value) : 0;
    if(!val || val<1){ showToast("Enter a valid number of minutes"); return; }
    pomoRunning=false; clearInterval(pomoInterval); pomoInterval=null;
    pomoTotalSeconds = val*60; pomoRemaining = pomoTotalSeconds;
    updateTimerDisplay();
  });

  // WATER
  document.querySelectorAll(".water-buttons [data-add]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const today = todayISO();
      if(!state.water.log[today]) state.water.log[today] = [];
      state.water.log[today].push({amount: parseInt(btn.dataset.add), time: new Date().toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})});
      saveState(); renderWater();
    });
  });
  const waterGoalInput = document.getElementById("water-goal-input");
  if (waterGoalInput) waterGoalInput.addEventListener("change", (e)=>{
    const v = parseInt(e.target.value);
    if(v && v>0){ state.water.goal = v; saveState(); renderWater(); }
  });
  const waterReset = document.getElementById("water-reset");
  if (waterReset) waterReset.addEventListener("click", async ()=>{
    const ok = await confirmDialog("Reset today's water log?");
    if(ok){ state.water.log[todayISO()] = []; saveState(); renderWater(); showToast("Water log reset"); }
  });

  // MOOD
  document.querySelectorAll(".mood-options .mood-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      state.mood[todayISO()] = btn.dataset.mood;
      saveState(); renderMood(); showToast("Mood recorded: "+btn.dataset.mood);
    });
  });

  // QUOTES
  const newQuoteBtn = document.getElementById("new-quote-btn");
  if (newQuoteBtn) newQuoteBtn.addEventListener("click", ()=>{
    let next;
    do{ next = Math.floor(Math.random()*QUOTES.length); } while(next === state.quoteIndex % QUOTES.length && QUOTES.length>1);
    state.quoteIndex = next; saveState(); showQuote();
  });

  // PROFILE
  const profilePicInput = document.getElementById("profile-pic-input");
  if (profilePicInput) profilePicInput.addEventListener("change", (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      state.user.pic = reader.result;
      saveState(); renderProfile(); updateSidebarUser();
    };
    reader.readAsDataURL(file);
  });
  const saveProfileBtn = document.getElementById("save-profile-btn");
  if (saveProfileBtn) saveProfileBtn.addEventListener("click", ()=>{
    const pName = document.getElementById("profile-name");
    const pAge = document.getElementById("profile-age");
    const pOcc = document.getElementById("profile-occupation");
    const pLoc = document.getElementById("profile-location");
    const pBio = document.getElementById("profile-bio");
    
    state.user.name = pName ? (pName.value.trim() || state.user.name) : state.user.name;
    state.user.age = pAge ? pAge.value : state.user.age;
    state.user.occupation = pOcc ? pOcc.value.trim() : state.user.occupation;
    state.user.location = pLoc ? pLoc.value.trim() : state.user.location;
    state.user.bio = pBio ? pBio.value.trim() : state.user.bio;
    saveState(); updateSidebarUser(); showToast("Profile saved");
  });

  // SETTINGS
  document.querySelectorAll("#theme-segmented button").forEach(btn=>{
    btn.addEventListener("click", ()=>{ state.settings.theme = btn.dataset.theme; saveState(); applySettings(); });
  });
  document.querySelectorAll("#accent-swatches .swatch").forEach(btn=>{
    btn.addEventListener("click", ()=>{ state.settings.accent = btn.dataset.accent; saveState(); applySettings(); });
  });
  
  const fontFamSelect = document.getElementById("font-family-select");
  if (fontFamSelect) fontFamSelect.addEventListener("change", (e)=>{ state.settings.fontFamily = e.target.value; saveState(); applySettings(); });
  const fontSizeRange = document.getElementById("font-size-range");
  if (fontSizeRange) fontSizeRange.addEventListener("input", (e)=>{ state.settings.fontSize = parseInt(e.target.value); saveState(); applySettings(); });
  const animSpeedRange = document.getElementById("anim-speed-range");
  if (animSpeedRange) animSpeedRange.addEventListener("input", (e)=>{ state.settings.animSpeed = parseInt(e.target.value); saveState(); applySettings(); });
  const blurRange = document.getElementById("blur-range");
  if (blurRange) blurRange.addEventListener("input", (e)=>{ state.settings.blur = parseInt(e.target.value); saveState(); applySettings(); });
  
  const toggleNotif = document.getElementById("toggle-notifications");
  if (toggleNotif) toggleNotif.addEventListener("change", (e)=>{ state.settings.notifications = e.target.checked; saveState(); });
  const toggleSound = document.getElementById("toggle-sound");
  if (toggleSound) toggleSound.addEventListener("change", (e)=>{ state.settings.sound = e.target.checked; saveState(); });
  const toggleAutosave = document.getElementById("toggle-autosave");
  if (toggleAutosave) toggleAutosave.addEventListener("change", (e)=>{ state.settings.autosave = e.target.checked; saveState(); });

  const exportDataBtn = document.getElementById("export-data-btn");
  if (exportDataBtn) exportDataBtn.addEventListener("click", ()=>{
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "invicta-planner-backup.json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast("Data exported");
  });
  const importDataInput = document.getElementById("import-data-input");
  if (importDataInput) importDataInput.addEventListener("change", (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async ()=>{
      try{
        const imported = JSON.parse(reader.result);
        const ok = await confirmDialog("Import this backup? Current data will be replaced.");
        if(ok){
          state = Object.assign(defaultState(), imported);
          saveState(); applySettings(); updateSidebarUser(); goToView("dashboard");
          showToast("Data imported successfully");
        }
      }catch(err){ showToast("Invalid backup file"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  });
  const resetAppBtn = document.getElementById("reset-app-btn");
  if (resetAppBtn) resetAppBtn.addEventListener("click", async ()=>{
    const ok = await confirmDialog("This will permanently erase all your data. Continue?");
    if(ok){
      localStorage.removeItem(LS_KEY);
      location.reload();
    }
  });
  const resetSettingsBtn = document.getElementById("reset-settings-btn");
  if (resetSettingsBtn) resetSettingsBtn.addEventListener("click", async ()=>{
    const ok = await confirmDialog("Reset all settings to default?");
    if(ok){
      state.settings = defaultState().settings;
      saveState(); applySettings(); showToast("Settings reset");
    }
  });

  // GLOBAL SEARCH
  const globalSearch = document.getElementById("global-search");
  if (globalSearch) globalSearch.addEventListener("input", (e)=>{
    const results = runGlobalSearch(e.target.value);
    const overlay = document.getElementById("search-overlay");
    const box = document.getElementById("search-results");
    if(!e.target.value.trim()){ if(overlay) overlay.classList.add("hidden"); return; }
    if(overlay) overlay.classList.remove("hidden");
    if(box) box.innerHTML = results.length ? results.map(r=>`<div class="search-result-row" data-view="${r.view}"><span>${escapeHtml(r.label)}</span><span class="search-result-tag">${r.type}</span></div>`).join("") : `<div class="search-result-row"><span>No results found</span></div>`;
  });
  const closeSearch = document.getElementById("close-search");
  if (closeSearch) closeSearch.addEventListener("click", ()=> {
    const overlay = document.getElementById("search-overlay");
    if(overlay) overlay.classList.add("hidden");
  });
  const searchOverlay = document.getElementById("search-overlay");
  if (searchOverlay) searchOverlay.addEventListener("click", (e)=>{
    if(e.target.id === "search-overlay") e.currentTarget.classList.add("hidden");
  });
  const searchResults = document.getElementById("search-results");
  if (searchResults) searchResults.addEventListener("click", (e)=>{
    const row = e.target.closest("[data-view]");
    if(row){ 
      const overlay = document.getElementById("search-overlay");
      if(overlay) overlay.classList.add("hidden"); 
      const gSearch = document.getElementById("global-search");
      if(gSearch) gSearch.value=""; 
      goToView(row.dataset.view); 
    }
  });

  // NAV WIRING
  document.querySelectorAll(".nav-item").forEach(item=>{
    item.addEventListener("click", ()=> goToView(item.dataset.view));
  });
  const sidebarToggle = document.getElementById("sidebar-toggle");
  if (sidebarToggle) sidebarToggle.addEventListener("click", ()=>{
    const sidebar = document.getElementById("sidebar");
    if(sidebar) sidebar.classList.toggle("collapsed");
  });

  // ONBOARDING FLOW
  const getStartedBtn = document.getElementById("get-started-btn");
  if (getStartedBtn) getStartedBtn.addEventListener("click", ()=> {
    const welcomeScreen = document.getElementById("welcome-screen");
    if(welcomeScreen) welcomeScreen.classList.add("hidden");
    const nameScreen = document.getElementById("name-screen");
    if(nameScreen) nameScreen.classList.remove("hidden");
    const nameInput = document.getElementById("name-input");
    if(nameInput) nameInput.focus();
  });
  const nameContinueBtn = document.getElementById("name-continue-btn");
  if (nameContinueBtn) nameContinueBtn.addEventListener("click", submitName);
  const nameInput = document.getElementById("name-input");
  if (nameInput) nameInput.addEventListener("keydown", (e)=>{ if(e.key==="Enter") submitName(); });
}

/* ==========================================================
   BOOT
   ========================================================== */
function bootApp() {
  initEventListeners();
  renderIcons();
  startOnboarding();
}

// Robust fallback handling whether window is already interactive/loaded or currently loading.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootApp);
} else {
  bootApp();
}

})();
