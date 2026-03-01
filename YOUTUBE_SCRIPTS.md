# SURGE — YouTube Video Scripts

---

## Script 1: Origin Story (2-3 min, talking head + gameplay overlay)

### Title: *"Riot Deleted Our Favorite Game, So We Built Our Own (with AI)"*

---

**[HOOK — 0:00-0:15]**

*(Screen recording: Swarm gameplay, fast cuts, chaotic action)*

**AYOUB (voiceover):** "This is Swarm. A bullet-heaven mode Riot added to League of Legends in 2024. We played it every single night. It was the most fun we'd had in a game in years."

*(Screen goes black)*

**AYOUB:** "Then Riot deleted it."

---

**[THE PROBLEM — 0:15-0:45]**

*(Talking head, casual, maybe at a desk with code on a monitor behind)*

**AYOUB:** "So Swarm was this rotating game mode — Riot adds it, everyone loves it, and then they just... take it away. No standalone version, no release date, nothing. Ghassen and I kept saying 'they'll bring it back.' They didn't."

**GHASSEN:** "We literally tried to find alternatives. Nothing hit the same. So one night Ayoub just texts me: 'What if we build it ourselves?'"

**AYOUB:** "And I wasn't talking about a clone. I wanted to go further. What if the game actually *learned* how you play?"

---

**[THE BUILD — 0:45-1:30]**

*(Split screen: left side code scrolling, right side gameplay evolving from early prototype to polished version)*

**AYOUB (voiceover):** "We started from zero. No game engine. No framework. Just vanilla JavaScript and an HTML Canvas. We wrote our own Entity Component System, our own physics, our own collision detection, our own audio — everything."

*(Show the file tree briefly — 40+ files)*

**GHASSEN (voiceover):** "But the real thing we wanted to build was the AI. Not just 'spawn more enemies when the player is winning.' A real AI Director that watches you in real time."

*(Show the stress model visualization, the Director rationale text in-game)*

**AYOUB (voiceover):** "It reads six signals — your health, how close enemies are, how often you're dodging, your DPS, your combo streak. It builds a stress score. And then it picks encounter cards designed to push you in the ways you're weakest."

**GHASSEN (voiceover):** "And then we added LLM support. You plug in Mistral, or OpenAI, or even a local model running on your laptop — and the Director starts *reasoning*. It writes strategy. It writes flavor text. It argues with itself through a planner-critic pipeline."

---

**[THE DEMO — 1:30-2:15]**

*(Full gameplay — show a complete run or highlights, with HUD visible)*

**AYOUB (voiceover):** "Here's what it looks like. Six enemy types, each with elite and boss variants. Fifteen upgrades that stack. Forty encounter cards the Director can mix and match. Pilot ranking. Achievements. Daily challenges. A cosmetics store. A battle pass. Procedural audio — every sound you hear is generated in real time, no audio files."

*(Show the coach report screen at the end of a run)*

**GHASSEN (voiceover):** "And after every run, a Coach AI analyzes exactly what happened — your movement patterns, your build choices, where you died — and gives you specific advice."

---

**[THE CLOSE — 2:15-2:45]**

*(Talking head)*

**AYOUB:** "This whole thing is 40+ files, around 8,000 lines of JavaScript, zero dependencies, zero build tools. You serve it with `python3 -m http.server` and it just works."

**GHASSEN:** "The end goal? Publish this as a real mobile game. If Riot won't give us Swarm back, we'll make something better."

**AYOUB:** "Link in the description. You can play it right now."

*(End card: GitHub link, subscribe, etc.)*

---

---

## Script 2: Demo Presentation (3-5 min, screen share + voiceover)

### Title: *"SURGE — AI-Powered Bullet Heaven | Full Demo"*

---

**[INTRO — 0:00-0:20]**

*(Title card: SURGE logo on black, then cut to browser with game loaded)*

**VOICEOVER:** "This is SURGE — a bullet-heaven survival game where the AI learns how you play and fights back. No game engine, no dependencies, just JavaScript and a Canvas. Let me show you how it works."

---

**[GAMEPLAY WALKTHROUGH — 0:20-1:30]**

*(Start a run on Adaptive mode, show the first 5-10 waves)*

**VOICEOVER:** "You auto-fire. Your job is to move, dodge, and survive 30 waves. Every few waves you pick an upgrade — spread shot, homing bullets, shield, dash boost, fifteen options total."

*(Show upgrade selection screen)*

"Six enemy types, each with different AI behaviors. Drifters home in on you with a wobble. Dashers telegraph a charge. Sprayers are stationary turrets. Orbitors circle you. Splitters break apart on death. Shielders protect nearby enemies."

*(Show a boss wave)*

"Every ten waves, a boss. Phase transitions, special attacks, much more HP."

---

**[THE AI DIRECTOR — 1:30-2:30]**

*(Switch to showing the Director mode selector, then start an Adaptive run)*

**VOICEOVER:** "Three Director modes. Classic is 30 hand-designed waves with seeded RNG. Adaptive is where it gets interesting."

*(Overlay showing the stress model, the card picks, the rationale text)*

"The Adaptive Director reads your stress in real time — six signals including your HP, enemy proximity, dodge frequency, and DPS. It uses a softmax bandit algorithm to pick encounter cards that balance challenge and variety."

*(Switch to LLM mode — show settings screen with Mistral configured)*

"And LLM mode. You plug in any API — here I'm using Mistral. The Director sends your game state to the LLM every few waves. The model picks cards, adds modifiers, writes flavor text. In premium mode, a Planner proposes a wave plan and a Critic reviews it for balance."

*(Show the LLM rationale in the HUD — the flavor text)*

"The game literally has an LLM thinking about how to challenge you."

---

**[UNDER THE HOOD — 2:30-3:30]**

*(Show the codebase — file tree, quick scrolls through key files)*

**VOICEOVER:** "Everything is built from scratch. Custom Entity Component System — entities are integers, components are Maps. Fixed-timestep game loop at 60Hz with interpolated rendering. Spatial hash for collision detection."

*(Show the audio engine file briefly)*

"Every sound is procedural. Web Audio API oscillators and noise shapers. Zero audio files."

*(Show the PWA manifest, service worker)*

"It's a PWA. Install to homescreen, play offline."

*(Show the telemetry and coach report)*

"After every run, a Coach analyzes your telemetry — movement heatmap, dodge patterns, DPS windows — and gives you a personalized report."

---

**[NUMBERS & CLOSE — 3:30-4:00]**

*(Summary card on screen)*

**VOICEOVER:** "40+ source files. 8,000 lines of code. Zero dependencies. Zero build step. Serves from any static HTTP server. 6 enemy types, 15 upgrades, 40 encounter cards, 40 achievements, daily challenges, cosmetics, battle pass, leaderboard, pilot ranking."

"Two people built this because we missed a game that got deleted. If you want to play it, the link is in the description. Star it on GitHub if you like it."

*(End screen: GitHub link, SURGE logo)*

---

---

## Thumbnail Ideas

1. **Split screen:** Left = Swarm gameplay (crossed out), Right = SURGE gameplay. Text: "They deleted our favorite game..."
2. **Code + Game:** Half the frame is code, half is gameplay. Text: "Built from ZERO"
3. **AI brain visual:** Game screenshot with a glowing brain/neural network overlay. Text: "The AI that learns YOU"

---

## Video Tags

`bullet heaven, swarm, league of legends swarm, vampire survivors, indie game, game dev, javascript game, ai game, llm game, no engine, vanilla js, canvas game, mobile game, ai director, hackathon, game from scratch`
