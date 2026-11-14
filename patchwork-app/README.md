---
title: Patchwork
emoji: 🧵
colorFrom: green
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
short_description: Make useful things from what you already own.
---

# Patchwork — web app

**A second life starts here.** Patchwork is a resource-reuse app: record what you own, and it helps you make, repair and improve things with it.

This is a working React + Node version of the 29-screen Figma design. It has real accounts, a SQLite database and a matching engine.

## Run it

Requires **Node 22.5+** (it uses the built-in `node:sqlite`; Node 24 recommended).

```bash
cd patchwork-app
npm install
npm run dev
```

Open http://localhost:5173. The API runs on port 4000, and Vite proxies `/api` to it.

**Demo account** (created automatically by `server/seed.js`, with the Figma sample data):
- Email: `fatima@example.com`
- Password: `patchwork123`

You can also create your own account on the Sign up page.

| Command | What it does |
|---|---|
| `npm run dev` | API (auto-restarts on change) + React dev server |
| `npm run build` | Builds the React app into `dist/` |
| `npm start` | Production: one server on `PORT` (default 4000) serving the app and the API |
| `npm run seed` | Wipes the database and recreates the demo data |

The database file is `data/patchwork.db`. Set `PATCHWORK_DB=/path/file.db` to use another file.

## Screen → route map

| # | Screen | Route |
|---|---|---|
| 01 | Landing | `/` |
| 02 | Sign up | `/signup` |
| 03 | Login (+ forgot / reset password) | `/login`, `/forgot`, `/reset/:token` |
| 04 | Interests onboarding | `/onboarding` |
| 05 | Home dashboard | `/home` |
| 06 | Resource library | `/resources` |
| 07 | Add / edit resource | `/resources/new`, `/resources/:id/edit` |
| 08 | Resource details | `/resources/:id` |
| 09–11 | Select → review → preferences (Journey A) | `/make`, `/make/review`, `/make/preferences` |
| 29 → 12 | Loading → discover ideas | `/make/ideas` |
| 28 | Error state (Retry) | shown on load failure; preview with `/make/ideas?simulateError=1` |
| 13 | Idea details | `/ideas/:id` |
| 14–17 | Goal → match → compare → adapt (Journey B) | `/goal`, `/goal/:id`, `/goal/:id/compare`, `/goal/:id/adapt/:ideaId` |
| 18 | Saved ideas | `/saved` |
| 19–22 | Projects → planner → guide → completion | `/projects`, `/projects/:id`, `/projects/:id/guide`, `/projects/:id/complete` |
| 23–24 | Inspiration shelf → community story | `/inspiration`, `/inspiration/:id` |
| 25 | Personal impact | `/impact` |
| 26 | Settings (+ profile, notifications, accessibility, privacy, help) | `/settings/*` |
| 27 | Empty resource library | shown when your shelf is empty |

## How it works

- **Matching** (`server/matching.js`): each idea lists its materials, with keywords, a category, a quantity and an estimated buy cost in PKR. A material counts as available when one of your resources matches it by name or category and you have enough of it. Ideas are ranked by how much you already have. Journey A filters by your time, budget, difficulty and project type. Journey B scores ideas against the words in your goal.
- **Substitutes:** a missing material with a free safe substitute, such as interlocking tabs instead of glue, adds no cost. In Journey B you can switch each substitute on or off.
- **Projects:** a project stores your progress through its steps, its budget, notes and chosen substitutes. When you complete it, it records what you spent and which shelf items were reused. You can also choose to reduce those items' quantities on your shelf.
- **Impact:** calculated only from completed projects: items reused, skills (categories) explored, and the estimated value of the materials you didn't have to buy.
- **Accessibility:** reduce motion, higher contrast and text size apply across the whole app and are saved to your account.

## Database (SQLite)

`users`, `sessions`, `password_resets`, `resources`, `ideas` (seeded catalogue of 15), `saved_ideas`, `goals`, `projects`, `stories` (seeded community stories). The schema is in `server/db.js`.

## Security

- Passwords are hashed with bcrypt.
- Sessions use random tokens stored in an httpOnly, SameSite=Lax cookie (Secure in production).
- Every query is scoped to the logged-in user.
- All input is validated on the server.

## Not connected (needs outside services)

- **Continue with Google:** needs Google OAuth client keys.
- **Password-reset and reminder emails:** no email service is configured. The reset link is printed in the server console instead.

## Project layout

```
server/  index.js (API) · db.js (schema) · matching.js · catalog.js (ideas, stories) · seed.js
src/     App.jsx (routes) · state.jsx (auth, toast, journey) · api.js · styles.css
         components/ (Layout, ui) · pages/ (Auth, Home, Resources, JourneyA, JourneyB, Ideas, Projects, Inspiration, Settings)
```
