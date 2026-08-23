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
`Docs/SCREENSHOTS.md`. The clips in the hero and under "What did the day
actually pay?" come from `Scripts/cut_film.sh`; see `Docs/FILM.md`.

## 1. The repository — done

`github.com/isken-star/droplane-website`, public, `main`. Push updates from
this folder after a rebuild:

```bash
python3 ../Scripts/build_site.py && git add -A && git commit -m "…" && git push
```

## 2. GitHub Pages — done

Serving `main` at the root, custom domain `www.droplane.co.uk` (from the
`CNAME` file). **Enforce HTTPS** can only be ticked once the certificate has
issued, which needs the DNS below to be pointing at GitHub first.

## 3. GoDaddy DNS — the only step left

At the time of writing, `www.droplane.co.uk` is a CNAME to the apex, and the
apex answers `76.223.105.230` / `13.248.243.5` — GoDaddy's parking, not
GitHub. Until that changes the site is built but unreachable.

## The records

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
