# Contributing to the Documentation

User documentation is viewable at <https://docs.autofac.org> (a CNAME to <https://autofac.readthedocs.io>). It is stored in the `/docs` folder in this source repo.

We also have API docs at <https://autofac.org/apidoc/>. This documentation is what gets put in the <https://github.com/autofac/autofac.github.com/tree/master/apidoc> folder.

- [Initial Checkout and Setup](#initial-checkout-and-setup)
- [Updating User Docs](#updating-user-docs)
- [Updating API Documentation](#updating-api-documentation)
  - [Adding/Updating Doc Sources](#addingupdating-doc-sources)
  - [Building the Documentation](#building-the-documentation)
- [Updating the Primary Documentation Version](#updating-the-primary-documentation-version)
- [References](#references)

## Initial Checkout and Setup

Prerequisites:

- Node
- Python 3
- [pre-commit](https://pre-commit.com)

After cloning, set up the tools and dependencies.

```powershell
# Register pre-commit
pre-commit install

# Set up your Python virtual environment
python3 -m venv .venv
./.venv/bin/Activate.ps1

# Restore dependencies
npm install
pip install -r ./docs/requirements.txt

# When you're done with docs, deactivate your virtual environment.
deactivate
```

## Updating User Docs

To build the docs and see them locally, you need to follow the [Getting Started](https://docs.readthedocs.org/en/latest/getting_started.html) docs on Read The Docs so you get Python and Sphinx installed.

The docs are written in [reStructuredText](http://sphinx-doc.org/rest.html), which is very similar to Markdown but not quite. References below.

Updates to the documentation checked into the `/docs` folder will automatically propagate to Read The Docs. No build or separate push is required.

```powershell
# Start the automatic PlantUML .puml converter so your diagrams will render as
# you edit them.
npm run watch

# Build the docs after any edits. It should build with NO errors or warnings.
cd ./docs
make html
```

Build the docs after you edit them. There should be NO errors or warnings: `make html`

You can browse the rendered docs by opening the `./docs/_build/html/index.html` file in your browser.

## Updating API Documentation

The API documentation is hosted on `autofac.github.com` and the rendered/built docs are in there. This repository has the project that enables _building_ the doc (a manual process) but publishing is a separate step.

The `Placeholder` project holds references to the various Autofac packages to document. Use that as the basis for gathering the list of doc sources.

### Adding/Updating Doc Sources

1. Add or update the NuGet package to the `Placeholder` project.
2. Open the `app.config` for the `Placeholder` project and copy the assembly binding redirects to the appropriate location in `Documentation.shfbproj`. These are required for the documentation project to obey redirects.

### Building the Documentation

Run `dotnet msbuild Documentation.proj` to kick off the build. This will restore required NuGet packages, build the `Placeholder` project, and run documentation on the Autofac referenced assemblies.

The build generates a lot of warnings. These indicate where we're missing documentation. (If you're looking to submit a PR, better API docs is a good thing...)

Build output gets put in the `artifacts` folder.

The contents of `artifacts\doc\Website` is what gets copied to the <https://github.com/autofac/autofac.github.com/tree/master/apidoc> folder.

## Updating the Primary Documentation Version

When a new core Autofac version is released, we need to update the docs so that the "latest" is always tagged with the right Autofac version. This happens in a few places:

1. In `./.github/workflows/update-version-tag.yaml` there is a tag setting that indicates which doc tag the `master` branch should follow. This keeps `latest` and that tag version in alignment.
2. In `./docs/conf.py` there are `version` and `release` values that indicate the version information that will be rendered into the pages.

## References

- [ReStructured Text Quick Start](http://docutils.sourceforge.net/docs/user/rst/quickstart.html)
- [ReStructured Text Quick Reference](http://docutils.sourceforge.net/docs/user/rst/quickref.html)
- [ReStructured Text Cheat Sheet](http://docutils.sourceforge.net/docs/user/rst/cheatsheet.txt)
- [ReStructured Text Primer](http://sphinx-doc.org/rest.html)
- [Sphinx Markup Constructs](http://sphinx-doc.org/markup/index.html)
- [ReadTheDocs Getting Started](https://docs.readthedocs.org/en/latest/getting_started.html)
