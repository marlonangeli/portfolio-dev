# Development Stack

This project uses `bun` as runtime for fast local workflows, but metadata tooling is written to run with Bun end-to-end.

## Candidate Frameworks

- `Astro`: preferred for a lightweight portfolio with strong static output.
- `Next.js`: still valid if dynamic routes and server-side logic become required.

## Delivery Platform

- Primary deployment target: `Vercel`.
- Alternative target: self-hosted runtime.

## AI and Editor Tooling

- Local editor: `Zed`.
- AI assistants under evaluation: Codex, Copilot, and OpenCode.

## Decision Notes

- No paid/licensed tooling should be required for the core workflow.
- Any material TODO/REVIEW/FIX item must become a file under `tasks/`.
