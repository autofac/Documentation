# Autofac Documentation
Usage and API documentation for Autofac and integration libraries.

[![Documentation Status](https://readthedocs.org/projects/autofac/badge/?version=latest)](https://readthedocs.org/projects/autofac/?badge=latest)

**[Check out the Autofac documentation at docs.autofac.org!](http://docs.autofac.org/)**

## Updating the User Documentation Site

User documentation is viewable at [https://docs.autofac.org](https://docs.autofac.org)
(a CNAME to [https://autofac.readthedocs.org](https://autofac.readthedocs.org)).
It is stored in the `/docs` folder in this source repo.

To build the docs and see them locally, you need to follow the
[Getting Started](https://docs.readthedocs.org/en/latest/getting_started.html)
docs on Read The Docs so you get Python and Sphinx installed.

The docs are written in [reStructuredText](http://sphinx-doc.org/rest.html),
which is very similar to Markdown but not quite. References below.

Updates to the documentation checked into the `/docs` folder will automatically
propagate to Read The Docs. No build or separate push is required.

## Building

1. Install [Python 2.7](https://www.python.org/download/)
2. Install Python [setuptools](https://pypi.python.org/pypi/setuptools) (to get the easy_install script)
3. Install Sphinx: `easy_install -U Sphinx`
4. Build the docs after you edit them. There should be NO errors or warnings: `make.bat html`

## References

* [ReStructured Text Quick Start](http://docutils.sourceforge.net/docs/user/rst/quickstart.html)
* [ReStructured Text Quick Reference](http://docutils.sourceforge.net/docs/user/rst/quickref.html)
* [ReStructured Text Cheat Sheet](http://docutils.sourceforge.net/docs/user/rst/cheatsheet.txt)
* [ReStructured Text Primer](http://sphinx-doc.org/rest.html)
* [Sphinx Markup Constructs](http://sphinx-doc.org/markup/index.html)
* [ReadTheDocs Getting Started](https://docs.readthedocs.org/en/latest/getting_started.html)