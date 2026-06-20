# Imposter Who?

A free, offline, installable party game for your phone. **Pass the phone, give clues, vote out the imposters.**

🎮 **Play now:** https://tedisolebitsa-traffy.github.io/imposter-who/

Everyone gets the same secret word — except the **imposters**, who only see a vague clue that describes it. Players take turns giving one-word clues out loud, the room debates, and you vote people out. If the word is *window*, an imposter might just see *view*.

---

## How to play

1. **Pick a mode and a category** on the home screen (or leave it on Random).
2. **Add everyone's names** on the setup screen.
3. **Pass the phone around.** Each player **presses and holds** their card to secretly see their word — innocents see the real word, imposters see a clue. Let go and it hides instantly before you hand it on.
4. **Give clues out loud**, one word each, then debate.
5. **Vote someone out.** A drumroll reveals whether you caught an imposter or lost an innocent.
6. A **new word** arrives every couple of rounds. The same people stay imposters the whole game — only the word changes.
7. Play until a side wins, then see the **full reveal** of who was who.

### Two modes

- **Classic** — no teams. You choose how many imposters hide among everyone. Players win by voting out every imposter; imposters win if they reach parity with the innocents.
- **Team** — players are split into hidden teams, with one imposter secretly planted in each team. **You know your own team but never who else is on it.** The last team with an uncaught imposter wins.

> A wrong vote still eliminates an innocent, so choose carefully. Ties are settled by rock-paper-scissors in real life — the app just waits for the room's final answer.

---

## Features

- 📴 **Fully offline** — works with no internet after the first load. No backend, no accounts, no sign-up.
- 📲 **Installable** — add it to your phone's home screen and it runs like a native app (PWA).
- 🔊 **Sound** — synthesised drumroll and verdict cues, with a mute toggle.
- 🗂️ **Lots of themed categories** (including South African culture) plus a Random option, each with fair, vague clues.
- ✏️ **Make your own category** — type a list of words (clues optional; we'll auto-generate vague ones). Saved on your device and added to the list.
- 🙈 **Secret vote (optional)** — instead of voting out loud, pass the phone and each player taps their vote privately; the app tallies and reveals the result.
- 🆓 **Free and private** — nothing leaves your device. Player names can optionally be remembered between games.
- ♿ **Accessible** — large tap targets, visible focus states, and respects reduced-motion preferences.

---

## Install on your phone

1. Open the **Play now** link above in your phone's browser.
2. Tap the browser menu → **Add to Home Screen** (iOS Safari) or **Install app** (Android Chrome).
3. Launch it from your home screen — it works even in airplane mode after that first load.

---

## Running it locally

It's plain HTML, CSS, and JavaScript — no build step. Serve the folder with any static server, for example:

```bash
npx serve .
```

Then open the printed `localhost` URL. (Opening `index.html` directly via `file://` works for the game, but a service worker — and therefore offline install — only registers when served over `http`/`https`.)

---

## Tech

- Vanilla HTML / CSS / JavaScript, mobile-first and portrait.
- A `manifest.json` and a cache-first service worker make it installable and fully offline.
- Sounds are generated at runtime with the Web Audio API (no audio files), behind a small swappable module.

---

*Built for playing in a room with friends. Have fun finding the fakes.* 🕵️
