# Health UI Implementation Plan

> **For agentic workers:** Use executing-plans inline; user has authorized execution.

**Goal:** Implement the approved restrained iPhone visual and interaction design without changing stored data.

**Architecture:** Existing database and analytics remain unchanged. Framework7 Sheet owns management presentation; focused health-theme CSS overrides existing tokens and components; radar remains local SVG with readable range captions.

**Tech Stack:** Framework7 9.1.3, vanilla JS, Vite, Vitest.

## Global Constraints

- No remote resources or new business API; preserve CSP and offline cache.
- Touch targets at least 44×44; title 34px; motion respects reduced-motion preference.
- Preserve existing records and encrypted backup format.

## Task 1 — Appearance and chart

- [ ] Add tests in `growth-radar-preview/tests/health-ui.test.js` asserting no `.scale-label` markup and explicit textual range.
- [ ] Run `npm test -- --run` to observe missing range test fail.
- [ ] Update `src/ui/radar.js`: replace central scale labels with range caption; empty-state instruction; fade changes using `svg.animate` only when reduced motion is off.
- [ ] Add `src/ui/health-theme.css`: 34px title, 20px page gutters, semantic dark variables, 34px button disk inside 46px target, visible chart caption and bottom-sheet form styles.
- [ ] Update `src/ui/today.js`: use dual plus/check images and show success check only after confirmed write; reset after 900ms.
- [ ] Import theme after base CSS in `src/main.js`; preserve data flow.

## Task 2 — Framework7 management sheet

- [ ] Import Sheet module and CSS explicitly; register via `Framework7.use([Sheet])`.
- [ ] Pass `framework` to `setupManagement`; replace native dialog with `.sheet-modal` plus `.sheet-modal-inner` form container.
- [ ] Configure backdrop, Escape close, focus restoration, reduced-motion open/close; background root content inert while open.
- [ ] Keep existing form transactions and error messages; when navigating within sheet preserve original trigger.
- [ ] Verify DOM sheet markup and escaped input values in tests and browser.

## Task 3 — Regression and handoff

- [ ] Run `npm test -- --run`, `npm run build`, `npm audit`, `git diff --check`.
- [ ] Use in-app browser at 393×852 and 320px width. Verify one-tap record, undo, add/edit sheet, backdrop close, history and settings.
- [ ] Check offline reload after stopping production preview; check console errors.
- [ ] Update `design-qa.md` with actual evidence and remaining real-iPhone limits.
- [ ] Commit only task files using Chinese commit message.

## 执行记录

- Task 1 完成：主题、范围说明、图标反馈、图形插值和无障碍描述落地；界面范围断言先失败后通过。
- Task 2 完成：Sheet 接入；进一步完成 Toast 与备份恢复 Actions；焦点恢复和取消默认值有测试覆盖。
- Task 3：22 项自动测试、构建、依赖审计、393/320px 浏览器检查和离线写入回归通过；细节记录在 design-qa.md。
- 深色和减少动态效果实现已完成，但媒体模拟与真实 iPhone 验收未完成，作为明确交付限制保留。
