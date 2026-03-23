# Scrapped Blooket Data

This folder contains the latest scraped Blooket data generated in this workspace on 2026-03-22 local time.

## Contents

- `public/public-and-play.json`
  Public-facing scrape output for `www.blooket.com` and `play.blooket.com`
- `public/html/`
  Raw HTML snapshots for the public scrape
- `dashboard/dashboard-cdp.json`
  Authenticated dashboard scrape output gathered through the live Chrome CDP session
- `dashboard/html/`
  Raw HTML snapshots for the authenticated dashboard scrape

## Current Status

- Public scrape: 6 page records
- Authenticated dashboard scrape: 12 page records
- Authenticated dashboard routes returned `200` for:
  `my-sets`, `discover`, `create`, `favorites`, `history`, `homeworks`, `settings`, `stats`, `blooks`, `market`, and `play`
- Some public routes still showed Cloudflare verification pages during scraping

## Notes

- This folder intentionally does not include auth/session files such as `auth/blooket-storage-state.json`
- JSON files contain extracted metadata, text, links, forms, inputs, buttons, and optional selector matches
- `html/` folders contain raw page snapshots for deeper inspection
