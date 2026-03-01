# SURGE — Hackathon Demo Submission

---

## One-Liner

**SURGE is a bullet-heaven survival game with an AI Director that learns how you play in real time — built from absolute zero with no engine, no framework, and no dependencies.**

---

## The Pitch (Short)

We loved Swarm — the bullet-heaven mode Riot Games added to League of Legends. Then they removed it. So we built our own, and gave it a brain.

SURGE is a mobile-first survival game where an AI Director watches your stress, your dodge patterns, and your upgrade choices in real time, then dynamically crafts encounters designed specifically to challenge *you*. Plug in any LLM — Mistral, OpenAI, a local Ollama model — and the Director starts reasoning about strategy, writing flavor text, and debating its own wave plans through a Planner-Critic pipeline.

**40+ source files. Zero dependencies. Zero build step. Pure vanilla JavaScript and a Canvas.**

---

## The Story

Summer 2024. Riot drops **Swarm** into League of Legends — a bullet-heaven mode where four players fight off endless waves of enemies. We played it obsessively. Late nights, Discord calls, "just one more run."

Then Riot rotated it out. No standalone version. No return date. Just gone.

We looked at each other and said: *"We can build this."*

But we didn't want to just clone it. We wanted to answer a question that Swarm never asked: **What if the game actually understood you?** Not just "more enemies if you're winning" — real understanding. Your stress level. Your movement habits. Your playstyle fingerprint.

So we built SURGE from scratch. No Unity. No Godot. No Phaser. Just JavaScript, an HTML5 Canvas, and a commitment to understanding every byte of what we shipped.

The result: a game that plays differently for every player, every run, and gets smarter the longer you survive.

---

## What Makes It Special

### 🧠 The AI Director
Not a difficulty slider. Not "spawn more enemies." A real-time decision engine with three modes:
- **Classic** — 30 hand-authored waves with seeded RNG for replay
- **Adaptive** — Softmax bandit algorithm that learns from a 6-signal player stress model
- **LLM** — Queries any OpenAI-compatible API (Mistral, OpenAI, Groq, Ollama, LM Studio) to let a language model reason about encounter design in real time

### 🔌 Plug Any LLM
The adapter is provider-agnostic. Cloud APIs need an endpoint + key. Local models (Ollama, LM Studio, vLLM) are auto-detected and need zero configuration beyond the model name. We plan to demo with Mistral.

### 🏗️ Zero Dependencies
Not "minimal dependencies." **Zero.** No npm install. No build step. No bundler. Pure ES modules served by any static HTTP server. The entire codebase is readable, debuggable, and auditable without tooling.

### 🎮 Complete Game
This isn't a tech demo. It's a full game: 6 enemy types with Elite/Boss variants, 15 stackable upgrades, 40+ encounter cards, pilot ranking, 40 achievements, daily challenges, a cosmetics store, battle pass, leaderboard, procedural audio (zero audio files), CRT post-processing, PWA support, and an onboarding tutorial.

### 📱 Mobile-First
Portrait mode, 240×400 logical pixels, touch controls with move-toward-cursor input. Designed to run on a phone. The goal is to ship this as an actual mobile game.

---

## Technical Highlights

| Feature | Implementation |
|---------|---------------|
| ECS | Custom — entities as integers, components as Maps, archetype caching |
| Game Loop | Fixed 60Hz timestep, interpolated rAF rendering |
| Collision | Spatial hash (32px cells), Set-based entity iteration |
| AI Director | Encounter card system, softmax bandit, stress model, LLM integration |
| Stress Model | 6 real-time signals → smooth 0-1 stress score |
| Telemetry | Per-frame heatmaps, dodge tracking, DPS windows |
| Coach | Post-run diagnostic with playstyle analysis |
| Planner-Critic | Multi-agent LLM deliberation (planner proposes, critic reviews) |
| Audio | Web Audio API oscillators + noise — zero audio files |
| Rendering | Canvas 2D with devicePixelRatio scaling, CRT filter, screen shake |

---

## Numbers

- **40+ source files**, ~8,000 lines of code
- **0 dependencies**, 0 build tools, 0 assets to download
- **6 enemy types** × 3 variants (normal, elite, boss) = 18 enemy configurations
- **40+ encounter cards** with modifiers and formations
- **15 upgrades**, 40 achievements, daily challenges, battle pass
- **3 AI Director modes** including real-time LLM integration
- **2 people** built the whole thing

---

## Team

**Ayoub Chamakhi** & **Ghassen Chouikh**

Two developers who missed a game mode so much they built their own — and accidentally created an AI-powered game engine along the way.

---

## Try It

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

That's it. No setup. No install. Just play.

---

## Links

- **GitHub:** [github.com/ayoubchamakhi/surge-game](https://github.com/ayoubchamakhi/surge-game)
- **YouTube Demo:** *(coming soon)*
