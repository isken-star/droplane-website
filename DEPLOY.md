# Deploying www.droplane.co.uk (GitHub Pages + GoDaddy)

Same shape as the 11testcoach.co.uk site, with one difference: DropLane's
custom domain is the **www** host, because that is the address already
printed inside the shipped app (Settings → Website, and the onboarding
help screen). Changing it would strand every build already on TestFlight.

## 0. Build the pages first

The site is generated: ten languages from one template, so a copy change is
made once and lands everywhere.

```bash
python3 ../Scripts/build_site.py     # from website/, or Scripts/build_site.py from the repo root
```

That rewrites `index.html`, `<lang>/index.html` and `sitemap.xml`. Never edit
those by hand — edit `_build/template.html` or `_build/strings/<lang>.json`.
Screenshots come from `Scripts/capture_screenshots.sh`; see
`Docs/SCREENSHOTS.md`.

## 1. Create the GitHub repository (once)

github.com → **New repository** → `droplane-website` → Public → Create,
with no "initialize" boxes ticked. Then, from this folder:

```bash
git init && git add -A && git commit -m "DropLane website"
git branch -M main
git remote add origin https://github.com/isken-star/droplane-website.git
git push -u origin main
```

## 2. Turn on GitHub Pages

Repo → **Settings → Pages** → Source "Deploy from a branch" →
Branch `main`, folder `/ (root)` → Save.
Custom domain: `www.droplane.co.uk` → Save. Tick **Enforce HTTPS** once the
certificate has issued (minutes to an hour).

## 3. GoDaddy DNS

GoDaddy → My Products → droplane.co.uk → **DNS**:

| Type  | Name | Value                | Why |
|-------|------|----------------------|-----|
| CNAME | www  | isken-star.github.io | serves the site |
| A     | @    | 185.199.108.153      | apex redirects to www |
| A     | @    | 185.199.109.153      | |
| A     | @    | 185.199.110.153      | |
| A     | @    | 185.199.111.153      | |

Delete any GoDaddy "Parked" or "Forwarding" record for `@` and `www` first.

**Do not touch the MX or TXT records.** They are what makes
help@droplane.co.uk work, and that address is printed inside the app and
used for App Store support. DNS usually settles in 15–60 minutes.

## 4. Once the site is live

- App Store Connect → Support URL `https://www.droplane.co.uk/support`,
  Privacy Policy URL `https://www.droplane.co.uk/privacy`.
- The paywall needs visible links to `/terms` and `/privacy` before review;
  auto-renewing subscriptions are rejected without them.
