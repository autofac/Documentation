# Autofac Documentation

Usage and API documentation for Autofac and integration libraries.

[![Documentation Status](https://readthedocs.org/projects/autofac/badge/?version=latest)](https://readthedocs.org/projects/autofac/?badge=latest)

**[Check out the Autofac documentation at docs.autofac.org!](https://docs.autofac.org/)**

## Updating the User Documentation Site

User documentation is viewable at [https://docs.autofac.org](https://docs.autofac.org)
(a CNAME to [https://autofac.readthedocs.io](https://autofac.readthedocs.io)).
It is stored in the `/docs` folder in this source repo.

To build the docs and see them locally, you need to follow the
[Getting Started](https://docs.readthedocs.org/en/latest/getting_started.html)
docs on Read The Docs so you get Python and Sphinx installed.

The docs are written in [reStructuredText](http://sphinx-doc.org/rest.html),
which is very similar to Markdown but not quite. References below.

Updates to the documentation checked into the `/docs` folder will automatically
propagate to Read The Docs. No build or separate push is required.

### Building

1. Install [Python 2.7](https://www.python.org/download/)
2. Install Sphinx: `pip install sphinx sphinx-autobuild`
3. Build the docs after you edit them. There should be NO errors or warnings: `make.bat html`

### References

* [ReStructured Text Quick Start](http://docutils.sourceforge.net/docs/user/rst/quickstart.html)
* [ReStructured Text Quick Reference](http://docutils.sourceforge.net/docs/user/rst/quickref.html)
* [ReStructured Text Cheat Sheet](http://docutils.sourceforge.net/docs/user/rst/cheatsheet.txt)
* [ReStructured Text Primer](http://sphinx-doc.org/rest.html)
* [Sphinx Markup Constructs](http://sphinx-doc.org/markup/index.html)
* [ReadTheDocs Getting Started](https://docs.readthedocs.org/en/latest/getting_started.html)

## Updating API Documentation

The API documentation is hosted on `autofac.github.com` and the rendered/built docs are in there. This repository has the project that enables _building_ the doc (a manual process) but publishing is a separate step.

The `Placeholder` project holds references to the various Autofac packages to document. Use that as the basis for gathering the list of doc sources.

### Adding/Updating Doc Sources

1. Add or update the NuGet package to the `Placeholder` project.
2. Open the `app.config` for the `Placeholder` project and copy the assembly binding redirects to the appropriate location in `Documentation.shfbproj`. These are required for the documentation project to obey redirects.

### Building the Documentation

Run `msbuild Documentation.proj` to kick off the build. This will restore required NuGet packages, build the `Placeholder` project, and run documentation on the Autofac referenced assemblies.

The build generates a lot of warnings. These indicate where we're missing documentation. (If you're looking to submit a PR, better API docs is a good thing...)

Build output gets put in the `artifacts` folder.

The contents of `artifacts\doc\Website` is what gets copied to the `autofac.github.com` repo.
