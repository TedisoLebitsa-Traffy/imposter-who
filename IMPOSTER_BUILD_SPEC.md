# Imposter Who? — Build Specification

**For:** Claude Code
**Goal:** Build a free, offline, mobile-first party game as an installable web app (PWA). No backend, no accounts, no payments, works with no internet after first load.

A working greyscale **flow prototype already exists** (`Imposter_Mockup.html`). Use it as the functional reference for game logic and flow. This build productionises it: real visual design, offline/installable (PWA), expanded word bank, polish. Keep all rules below exactly.

---

## 1. Tech requirements

- **Single-page web app**, mobile-first, portrait. Plain HTML/CSS/JS is acceptable and preferred for guaranteed offline simplicity; React + Vite is fine if you prefer a build step.
- **Installable PWA**: add a `manifest.json` and a service worker that caches all assets so the game runs fully offline and can be saved to a phone home screen.
- **No backend, no network calls at runtime.** All data (word bank, logic) ships inside the app.
- **No localStorage dependency for core play.** Use it only to remember player names between games (optional enhancement); the game must work if storage is unavailable.
- **Sound:** synthesised in-app via the Web Audio API (no audio files). Built so real audio clips can be swapped in later.
- **Quality floor:** responsive on small phones, visible focus states, respects `prefers-reduced-motion`, large tap targets.

---

## 2. The game in one line

Everyone gets the same secret word — except the **imposters**, who get a vague clue that describes it. Players give one-word clues out loud; the room debates and votes people out. If the word is *window*, an imposter might see *view*.

---

## 3. Two modes

### Classic
- No teams. One shared word; imposters get clues.
- Player chooses **how many imposters** (min 1; cap so innocents always outnumber imposters: max = floor((players − 1) / 2)).
- **Players win** when every imposter is voted out.
- **Imposters win** if the number of alive imposters becomes **equal to or greater than** the number of alive innocents.

### Team
- Players split into **N teams** chosen by the user. **One imposter hidden per team** (so N imposters total).
- **Hidden allegiances:** a player knows their own team number but **not who else is on their team**. This is essential — never show teammates.
- Because teams are hidden, **all innocents share one word** (different words per team would leak team membership through clue clusters).
- **Win:** the **last team with an uncaught imposter wins.** Auto-declared.

---

## 4. Setup flow

1. **Home screen:** choose mode (Classic / Team), choose category (or **Random**), sound on/off toggle.
2. **Setup screen:**
   - Add player names — **any number**. Names can be **deleted** as they're added. Optionally remember names between games.
   - **Classic:** input for number of imposters (validated, see caps above).
   - **Team:** input for number of teams. **Each team must have at least 3 members.** Reject/warn if `floor(players / teams) < 3`, or if too few players.
3. On start, the app:
   - Shuffles players. Team mode: distribute as evenly as possible across teams (uneven is fine, e.g. 14 into 4 → 4-4-3-3).
   - Assigns imposters (one per team / N in classic).
   - Picks the secret word and a **different clue word for each imposter** (so imposters can't recognise each other).

---

## 5. Card deal (pass-the-phone)

- Show one player at a time: a card displaying their **name**, and a prompt "Pass the phone to **[name]**".
- **Press and hold** the card to reveal: the player's **secret word**, or if they're an imposter, their **clue word** and (team mode) their **team number**. Releasing hides it instantly back to the name.
- Show the current **round number** and **how many rounds since the word last changed**.
- A "Next player" button advances; the last card's button reads "Everyone's seen — start round".

---

## 6. Round loop

1. Players give one-word clues out loud and debate (off-app).
2. **Vote screen:** list all alive players as tappable items. Round number shown. Tapping a name opens a **confirm step** ("Vote out [name]?") to prevent mistakes.
3. On confirm → **Reveal screen:** a **drumroll** (sound + animation) for ~1.5s, then the verdict and nothing else:
   - Team mode: **"Team X lost their imposter"** or **"Team X lost an innocent"**.
   - Classic: **"Imposter caught!"** or **"Innocent — wrong vote"**.
4. Apply consequences (section 7), check win, continue.
5. **Every 2 rounds**, a **new word** is introduced to the surviving players (re-deal: pass the phone around again to reveal it). The **same players stay imposters all game** — only the word and clues change.

---

## 7. Rules that matter

| Rule | Behaviour |
|---|---|
| Wrong vote hurts | Voting out an innocent eliminates them anyway (both modes). |
| Caught imposter (Team) | That team can no longer win, but its remaining members **stay in and keep playing/voting**. |
| New word every 2 rounds | Same imposters throughout; only the word + each imposter's clue change. |
| Tie votes | Resolved by rock-paper-scissors in real life; the app just waits for the final name. |
| Quit | A quit (×) button on every in-game screen → confirm ("Quit to home? This game will end") → home. |

---

## 8. Win conditions (summary)

- **Team:** when only one team still has an uncaught imposter, that team wins. Then show a **full reveal**: every player grouped by team, with imposters marked.
- **Classic — players:** all imposters voted out.
- **Classic — imposters:** alive imposters ≥ alive innocents.
- On win: play a **fanfare**, show the result and full reveal, and offer **Play again** with the choice to **reuse the same names** or **enter new names**.

---

## 9. Sound (synthesised, mutable)

Four cues, all generated via Web Audio (no files), respecting the mute toggle (default on):

- **Drumroll** — before every elimination verdict.
- **Imposter caught** — sharp, dramatic sting.
- **Innocent lost** — softer, deflating tone.
- **Winner** — short fanfare.

Build these behind a small sound module so recorded clips can replace the synth versions later without touching game logic.

---

## 10. Screens checklist

1. Home (mode, category, sound)
2. Setup (names, counts, validation)
3. Card deal (hold-to-reveal, pass-the-phone)
4. Vote (player list + confirm)
5. Reveal (drumroll → verdict)
6. Winner (result + full reveal + play again)
- Modals: vote confirm, quit confirm.

---

## 11. Word bank

Ships inside the app. Structure: each category maps to a list of entries; each entry is a secret **word** plus a pool of vague **clue** words (one assigned to each imposter, all different). Target **~20 entries per category** for the real build — expand the starter set below. Clues must describe the word vaguely and fairly (never name it, never be so specific they give it away).

Current categories: **Everyday Objects, Food & Drinks, Animals, Places, Singing Artists, Movies, Anime Shows, Cartoons**, plus a **Random** option that draws across all.

Starter data (expand each to ~20):

```json
{
  "Everyday Objects": [
    {"word":"Window","clues":["view","glass","frame","light"]},
    {"word":"Umbrella","clues":["rain","cover","fold","shade"]},
    {"word":"Mirror","clues":["reflection","glass","face","shine"]},
    {"word":"Ladder","clues":["climb","steps","height","reach"]}
  ],
  "Food & Drinks": [
    {"word":"Pizza","clues":["slice","cheese","round","oven"]},
    {"word":"Coffee","clues":["morning","bitter","cup","awake"]},
    {"word":"Banana","clues":["yellow","peel","curve","soft"]},
    {"word":"Ice cream","clues":["cold","scoop","melt","sweet"]}
  ],
  "Animals": [
    {"word":"Elephant","clues":["trunk","grey","huge","memory"]},
    {"word":"Penguin","clues":["cold","waddle","suit","ice"]},
    {"word":"Shark","clues":["teeth","ocean","fin","fear"]},
    {"word":"Owl","clues":["night","wise","silent","eyes"]}
  ],
  "Places": [
    {"word":"Beach","clues":["sand","waves","sun","towel"]},
    {"word":"Airport","clues":["travel","wait","gate","luggage"]},
    {"word":"Hospital","clues":["white","quiet","care","beds"]},
    {"word":"Library","clues":["quiet","books","study","shh"]}
  ],
  "Singing Artists": [
    {"word":"Beyoncé","clues":["pop","stage","icon","powerful"]},
    {"word":"Drake","clues":["rap","Toronto","charts","mood"]},
    {"word":"Rihanna","clues":["pop","island","brand","voice"]},
    {"word":"Burna Boy","clues":["afrobeats","Nigeria","energy","grammy"]},
    {"word":"Taylor Swift","clues":["pop","stories","fans","eras"]},
    {"word":"The Weeknd","clues":["night","falsetto","moody","hits"]},
    {"word":"Tyla","clues":["amapiano","viral","dance","SouthAfrica"]},
    {"word":"Ed Sheeran","clues":["acoustic","ginger","loop","ballads"]}
  ],
  "Movies": [
    {"word":"Titanic","clues":["ship","romance","ocean","tragedy"]},
    {"word":"Avatar","clues":["blue","aliens","jungle","3D"]},
    {"word":"Inception","clues":["dreams","layers","mind","spinning"]},
    {"word":"Avengers","clues":["heroes","team","battle","marvel"]},
    {"word":"Jurassic Park","clues":["dinosaurs","island","science","chaos"]},
    {"word":"Black Panther","clues":["wakanda","king","vibranium","hero"]},
    {"word":"Joker","clues":["clown","dark","laugh","chaos"]},
    {"word":"Spider-Man","clues":["web","spider","hero","city"]}
  ],
  "Anime Shows": [
    {"word":"Naruto","clues":["ninja","village","orange","fox"]},
    {"word":"One Piece","clues":["pirate","ocean","hat","treasure"]},
    {"word":"Attack on Titan","clues":["titans","walls","war","freedom"]},
    {"word":"Dragon Ball","clues":["fighters","energy","saiyan","power"]},
    {"word":"Demon Slayer","clues":["demons","sword","breathing","night"]},
    {"word":"Death Note","clues":["notebook","detective","rules","fate"]},
    {"word":"My Hero Academia","clues":["heroes","quirks","school","power"]},
    {"word":"Pokémon","clues":["creatures","trainer","battles","catch"]}
  ],
  "Cartoons": [
    {"word":"SpongeBob","clues":["sea","sponge","yellow","fun"]},
    {"word":"Tom and Jerry","clues":["cat","mouse","chase","silent"]},
    {"word":"The Simpsons","clues":["yellow","family","town","satire"]},
    {"word":"The Lion King","clues":["savanna","cub","kingdom","circle"]},
    {"word":"The Last Airbender","clues":["elements","bending","balance","journey"]},
    {"word":"Rick and Morty","clues":["portal","science","space","grandpa"]},
    {"word":"Ben 10","clues":["watch","aliens","transform","hero"]},
    {"word":"Powerpuff Girls","clues":["sugar","spice","heroines","city"]}
  ]
}
```

---

## 12. Acceptance criteria

- [ ] Runs fully offline after first load; installable to a phone home screen.
- [ ] Both modes playable end to end.
- [ ] Classic asks for imposter count; Team asks for team count; both validate (≥3 per team; imposters < innocents).
- [ ] Hold-to-reveal hides instantly on release; teammates never shown.
- [ ] Vote requires a confirm; verdict shows only the team + role line.
- [ ] New word arrives every 2 rounds to survivors; imposters stay fixed.
- [ ] Wrong votes eliminate innocents; caught imposters' teammates stay in.
- [ ] Correct auto-win for each mode, followed by a full reveal.
- [ ] Drumroll + verdict + winner sounds, with a working mute toggle.
- [ ] Quit-to-home (with confirm) on every in-game screen.
- [ ] Word bank ~20 per category, vague fair clues.

---

*Build reference: the existing `Imposter_Mockup.html` demonstrates the full flow and logic. Match its behaviour; replace its rough greyscale look with a real, distinctive visual design.*
