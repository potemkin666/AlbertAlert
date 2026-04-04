# Brialert

[![Feed validation](https://github.com/potemkin666/Brialert/actions/workflows/ci-feed-validation.yml/badge.svg)](https://github.com/potemkin666/Brialert/actions/workflows/ci-feed-validation.yml)
[![Update live feeds](https://github.com/potemkin666/Brialert/actions/workflows/update-live-feed.yml/badge.svg)](https://github.com/potemkin666/Brialert/actions/workflows/update-live-feed.yml)

Brialert is a GitHub Pages web app for fast, phone-friendly terrorism monitoring with a UK, London, and Europe bias.

The product is built around one idea: the feed builder decides what an alert is, how trustworthy it is, whether it belongs in the live incident lane, and how it should be grouped. The browser then validates that payload, renders it quickly, and stays out of the classification business.

## Live site

[https://potemkin666.github.io/Brialert/](https://potemkin666.github.io/Brialert/)

## What it does

- pulls from a curated source catalog focused on official, policing, transport, prosecution, resilience, and tightly relevant corroboration sources
- ranks likely live incidents above slower context and case-stage material
- keeps source-tier, reliability, incident-track, and queue-reason decisions upstream in the feed builder
- provides a mobile-first live dashboard, map, watchlists, notes, and briefing modal
- refreshes the generated feed on an hourly GitHub Actions schedule

## Architecture

### Frontend

- `index.html`
  App shell and modal layout.
- `styles.css`
  Site styling, mobile layout, and map presentation.
- `app/`
  Frontend boot, state, render, and utility modules.
- `shared/`
  Shared view-model, taxonomy, fusion, and feed-derivation logic used by the browser.

### Feed pipeline

- `data/sources.json`
  Source catalog and source metadata.
- `data/geo-lookup.json`
  Location term lookup for map placement and geographic enrichment.
- `scripts/build-live-feed/`
  Feed builder modules for config, IO, parsing, alert assembly, and health metadata.
- `scripts/build-live-feed.mjs`
  Feed build orchestration entrypoint.
- `live-alerts.json`
  Generated alert payload consumed by the frontend.

### Validation and automation

- `.github/workflows/ci-feed-validation.yml`
  CI validation for feed data, source health, tests, and builder smoke path.
- `.github/workflows/update-live-feed.yml`
  Scheduled feed refresh workflow that rebuilds and commits `live-alerts.json`.
- `tests/`
  Lightweight decision-logic and feed-health regression tests.

## Local development

Requires Node `20.18.1` or newer.

```bash
npm ci
npm run validate:feed-data
npm run validate:source-health
npm test
npm run build:feeds
```

## Operational notes

- The browser should trust the feed payload rather than re-inferring terrorism relevance or source reliability.
- The feed builder is designed to fail soft per source, skip duplicate source IDs at runtime with a warning, and preserve last-known-good output when possible.
- London-focused HTML sources are validated in CI so dead or empty pages are easier to catch before they pollute the catalog.
- Both CI and the hourly workflow now run `validate:live-feed-output` after feed generation to fail fast on malformed publish output.
- The hourly publish step retries once after rebasing `origin/main` if `git push` hits a non-fast-forward race.
- If a refresh preserves prior alerts and reports `sourceCount: 0`, the app now falls back to `health.lastSuccessfulSourceCount` so the hero source count does not stick at zero.

## Status

The repo currently deploys directly from `main` to GitHub Pages and refreshes feed data through GitHub Actions. If you are inspecting the live app and the data looks stale, check the latest `Update live feeds` workflow run first.
