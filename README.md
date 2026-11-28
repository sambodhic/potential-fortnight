# Unsolved.fyi

A responsive, accessible starting point for a curated directory of local infrastructure needs. Plain HTML, CSS, and JavaScript; Python 3.10+ for preview/build. No package installation needed. The optional Google Fonts stylesheet falls back to system fonts offline.

## Preview

Keep the two repositories side by side:

```
unsolved/
  potential-fortnight/
  laughing-fiesta/
    problems/*.json
```

From `potential-fortnight`:

```sh
python3 manage.py serve
```

Open http://localhost:8000. JSON is read on each page refresh. Use `--port 8001` for another port. Set `CONTENT_DIR=/absolute/path/to/laughing-fiesta` if content lives elsewhere.

## Add content

Copy `../laughing-fiesta/problem.template.json` into `../laughing-fiesta/problems/a-unique-name.json`, edit the fields, and refresh. Each record needs a unique ID. See the content repository README for field guidance. Search includes title, summary, location, country, category, and needs. Country and category filters populate automatically.

The homepage keeps the tilted introduction card and an interactive world map above the needs filters. Map pins use the deduplicated unified inventory, follow search and topic filters, and select the same country filter as the list.

The homepage has one Needs list combining sourced directory records and research reports, with shared search, country, and category filters. Cards show topic categories and a separate amber Unverified indicator when current conditions have not been verified; source provenance remains in the details. Open a need to see its verification status, evidence and offer-help form. Research reports without editorial categories are classified from their titles into relevant topics independently of verification. A need can appear under multiple topic filters; explicit categories take precedence, with Infrastructure as a fallback for ambiguous titles. The list loads 24 cards at a time with Show more; source files remain separate and unchanged. Reports already represented by a directory record's `sourceCandidateId`, and archived promoted reports, are excluded to avoid duplicates. If one source fails, the other remains browsable with a partial-load notice.

Visitors can share needs through the submission form. The six fictional examples remain archived in `../laughing-fiesta/examples/` and excluded from preview/build data. Contact verification and payments are not implemented.

## Validate and publish

```sh
python3 manage.py check
python3 manage.py build
```

Publish the generated `dist/` folder to any static host. Build with both repositories checked out; the resulting website is self-contained. Rebuild after changing JSON. Do not publish the raw repository as the site root. Problem links use `#problem/ID`, requiring no routing configuration.

Optional opt-in Google Analytics; no accounts or backend database. Only publish contact details you have permission to share.

## Submission email setup

The form sends submissions to `problems@unsolved.fyi` through [FormSubmit](https://formsubmit.co/), using its AJAX endpoint so visitors stay on the site. It works with the static build; no email credentials are embedded in the site.

**Before launch:** submit the form once from the hosted site, open the activation email in `problems@unsolved.fyi`, and confirm the address. Then send another test and verify that its full contents arrive. Delivery is not operationally verified until this is done. See [FormSubmit setup](https://formsubmit.co/) and [AJAX documentation](https://formsubmit.co/ajax-documentation).

A thank-you message appears only after the provider reports success. This is an on-screen confirmation, not an automatic email to the submitter. Failed requests preserve the entered details and offer retry or direct email. The form includes a honeypot and prevents duplicate clicks during submission. The provider processes the submitted name, email, and problem details; the form discloses this to visitors.

Submissions are reviewed by email and manually added to `laughing-fiesta/problems/`; they are not automatically published. Only publish a submitter’s contact information with their permission.

## Offers to help

Each problem detail includes an “I can help” form. It emails the offer, problem ID, title, and link to the same FormSubmit inbox. Offers do not change problem status or publish contact information. Review them manually, ask permission before sharing contacts, and connect suitable helpers with a local contact. Offers on fictional examples are clearly marked as demos. The existing FormSubmit activation is required for delivery.

## Research candidates

The main Needs list and the optional `research.html` view use a public projection of `research/candidates.json`. Both local preview and static builds allow only public listing fields and source links. Internal review notes, screening decisions, unconfirmed organizations/contact routes, reported cost notes, source-access notes, contact details, and unknown fields are excluded. The original data stays in the content repository. Public titles, locations, scope, next steps, dates, verification status, and source links are downloadable by visitors. Restart the preview server after changing `manage.py`.

The build recreates `dist/` to remove stale files. Keep private files and credentials outside `site/`. `dist/`, local environment files, and common credential files are ignored by Git.

## Promote research into problems

`python3 manage.py promote --candidate ID --id SLUG --category Water --summary 'Reviewed public text' --need 'A specific next step'` previews a conversion. Add `--write` to create the problem and archive the research entry. No local verification or deployment is implied. See [the step-by-step guide](../laughing-fiesta/PROMOTING.md). Restart an existing preview server after installing the updated loader so promoted candidates are hidden there.

## Research world map

The research page includes country count pins, country filtering, drag-to-pan, zoom buttons, and an expanded dialog (Escape closes it). Search and review status update the pin counts; choosing a country keeps the other countries visible for comparison. Country pins are approximate locations, not individual issue coordinates. The map supports keyboard selection of pins and shares the existing light/dark theme.

`site/world-map.json` contains locally hosted simplified country outlines and approximate country centers, derived from [Natural Earth country boundaries](https://github.com/datasets/geo-countries) (public domain). No map API key or external runtime map service is required. New country names without matching coordinates remain available in the country selector and are identified below the map.

## Privacy and Google Analytics

`site/privacy.html` describes forms, public listings, browser storage, fonts, and optional analytics. Privacy and analytics preference links appear on every page and form notices link to the policy.

Set `window.UNSOLVED_ANALYTICS_ID` in `site/analytics-config.js` to your public GA4 web-stream measurement ID (`G-...`), then rebuild and deploy. An empty ID keeps analytics disabled and hides the initial prompt. No Google Analytics script loads until a visitor opts in. Preferences can be changed from the footer or privacy page; declining stops collection and reloads if the tag was already loaded. Choices persist in local storage when available.

**GA4 setup:** disable Enhanced Measurement for this web stream (including form interactions, site search, and browser-history page views) to keep collection limited to the explicit page views in this hook. Leave user-provided data collection off. The hook strips query strings and fragments, omits referrers, and disables advertising signals and personalization. See [Google configuration reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/config) and [page-view documentation](https://developers.google.com/analytics/devguides/collection/ga4/views).

Verify in the hosted site's browser network panel and GA4 Realtime: no tag request before consent or after declining; one page view after allowing and on each subsequent page load. Test preference withdrawal and navigation across all three pages. Ad blockers may prevent delivery. The measurement ID and GA4 property settings must be supplied before live collection can be verified.
