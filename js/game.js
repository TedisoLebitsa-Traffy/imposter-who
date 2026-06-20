/* ============================================================
   Imposter Who? — in-game flow
   Card deal (pass-the-phone, hold-to-reveal) → vote → reveal
   (drumroll → verdict) → round loop / word swap → winner.

   Reads the model built by app.js on Start (S.game) and the
   shared helpers (show, $, Sound, shuffle, pickWordAndClues, toast).
   ============================================================ */

"use strict";

let dealQueue = [];
let pendingVote = null;

/* ---------- topbar round meta ---------- */
function updateTopbar() {
  const g = S.game;
  if (!g) return;
  $("topbarMeta").textContent = `Round ${g.round}`;
}

/* ============================================================
   CARD DEAL
   ============================================================ */
function beginDeal() {
  const g = S.game;
  if (!g) return;
  dealQueue = [...g.alive];
  show("s-deal");
  dealShow();
}

function dealShow() {
  const g = S.game;
  if (dealQueue.length === 0) { startVote(); return; }
  const p = dealQueue[0];
  $("dealName").textContent = g.names[p];
  $("dealWho").textContent = g.names[p];
  setDealReveal(false);
  const since = g.sinceWord;
  $("dealRound").textContent =
    `Round ${g.round} · ${since} round${since === 1 ? "" : "s"} since the word changed`;
  $("dealNext").textContent = dealQueue.length === 1 ? "Everyone's seen — start round" : "Next player →";
  updateTopbar();
}

function setDealReveal(on) {
  const g = S.game;
  const p = dealQueue[0];
  if (p === undefined) return;
  const card = $("dealCard");
  if (on) {
    const isImp = g.imposters.has(p);
    const teamEl = $("revealTeam");
    if (g.mode === "team") {
      teamEl.hidden = false;
      teamEl.textContent = `Team ${g.playerTeam[p] + 1}`;
    } else {
      teamEl.hidden = true;
    }
    $("revealRole").textContent = isImp ? "Your clue word" : "The secret word";
    $("revealWord").textContent = isImp ? g.clue[p] : g.word;
    $("dealFront").hidden = true;
    $("dealBack").hidden = false;
    card.classList.add("is-revealed", isImp ? "is-imposter" : "is-secret");
  } else {
    $("dealFront").hidden = false;
    $("dealBack").hidden = true;
    card.classList.remove("is-revealed", "is-imposter", "is-secret");
  }
}

function dealNext() {
  dealQueue.shift();
  dealShow();
}

/* press-and-hold binding (pointer + keyboard) */
function bindHold() {
  const card = $("dealCard");
  const down = (e) => { e.preventDefault(); setDealReveal(true); };
  const up = () => setDealReveal(false);

  card.addEventListener("pointerdown", down);
  card.addEventListener("pointerup", up);
  card.addEventListener("pointerleave", up);
  card.addEventListener("pointercancel", up);
  // suppress the long-press context menu / text selection on mobile
  card.addEventListener("contextmenu", (e) => e.preventDefault());

  // keyboard: hold Space/Enter to reveal
  card.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); setDealReveal(true); }
  });
  card.addEventListener("keyup", (e) => {
    if (e.key === " " || e.key === "Enter") setDealReveal(false);
  });
  card.addEventListener("blur", up);
}

/* ============================================================
   VOTE
   ============================================================ */
function startVote() {
  renderVote();
  show("s-vote");
}

function renderVote() {
  const g = S.game;
  $("voteRound").textContent = `Round ${g.round}`;
  const list = $("voteList");
  list.innerHTML = "";
  g.names.forEach((name, i) => {
    if (!g.alive.has(i)) return;
    const item = document.createElement("button");
    item.type = "button";
    item.className = "voteitem";
    const nameEl = document.createElement("span");
    nameEl.textContent = name;
    item.appendChild(nameEl);
    if (g.mode === "team") {
      const t = document.createElement("span");
      t.className = "vote-team";
      t.textContent = "Team ?";
      item.appendChild(t);
    }
    item.addEventListener("click", () => askVote(i));
    list.appendChild(item);
  });
  updateTopbar();
}

function askVote(i) {
  pendingVote = i;
  $("voteModalTitle").textContent = `Vote out ${S.game.names[i]}?`;
  $("voteModal").hidden = false;
}

/* ============================================================
   REVEAL (drumroll → verdict)
   ============================================================ */
function runReveal(p) {
  const g = S.game;
  show("s-reveal");
  $("drumPhase").hidden = false;
  $("verdictPhase").hidden = true;
  Sound.play("drumroll");

  setTimeout(() => {
    const isImp = g.imposters.has(p);
    const team = g.playerTeam[p];
    const vt = $("verdictText");

    if (isImp) {
      vt.className = "verdict is-ok";
      vt.textContent = g.mode === "team" ? `Team ${team + 1} lost their imposter` : "Imposter caught!";
      Sound.play("imposterCaught");
      g.caughtTeams.add(team); // team can no longer win; teammates stay in
      g.alive.delete(p);       // the imposter leaves
    } else {
      vt.className = "verdict is-bad";
      vt.textContent = g.mode === "team" ? `Team ${team + 1} lost an innocent` : "Innocent — wrong vote";
      Sound.play("innocentLost");
      g.alive.delete(p);       // wrong vote eliminates the innocent
    }

    $("drumPhase").hidden = true;
    $("verdictPhase").hidden = false;
  }, 3000);
}

function afterVerdict() {
  const g = S.game;

  // win checks
  if (g.mode === "team") {
    const aliveTeams = g.teams.map((_, t) => t).filter((t) => !g.caughtTeams.has(t));
    if (aliveTeams.length === 1) return declareWinner({ teamWin: aliveTeams[0] });
  } else {
    const aliveImps = [...g.alive].filter((p) => g.imposters.has(p));
    const aliveInno = [...g.alive].filter((p) => !g.imposters.has(p));
    if (aliveImps.length === 0) return declareWinner({ playersWin: true });
    if (aliveImps.length >= aliveInno.length) return declareWinner({ playersWin: false });
  }

  // next round; new word every 2 rounds (re-deal to survivors)
  g.round++;
  g.sinceWord++;
  if (g.sinceWord >= 2) {
    g.sinceWord = 0;
    const picked = pickWordAndClues();
    g.word = picked.word;
    g.category = picked.category;
    let ci = 0;
    g.imposters.forEach((imp) => {
      if (g.alive.has(imp)) g.clue[imp] = picked.clues[ci++ % picked.clues.length];
    });
    beginDeal();
  } else {
    startVote();
  }
}

/* ============================================================
   WINNER (result + full reveal)
   ============================================================ */
function declareWinner(result) {
  const g = S.game;
  show("s-winner");
  Sound.play("winner");

  if (g.mode === "team") {
    $("winTeam").textContent = `Team ${result.teamWin + 1} wins`;
    $("winSub").textContent = "Their imposter was never caught.";
  } else {
    $("winTeam").textContent = result.playersWin ? "Players win" : "Imposters win";
    $("winSub").textContent = result.playersWin
      ? "Every imposter was voted out."
      : "The imposters survived to the end.";
  }
  renderFullReveal();
}

function renderFullReveal() {
  const g = S.game;
  const box = $("revealAll");
  box.innerHTML = "";
  g.teams.forEach((team, t) => {
    const block = document.createElement("div");
    block.className = "teamblock";
    const head = document.createElement("h4");
    head.textContent = g.mode === "team" ? `Team ${t + 1}` : "Everyone";
    block.appendChild(head);

    team.forEach((p) => {
      const row = document.createElement("div");
      row.className = "member";
      const nameEl = document.createElement("span");
      nameEl.textContent = g.names[p];
      const roleEl = document.createElement("span");
      if (g.imposters.has(p)) {
        const caught = g.mode === "team" ? g.caughtTeams.has(t) : !g.alive.has(p);
        roleEl.className = "role-imp" + (caught ? " is-caught" : "");
        roleEl.textContent = caught ? "imposter · caught" : "IMPOSTER";
      } else {
        roleEl.className = "role-inno";
        roleEl.textContent = g.alive.has(p) ? "innocent" : "innocent · out";
      }
      row.append(nameEl, roleEl);
      block.appendChild(row);
    });
    box.appendChild(block);
  });
}

/* ============================================================
   WIRING
   ============================================================ */
function initGame() {
  bindHold();
  $("dealNext").addEventListener("click", dealNext);

  $("voteConfirm").addEventListener("click", () => {
    $("voteModal").hidden = true;
    if (pendingVote !== null) runReveal(pendingVote);
  });
  $("voteCancel").addEventListener("click", () => {
    $("voteModal").hidden = true;
    pendingVote = null;
  });

  $("verdictBtn").addEventListener("click", afterVerdict);

  $("againSame").addEventListener("click", () => { goSetup(); });
  $("againNew").addEventListener("click", () => { S.names = []; goSetup(); });
}

document.addEventListener("DOMContentLoaded", initGame);
