/* ============================================================
   Imposter Who? — app logic
   This stage: PWA scaffold + Home and Setup screens.
   The game model (assign teams / imposters / word) is built on
   Start so the card-deal screen can pick it up next.
   ============================================================ */

"use strict";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "imposter.names.v1";
const REMEMBER_KEY = "imposter.remember.v1";
const CUSTOM_KEY = "imposter.customcats.v1";

/* ---------- state ---------- */
const S = {
  mode: "classic",        // "classic" | "team"
  category: "random",
  names: [],
  imposterCount: 1,
  teamCount: 3,
  remember: false,
  secretVote: false,      // pass-the-phone private ballot

  // built on Start (consumed by the deal/vote flow in game.js)
  game: null,
};

/* ---------- word bank, including user-made categories ---------- */
const customCats = {};    // name -> [{ word, clues }]
function effectiveBank() { return Object.assign({}, BANK, customCats); }
function effectiveCategories() { return Object.keys(effectiveBank()); }

/* ---------- safe storage (game must work without it) ---------- */
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, val) { try { localStorage.setItem(key, val); } catch { /* ignore */ } },
  del(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
};

/* ---------- utilities ---------- */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function maxImposters(playerCount) {
  // innocents must always outnumber imposters
  return Math.max(1, Math.floor((playerCount - 1) / 2));
}

/* ---------- screen router ---------- */
const IN_GAME = new Set(["s-deal", "s-vote", "s-secretvote", "s-reveal"]);
function show(id) {
  const target = $(id);
  if (!target) return;
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("is-active"));
  target.classList.add("is-active");
  const scroll = target.querySelector(".screen-scroll");
  if (scroll) scroll.scrollTop = 0;
  $("quitBtn").hidden = !IN_GAME.has(id);
  if (!IN_GAME.has(id)) $("topbarMeta").textContent = "";
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  let el = $("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.style.cssText =
      "position:fixed;left:50%;bottom:calc(28px + env(safe-area-inset-bottom,0px));" +
      "transform:translateX(-50%);background:#27205a;color:#f5f3ff;border:1px solid rgba(255,255,255,.18);" +
      "padding:13px 18px;border-radius:14px;font-size:14px;font-weight:600;z-index:200;max-width:88%;" +
      "text-align:center;box-shadow:0 14px 34px rgba(0,0,0,.5);opacity:0;transition:opacity .2s,transform .2s";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => { el.style.opacity = "1"; el.style.transform = "translateX(-50%) translateY(0)"; });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = "0"; }, 2400);
}

/* ============================================================
   HOME
   ============================================================ */
const MODE_HINTS = {
  classic: "No teams — imposters hide among everyone. You choose how many. A wrong vote still eliminates an innocent.",
  team: "Hidden teams. One imposter hidden in each team — you know your team, never who else is on it. Last team with an uncaught imposter wins.",
};

function setMode(mode) {
  S.mode = mode;
  document.querySelectorAll("#modeSeg button").forEach((b) => {
    const on = b.dataset.mode === mode;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });
  $("modeHint").textContent = MODE_HINTS[mode];
}

function fillCategories(selected) {
  const sel = $("categorySel");
  const current = selected || sel.value || "random";
  // wipe everything except the leading "random" option
  sel.querySelectorAll('optgroup, option:not([value="random"])').forEach((n) => n.remove());

  const mkOpt = (c) => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    return o;
  };
  CATEGORIES.forEach((c) => sel.appendChild(mkOpt(c)));

  const customKeys = Object.keys(customCats);
  if (customKeys.length) {
    const og = document.createElement("optgroup");
    og.label = "Your categories";
    customKeys.forEach((c) => og.appendChild(mkOpt(c)));
    sel.appendChild(og);
  }

  // restore selection if it still exists, else fall back to random
  sel.value = [...sel.options].some((o) => o.value === current) ? current : "random";
}

function setSound(on) {
  Sound.setMuted(!on);
  $("soundToggle").classList.toggle("is-on", on);
  $("soundBar").setAttribute("aria-checked", on ? "true" : "false");
  $("soundIcon").textContent = on ? "🔊" : "🔇";
}

function setSecret(on) {
  S.secretVote = on;
  $("secretToggle").classList.toggle("is-on", on);
  $("secretBar").setAttribute("aria-checked", on ? "true" : "false");
}

function initHome() {
  setMode(S.mode);
  loadCustomCats();
  fillCategories();
  setSound(true);   // default on
  setSecret(false); // default off

  $("modeSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) setMode(b.dataset.mode);
  });
  $("soundBar").addEventListener("click", () => {
    const on = Sound.isMuted(); // about to flip
    Sound.unlock();
    setSound(on);
  });
  $("secretBar").addEventListener("click", () => setSecret(!S.secretVote));
  $("newCatBtn").addEventListener("click", openCustomModal);
  initCustomModal();

  $("homeContinue").addEventListener("click", () => {
    S.category = $("categorySel").value;
    goSetup();
  });
}

/* ============================================================
   CUSTOM CATEGORIES (create / save / delete)
   ============================================================ */
function loadCustomCats() {
  let raw;
  try { raw = JSON.parse(store.get(CUSTOM_KEY) || "{}"); } catch { raw = {}; }
  if (!raw || typeof raw !== "object") return;
  Object.entries(raw).forEach(([name, entries]) => {
    if (!Array.isArray(entries)) return;
    const clean = entries
      .filter((e) => e && typeof e.word === "string" && Array.isArray(e.clues) && e.clues.length)
      .map((e) => ({ word: e.word, clues: e.clues.filter((c) => typeof c === "string" && c.trim()) }))
      .filter((e) => e.clues.length);
    if (clean.length) customCats[name] = clean;
  });
}

function saveCustomCats() { store.set(CUSTOM_KEY, JSON.stringify(customCats)); }

/** Build a vague clue pool for a word from its sibling words. */
function autoCluePool(word, allWords) {
  const sibs = allWords.filter((w) => w.toLowerCase() !== word.toLowerCase());
  const pool = shuffle(sibs).slice(0, 4);
  return pool.length ? pool : ["mystery", "secret", "hidden", "vague"];
}

/** Parse the textarea into [{word, clues}] entries (clues auto-filled). */
function parseCustomEntries(text) {
  const seen = new Set();
  const raw = [];
  text.split(/\n/).forEach((line) => {
    const t = line.trim();
    if (!t) return;
    let word = t, clues = [];
    const ci = t.indexOf(":");
    if (ci > -1) {
      word = t.slice(0, ci).trim();
      clues = t.slice(ci + 1).split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (!word) return;
    const key = word.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    raw.push({ word, clues });
  });

  const allWords = raw.map((r) => r.word);
  return raw.map((r) => {
    let clues = r.clues.filter((c) => c.toLowerCase() !== r.word.toLowerCase());
    if (!clues.length) clues = autoCluePool(r.word, allWords);
    return { word: r.word, clues };
  });
}

function openCustomModal() {
  $("customName").value = "";
  $("customWords").value = "";
  $("customWarn").hidden = true;
  renderCustomManage();
  $("customModal").hidden = false;
  setTimeout(() => $("customName").focus(), 50);
}

function renderCustomManage() {
  const box = $("customManage");
  box.innerHTML = "";
  const keys = Object.keys(customCats);
  if (!keys.length) return;
  keys.forEach((name) => {
    const row = document.createElement("div");
    row.className = "cuscat";
    const label = document.createElement("span");
    label.textContent = `${name} · ${customCats[name].length} words`;
    const del = document.createElement("button");
    del.type = "button";
    del.className = "cuscat-del";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteCustomCat(name));
    row.append(label, del);
    box.appendChild(row);
  });
}

function deleteCustomCat(name) {
  delete customCats[name];
  saveCustomCats();
  fillCategories();
  renderCustomManage();
}

function saveCustomCat() {
  const name = $("customName").value.trim().replace(/\s+/g, " ");
  const entries = parseCustomEntries($("customWords").value);
  const warn = $("customWarn");
  let msg = "";

  if (!name) msg = "Give your category a name.";
  else if (CATEGORIES.some((c) => c.toLowerCase() === name.toLowerCase())) msg = "That name matches a built-in category — pick another.";
  else if (Object.keys(customCats).some((c) => c.toLowerCase() === name.toLowerCase())) msg = "You already have a category with that name.";
  else if (entries.length < 4) msg = "Add at least 4 words (one per line).";

  if (msg) { warn.textContent = msg; warn.hidden = false; return; }

  customCats[name] = entries;
  saveCustomCats();
  fillCategories(name);
  $("customModal").hidden = true;
  toast(`Saved "${name}" · ${entries.length} words`);
}

function initCustomModal() {
  $("customSave").addEventListener("click", saveCustomCat);
  $("customCancel").addEventListener("click", () => { $("customModal").hidden = true; });
}

/* ============================================================
   SETUP
   ============================================================ */
function goSetup() {
  $("classicSetup").hidden = S.mode !== "classic";
  $("teamSetup").hidden = S.mode !== "team";
  renderNames();
  renderImposterStepper();
  renderTeamStepper();
  validate();
  show("s-setup");
}

function renderNames() {
  const list = $("nameList");
  list.innerHTML = "";
  S.names.forEach((name, i) => {
    const chip = document.createElement("div");
    chip.className = "namechip";
    const label = document.createElement("span");
    label.textContent = name;
    const del = document.createElement("button");
    del.type = "button";
    del.setAttribute("aria-label", `Remove ${name}`);
    del.textContent = "✕";
    del.addEventListener("click", () => delName(i));
    chip.append(label, del);
    list.appendChild(chip);
  });
  const n = S.names.length;
  $("nameCount").textContent = n ? `${n} player${n === 1 ? "" : "s"}` : "";
  $("nameEmpty").hidden = n > 0;
}

function addName() {
  const input = $("nameInput");
  const value = input.value.trim().replace(/\s+/g, " ");
  if (!value) return;
  // gentle de-dupe (case-insensitive)
  const exists = S.names.some((x) => x.toLowerCase() === value.toLowerCase());
  if (exists) { toast(`"${value}" is already in.`); input.select(); return; }
  S.names.push(value);
  input.value = "";
  input.focus();
  persistNames();
  renderNames();
  clampCounts();
  validate();
}

function delName(i) {
  S.names.splice(i, 1);
  persistNames();
  renderNames();
  clampCounts();
  validate();
}

function persistNames() {
  if (S.remember) store.set(STORAGE_KEY, JSON.stringify(S.names));
}

function setRemember(on) {
  S.remember = on;
  $("rememberToggle").classList.toggle("is-on", on);
  $("rememberBar").setAttribute("aria-checked", on ? "true" : "false");
  store.set(REMEMBER_KEY, on ? "1" : "0");
  if (on) persistNames();
  else store.del(STORAGE_KEY);
}

/* counts ----------------------------------------------------- */
function clampCounts() {
  S.imposterCount = clamp(S.imposterCount, 1, maxImposters(S.names.length));
  S.teamCount = Math.max(2, S.teamCount);
  renderImposterStepper();
  renderTeamStepper();
}

function renderImposterStepper() {
  const maxImp = maxImposters(S.names.length);
  $("impCount").textContent = S.imposterCount;
  $("impStepper").querySelector('[data-step="-1"]').disabled = S.imposterCount <= 1;
  $("impStepper").querySelector('[data-step="1"]').disabled = S.imposterCount >= maxImp;
  $("impHelp").textContent = S.names.length >= 3
    ? `With ${S.names.length} players you can have up to ${maxImp} imposter${maxImp === 1 ? "" : "s"}.`
    : "Add at least 3 players.";
}

function renderTeamStepper() {
  const n = S.names.length;
  const maxTeams = Math.max(2, Math.floor(n / 3));
  $("teamCount").textContent = S.teamCount;
  $("teamStepper").querySelector('[data-step="-1"]').disabled = S.teamCount <= 2;
  $("teamStepper").querySelector('[data-step="1"]').disabled = S.teamCount >= maxTeams;
  const perTeam = Math.floor(n / S.teamCount);
  $("teamHelp").textContent = n >= 6
    ? `Roughly ${perTeam} per team. Each team needs at least 3 — one is a hidden imposter.`
    : "Add at least 6 players for team mode.";
}

/* validation ------------------------------------------------- */
function validate() {
  const warn = $("setupWarn");
  const start = $("startBtn");
  const n = S.names.length;
  let msg = "";

  if (S.mode === "classic") {
    if (n < 3) msg = "Add at least 3 players to start.";
    else if (S.imposterCount > maxImposters(n)) msg = "Too many imposters — innocents must outnumber them.";
  } else {
    if (n < 6) msg = "Team mode needs at least 6 players.";
    else if (S.teamCount < 2) msg = "You need at least 2 teams.";
    else if (Math.floor(n / S.teamCount) < 3) msg = `${n} players into ${S.teamCount} teams leaves fewer than 3 in a team. Use fewer teams.`;
  }

  warn.textContent = msg;
  warn.hidden = !msg;
  start.disabled = !!msg;
}

/* ---------- build the game model on Start ---------- */
function pickWordAndClues() {
  const bank = effectiveBank();
  const cats = effectiveCategories();
  let cat = S.category === "random" ? cats[Math.floor(Math.random() * cats.length)] : S.category;
  // guard: a remembered/selected category that no longer exists → random
  if (!bank[cat] || !bank[cat].length) cat = cats[Math.floor(Math.random() * cats.length)];
  const pool = bank[cat];
  const entry = pool[Math.floor(Math.random() * pool.length)];
  return { category: cat, word: entry.word, clues: shuffle(entry.clues) };
}

function buildGame() {
  const idx = S.names.map((_, i) => i);
  const picked = pickWordAndClues();
  const g = {
    mode: S.mode,
    names: S.names.slice(),
    teams: [],            // array of arrays of player indices
    playerTeam: {},       // playerIndex -> team index
    imposters: new Set(), // player indices
    clue: {},             // playerIndex -> clue word (imposters only)
    word: picked.word,
    category: picked.category,
    alive: new Set(idx),
    caughtTeams: new Set(),
    round: 1,
    sinceWord: 0,
  };

  if (S.mode === "team") {
    const shuffled = shuffle(idx);
    g.teams = Array.from({ length: S.teamCount }, () => []);
    shuffled.forEach((p, k) => {
      const t = k % S.teamCount;
      g.teams[t].push(p);
      g.playerTeam[p] = t;
    });
    // one imposter hidden per team; each gets a different clue
    let ci = 0;
    g.teams.forEach((team) => {
      const imp = team[Math.floor(Math.random() * team.length)];
      g.imposters.add(imp);
      g.clue[imp] = picked.clues[ci++ % picked.clues.length];
    });
  } else {
    g.teams = [idx.slice()];
    idx.forEach((p) => (g.playerTeam[p] = 0));
    const picks = shuffle(idx).slice(0, S.imposterCount);
    picks.forEach((imp, k) => {
      g.imposters.add(imp);
      g.clue[imp] = picked.clues[k % picked.clues.length];
    });
  }

  return g;
}

function startGame() {
  validate();
  if ($("startBtn").disabled) return;
  Sound.unlock(); // unlock audio from this user gesture
  S.game = buildGame();
  beginDeal(); // hand off to the card-deal flow (js/game.js)
}

/* ---------- setup wiring ---------- */
function initSetup() {
  $("addForm").addEventListener("submit", (e) => { e.preventDefault(); addName(); });
  $("setupBack").addEventListener("click", () => show("s-home"));
  $("rememberBar").addEventListener("click", () => setRemember(!S.remember));
  $("startBtn").addEventListener("click", startGame);

  $("impStepper").addEventListener("click", (e) => {
    const b = e.target.closest("[data-step]");
    if (!b) return;
    S.imposterCount = clamp(S.imposterCount + Number(b.dataset.step), 1, maxImposters(S.names.length));
    renderImposterStepper();
    validate();
  });
  $("teamStepper").addEventListener("click", (e) => {
    const b = e.target.closest("[data-step]");
    if (!b) return;
    const maxTeams = Math.max(2, Math.floor(S.names.length / 3));
    S.teamCount = clamp(S.teamCount + Number(b.dataset.step), 2, maxTeams);
    renderTeamStepper();
    validate();
  });
}

/* ============================================================
   QUIT (shared by in-game screens)
   ============================================================ */
function initQuit() {
  $("quitBtn").addEventListener("click", () => { $("quitModal").hidden = false; });
  $("quitCancel").addEventListener("click", () => { $("quitModal").hidden = true; });
  $("quitConfirm").addEventListener("click", () => {
    $("quitModal").hidden = true;
    show("s-home");
  });
}

/* ============================================================
   INIT
   ============================================================ */
function restoreNames() {
  const remembered = store.get(REMEMBER_KEY) === "1";
  if (remembered) {
    S.remember = true;
    $("rememberToggle").classList.add("is-on");
    $("rememberBar").setAttribute("aria-checked", "true");
    try {
      const saved = JSON.parse(store.get(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) S.names = saved.filter((x) => typeof x === "string");
    } catch { /* ignore */ }
  }
}

function init() {
  restoreNames();
  initHome();
  initSetup();
  initQuit();
}

document.addEventListener("DOMContentLoaded", init);
