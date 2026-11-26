---
paths:
  - "docs/**/*.rst"
---

# reStructuredText

The site is built by Sphinx from `docs/` and published on Read the Docs, with warnings treated as errors. Every page is reStructuredText, not Markdown, so Markdown syntax renders as literal text.

## Structure

- Title each page with `=` above and below. Mark sections with `=` underneath, then `-`, then `~`. Underlines must be at least as long as the heading text.
- Add a new page to the `toctree` of its section's `index.rst`, or Sphinx warns and the build fails.
- Never hard-wrap prose. Each paragraph and each list item is one line. `doc8.ini` turns off the line-length check for this reason.

## Markup

- Inline code takes double backticks: ``` ``ContainerBuilder`` ```. Single backticks are not code in reStructuredText.
- Link to another page with ``:doc:`../advanced/adapters-decorators` `` and to a labeled section with ``:ref:`label` ``. Define a label as `.. _label:` on its own line above the heading. Write external links as `` `link text <https://example.com>`_ ``.
- Show code with `.. sourcecode:: csharp`, followed by a blank line and the code indented four spaces.
- Use `.. note::`, `.. warning::`, and `.. important::` for callouts, sparingly.
- Put images in a `media` folder beside the page and give each one `:alt:` text.

## Content

- Document behavior a user can rely on, through the public API. Internals change between releases and do not belong on the site.
- Make code samples complete enough to compile in context, using the current API. A sample that uses an obsolete member teaches people to use it.
- When a feature needs a particular Autofac or integration version, say which.
- Change an existing page rather than adding a new one that overlaps it.

## Checks

Run `pre-commit run --all-files`, `npm run lint`, and the Sphinx build from `CONTRIBUTING.md` before submitting. The Sphinx build is the only check that catches a broken `:doc:` or `:ref:` reference.
