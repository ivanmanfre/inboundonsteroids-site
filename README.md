# inboundonsteroids-site

Production landing for **inboundonsteroids.com**, the product front-door of InboundOnSteroids (the $2k/mo LinkedIn inbound engine for agency owners).

- **Brand canon:** `~/Desktop/Ivan - Content System/inboundonsteroids-brand/03-brand-system.md` (v4 "Black Box") and `cd-final/` (the ratified Claude Design sheet + landing).
- **Design source:** `cd-final/Landing Page.dc.html`, rebuilt here as a fluid responsive static site (360-1920px), gated at 7 widths and by the fingerprint detector.
- **Stack:** plain static HTML/CSS/JS, no build step. `index.html` + `styles.css` + `figures.js` + `assets/`.
- **Deploy:** git push to `main` deploys via GitHub Pages (`.github/workflows/deploy.yml`). Never use the gh-pages CLI. `CNAME` carries the custom domain; DNS records live in `~/Desktop/Ivan - Content System/inboundonsteroids-brand/cutover-plan.md`.
- **Voice + claims law:** zero em dashes, the name never abbreviates, every number a verified receipt; fit-call copy says "one hour" because the live Calendly event is 60 minutes.
