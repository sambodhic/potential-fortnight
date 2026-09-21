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

The six included records are fictional examples, clearly labeled throughout. Remove `example-*.json` before a real launch and add researched records. Visitors can submit problems through the Add a problem form. Contact verification and fundraising are not implemented.

## Validate and publish

```sh
python3 manage.py check
python3 manage.py build
```

Publish the generated `dist/` folder to any static host. Build with both repositories checked out; the resulting website is self-contained. Rebuild after changing JSON. Do not publish the raw repository as the site root. Problem links use `#problem/ID`, requiring no routing configuration.

No analytics, accounts, or backend database. Only publish contact details you have permission to share.

## Submission email setup

The form sends submissions to `problems@unsolved.fyi` through [FormSubmit](https://formsubmit.co/), using its AJAX endpoint so visitors stay on the site. It works with the static build; no email credentials are embedded in the site.

**Before launch:** submit the form once from the hosted site, open the activation email in `problems@unsolved.fyi`, and confirm the address. Then send another test and verify that its full contents arrive. Delivery is not operationally verified until this is done. See [FormSubmit setup](https://formsubmit.co/) and [AJAX documentation](https://formsubmit.co/ajax-documentation).

A thank-you message appears only after the provider reports success. This is an on-screen confirmation, not an automatic email to the submitter. Failed requests preserve the entered details and offer retry or direct email. The form includes a honeypot and prevents duplicate clicks during submission. The provider processes the submitted name, email, and problem details; the form discloses this to visitors.

Submissions are reviewed by email and manually added to `laughing-fiesta/problems/`; they are not automatically published. Only publish a submitter’s contact information with their permission.

## Offers to help

Each problem detail includes an “I can help” form. It emails the offer, problem ID, title, and link to the same FormSubmit inbox. Offers do not change problem status or publish contact information. Review them manually, ask permission before sharing contacts, and connect suitable helpers with a local contact. Offers on fictional examples are clearly marked as demos. The existing FormSubmit activation is required for delivery.
