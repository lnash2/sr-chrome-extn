# Swift Recruit — Chrome Extension

Chrome extension (Manifest V3) for Swift Recruit recruiters. On indeed.com candidate pages, scrapes identifiers, calls the `candidate-match` edge function on the SR CRM, and displays matches in an injected panel.

## Quick start

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_ANON_KEY
npm run build
```

### Load unpacked in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `dist/` folder
4. Navigate to an Indeed candidate profile

### Dev mode (hot reload)

```bash
npm run dev
```

Load the `dist/` folder as above. Vite + crxjs will hot-reload on save.

## Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL (Green) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_USE_MOCK` | `true` to use mock API instead of real edge function |

## Mock mode

Set `VITE_USE_MOCK=true` in `.env` to run against mock data without a live Supabase connection. Useful for UI development and testing.

## Selector maintenance

Scraping selectors are centralised in `src/content/selectors.ts`. Each field has an ordered list of extraction strategies:

1. **Aria labels / semantic elements** — most stable
2. **Label-text anchoring** — find a label, read adjacent content
3. **`mailto:` / `tel:` hrefs** — for email and phone
4. **Regex over page text** — UK phone, email, UK postcode patterns as fallback

When Indeed changes their markup, update selectors in priority order. Add new strategies at the top if a more stable selector is found.

## Project structure

```
src/
├── assets/            # Extension icons
├── background/        # Service worker (auth, API calls)
├── content/           # Content script (scraper, observer, panel injection)
├── lib/               # Shared utilities, mock API
├── panel/             # Match result panel (Shadow DOM)
└── popup/             # Popup UI (login, settings)
docs/
└── EDGE-FUNCTION-CONTRACT.md   # Edge function request/response contract
```

## Tests

```bash
npm test              # run once
npm run test:watch    # watch mode
```
