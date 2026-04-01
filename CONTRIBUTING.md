# Contributing to the Documentation

User documentation is viewable at <https://docs.autofac.org> (a CNAME to <https://autofac.readthedocs.io>). It is stored in the `/docs` folder in this source repo.

We also have API docs at <https://autofac.org/apidoc/>. This documentation is what gets put in the <https://github.com/autofac/autofac.github.com/tree/master/apidoc> folder.

- [Initial Checkout and Setup](#initial-checkout-and-setup)
- [Validating Changes](#validating-changes)
  - [Pre-commit Hooks](#pre-commit-hooks)
  - [Manual Linting](#manual-linting)
- [Updating User Docs](#updating-user-docs)
- [Updating API Documentation](#updating-api-documentation)
  - [Adding/Updating Doc Sources](#addingupdating-doc-sources)
  - [Building the Documentation](#building-the-documentation)
  - [Deploying API Documentation](#deploying-api-documentation)
  - [Setting Up Automated Deployment (One-Time Setup)](#setting-up-automated-deployment-one-time-setup)
- [Updating the Primary Documentation Version](#updating-the-primary-documentation-version)
- [References](#references)

## Initial Checkout and Setup

Prerequisites:

- Node 22 or later
- Python 3.12 or later
- .NET SDK 10.0 or later
- [pre-commit](https://pre-commit.com)

After cloning, set up the tools and dependencies.

```bash
# Register pre-commit hooks (runs linters before commits)
pre-commit install

# Set up your Python virtual environment
python3 -m venv .venv

# Activate the virtual environment (cross-platform)
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\Activate.ps1

# Restore dependencies
npm install
pip install -r ./docs/requirements.txt

# Restore .NET tools (including docfx for API docs)
dotnet tool restore

# When you're done, deactivate your virtual environment.
deactivate
```

## Validating Changes

### Pre-commit Hooks

This repository uses `pre-commit` hooks to automatically validate code quality. These hooks run automatically when you commit, and include:

- **eslint**: Lints JavaScript files
- **markdownlint**: Checks Markdown formatting in `.md` files
- **doc8**: Validates reStructuredText (`.rst`) files in the `docs/` folder for formatting and style issues
- **General checks**: YAML/JSON validation, trailing whitespace, merge conflict markers, etc.

To run the hooks manually on all files:

```bash
pre-commit run --all-files
```

To bypass hooks during development (not recommended):

```bash
git commit --no-verify
```

### Manual Linting

To run all linters manually:

```bash
npm run lint
```

This command runs eslint, markdownlint, and doc8 in sequence. Fix any issues before committing.

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

To browse rendered user docs through a local web server:

```bash
npm run browse-doc
```

Then open <http://localhost:8081/> in your browser.

## Updating API Documentation

The API documentation is built with [DocFX](https://dotnet.github.io/docfx/) and hosted on `autofac.github.com/apidoc/`. The documentation build process is automated, but you may need to update it when adding new Autofac packages or versions.

The `Placeholder` project in `build-apidoc/` holds NuGet references to the various Autofac packages to document.

### Adding/Updating Doc Sources

1. Update the NuGet package version in `build-apidoc/Placeholder/Placeholder.csproj`.
2. The `Microsoft.NETFramework.ReferenceAssemblies.net472` package enables cross-platform compilation, so you can build on Windows, macOS, or Linux.
3. Add package references under the framework-specific item group that matches compatibility (`net10.0` for modern packages, `net472` for legacy ASP.NET/.NET Framework integrations).
4. Ensure target packages have XML documentation files (most Autofac packages do).

### Building the Documentation

API documentation is built using [DocFX](https://dotnet.github.io/docfx/), which reads compiled assemblies and their XML documentation to generate static HTML.

To build locally:

```bash
dotnet msbuild build-apidoc/Documentation.proj
```

This will:

1. Restore .NET tools (including `docfx`)
2. Clean previous build artifacts
3. Restore NuGet packages and build API metadata for both `net10.0` and `net472`
4. Merge metadata into one logical DocFX output
5. Generate HTML documentation

Build output is in `build-apidoc/artifacts/doc/Website/`.

To browse rendered API docs through a local web server:

```bash
npm run browse-apidoc
```

Then open <http://localhost:8080/> in your browser.

DocFX may generate warnings about missing XML documentation. These indicate methods/types without doc comments. Consider submitting a PR to add documentation if you find gaps!

### Deploying API Documentation

API documentation is automatically deployed to `autofac.github.com/apidoc/` when you push to the `master` branch (via the `.github/workflows/deploy-apidoc.yaml` workflow). The workflow:

1. Builds the API documentation using DocFX
2. Synchronizes the built docs to the `autofac/autofac.github.com` repository
3. Removes any files that are no longer in the generated docs
4. Commits and pushes the changes

### Setting Up Automated Deployment (One-Time Setup)

To enable the automated deployment workflow, a repository admin must:

1. **Create a GitHub App** (for the autofac organization):
   - Go to <https://github.com/organizations/autofac/settings/apps>
   - Create a new GitHub App with the name "Documentation Deployer"
   - Set **Permissions**:
     - `Contents`: Read & write (to push docs to autofac.github.com)
   - Set **Where can this GitHub App be installed?**: Only on this account
   - Create the app and note the **App ID**
2. **Generate a private key**:
   - On the app page, scroll to "Private keys" and click "Generate a private key"
   - This downloads a `.pem` file—keep it secure
3. **Install the app on autofac.github.com**:
   - Go to the app's "Install app" tab or visit <https://github.com/apps/documentation-deployer>
   - Install it on the `autofac.github.com` repository only
4. **Store secrets in this repository** (<https://github.com/autofac/Documentation/settings/secrets/actions>):
   - `APP_ID`: The app ID from step 1
   - `APP_PRIVATE_KEY`: The full contents of the `.pem` file from step 2 (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

Once set up, pushing to `master` will automatically deploy updated API docs to `autofac.github.com/apidoc/`.

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
