# GrowthRadar iOS Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the offline preview to the approved iOS grouped-list design and add a non-persistent direction-creation affordance.

**Architecture:** `index.html` keeps semantic regions and adds the list footer entry. `styles.css` replaces the dark card system with light semantic surfaces and native grouped-list rhythm. `app.js` retains existing data behavior and adds an `announceAddDimension()` feedback path.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript; no dependencies or network requests.

## Global Constraints

- Preserve offline use and existing radar, `+`, Undo, segmented control, and Tab behavior.
- Use a shallow light iOS system hierarchy; blue is reserved for selected controls and primary actions.
- Direction rows are one grouped list, with hairline separators rather than standalone cards.
- Add an `添加方向` configuration entry without data persistence or a form.

---

### Task 1: Replace the visual system

**Files:**
- Modify: `growth-radar-preview/index.html`
- Modify: `growth-radar-preview/styles.css`

**Interfaces:**
- Consumes: existing panel IDs and direction-list ID.
- Produces: `#add-dimension-button`, `.grouped-list`, `.list-row`, and `.add-direction-row`.

- [ ] **Step 1: Restructure the Today list**

Wrap the direction rows in a single grouped-list surface. Append a button with `id="add-dimension-button"`, the visible label `添加方向`, an accessible label `添加成长方向`, and a trailing chevron.

- [ ] **Step 2: Replace visual tokens**

Set light tokens: page `#f2f2f7`, grouped surface `#ffffff`, primary label `#1c1c1e`, secondary label `#6c6c70`, separator `#c6c6c8`, and accent `#007aff`. Remove radial gradients, thick card borders, and heavy shadows. Give row actions 44px minimum targets.

- [ ] **Step 3: Verify static hierarchy**

Open the preview. Expected: Today title, unboxed radar, one grouped list, and a quieter final 添加方向 row are visible.

### Task 2: Preserve working behavior and add feedback

**Files:**
- Modify: `growth-radar-preview/app.js`

**Interfaces:**
- Consumes: `#add-dimension-button`, `#undo-toast`, `renderToday()`.
- Produces: `announceAddDimension()`.

- [ ] **Step 1: Render rows inside the grouped list**

Keep `renderToday()` data-driven. Each current direction remains a row with a `data-index` action. Do not modify `recordAction(index)`, `undoLastAction()`, mode switching, or tab switching contracts.

- [ ] **Step 2: Add configuration-entry feedback**

Implement `announceAddDimension()` to replace toast copy with `添加方向将在设置中配置`, show the toast for 3000ms, and not alter `dimensions` or `lastAction`. Bind it to `#add-dimension-button`.

- [ ] **Step 3: Validate source and interactions**

Run `node --check .\growth-radar-preview\app.js`; expected exit code 0. Manually verify `+`, Undo, metric switch, all tabs, and 添加方向 feedback.

- [ ] **Step 4: Commit when Git is available**

Run `git add growth-radar-preview docs/superpowers` and `git commit -m "feat: 优化成长雷达原生界面"`. The directory has no Git repository, so this remains unavailable until repository initialization.
