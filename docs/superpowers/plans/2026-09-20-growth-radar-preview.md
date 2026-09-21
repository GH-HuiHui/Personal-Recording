# GrowthRadar Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained offline browser preview of GrowthRadar v1.

**Architecture:** One semantic HTML page provides the phone shell and visual regions. CSS owns visual tokens and layout; a small vanilla JavaScript module owns simulated data, SVG radar rendering, and all interactions.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript; no dependencies.

## Global Constraints

- Opens offline in a modern browser and resets simulated data on refresh.
- Includes Today, History, and Settings tabs.
- Includes radar-mode switching, `+1`, and a three-second Undo toast.
- Uses no backend, gamification, third-party library, or network request.

---

### Task 1: Create the shell and visual system

**Files:**
- Create: `growth-radar-preview/index.html`
- Create: `growth-radar-preview/styles.css`

**Interfaces:**
- Produces: `#today-panel`, `#history-panel`, `#settings-panel`, `#radar-svg`, `#dimension-list`, `#undo-toast`, and buttons with `data-tab` or `data-mode`.

- [ ] **Step 1: Build semantic markup**

Create a 390px phone shell containing the three panels, three bottom navigation buttons, a two-button metric selector, `<svg id="radar-svg" viewBox="0 0 280 280">`, `<section id="dimension-list">`, and a toast with an Undo button.

- [ ] **Step 2: Implement visual tokens**

Create CSS variables `--background: #0b0d12`, `--surface: #181b24`, `--text: #f5f7fb`, and `--accent: #70a7ff`. Use system UI fonts, 16px card corners, low-noise borders, and a 56px bottom navigation.

- [ ] **Step 3: Verify static layout**

Open `growth-radar-preview/index.html`. Expected: centered phone frame, no horizontal overflow, and visible navigation labels.

### Task 2: Render demo cards and radar chart

**Files:**
- Create: `growth-radar-preview/app.js`
- Modify: `growth-radar-preview/index.html`

**Interfaces:**
- Consumes: `#radar-svg` and `#dimension-list`.
- Produces: `renderToday()` and `renderRadar(values, max)`.

- [ ] **Step 1: Define initial data**

Use six objects with names 阅读、英语 / 雅思、技术、锻炼健身、练字、自媒体 and properties `today`, `recent`, `activeDays`, and `stageRate`.

- [ ] **Step 2: Render data-driven cards**

Implement `renderToday()` to create each card with the direction name, `今日 N`, `近7日 N`, and a `<button data-index="N">+1</button>`.

- [ ] **Step 3: Render dynamic polar coordinates**

Implement `renderRadar(values, max)` using `angle = -Math.PI / 2 + index * (2 * Math.PI / values.length)`, center `(140, 140)`, radius `92`, dynamic axes, labels, a filled data polygon, and fixed maxima of 7 for recent mode and 1 for stage mode.

- [ ] **Step 4: Verify chart modes**

Reload the page and switch both modes. Expected: six labels map to six cards and the polygon visibly changes.

### Task 3: Implement interactions and validate

**Files:**
- Modify: `growth-radar-preview/app.js`
- Modify: `growth-radar-preview/styles.css`

**Interfaces:**
- Consumes: `data-tab`, `data-mode`, and `data-index` controls.
- Produces: `setTab(tab)`, `setMode(mode)`, `recordAction(index)`, and `undoLastAction()`.

- [ ] **Step 1: Add navigation and mode state**

`setTab(tab)` applies the selected panel and navigation class only. `setMode(mode)` stores `recent` or `stage`, marks its button selected, and calls `renderToday()`.

- [ ] **Step 2: Add action and undo state**

`recordAction(index)` saves the affected direction’s pre-click values, increases `today` and `recent`, updates active days only when the prior daily count was zero, rerenders, and shows a toast for 3000ms. `undoLastAction()` restores the saved values and rerenders.

- [ ] **Step 3: Add a11y and empty-state copy**

Give all controls `aria-label` values and show `新阶段已开始。先记录真实行动，图形会慢慢出现。` below the chart.

- [ ] **Step 4: Run validations**

Run `node --check .\growth-radar-preview\app.js`; expected: exit code 0. In a browser, verify `+1`, Undo, both chart modes, and all tabs; expected: no console errors or network requests.

- [ ] **Step 5: Commit when Git exists**

Run `git add growth-radar-preview docs/superpowers` and `git commit -m "feat: 完成长雷达预览原型"`. Expected: one complete Chinese-message commit. This workspace currently lacks `.git`, so the command cannot run until the owner initializes a repository.
