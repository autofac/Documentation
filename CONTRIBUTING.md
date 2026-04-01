# Contributing to the Documentation

User documentation is viewable at <https://docs.autofac.org> (a CNAME to <https://autofac.readthedocs.io>). It is stored in the `/docs` folder in this source repo.

We also have API docs at <https://autofac.org/apidoc/>. This documentation is what gets put in the <https://github.com/autofac/autofac.github.com/tree/master/apidoc> folder.

- [Initial Checkout and Setup](#initial-checkout-and-setup)
- [Validating Changes](#validating-changes)
- [VS Code Integration](#vs-code-integration)
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

```powershell
# Register pre-commit hooks (runs linters before commits)
pre-commit install

# Set up your Python virtual environment
python3 -m venv .venv

# Activate the virtual environment (cross-platform)
.venv\Scripts\Activate.ps1

# Restore dependencies
npm install
pip install -r ./docs/requirements.txt
dotnet tool restore

# When you're done, deactivate your virtual environment.
deactivate
```

## Validating Changes

This repository uses `pre-commit` hooks to automatically validate code quality. These hooks run automatically when you commit, and include:

- **eslint**: Lints JavaScript files
- **markdownlint**: Checks Markdown formatting in `.md` files
- **doc8**: Validates reStructuredText (`.rst`) files in the `docs/` folder for formatting and style issues
- **General checks**: YAML/JSON validation, trailing whitespace, merge conflict markers, etc.

You can also run the pre-commit hooks or linting manually:

```powershell
# Run the pre-commit hooks
pre-commit run --all-files

# Run the linting
npm run lint
```

## VS Code Integration

There are tasks set up to build the docs and browse things after build. You may find issues where, if you try to launch the docs, you'll get errors indicating the Python virtual environment hasn't been activated in that terminal.

From the command palette, select "Python Envs: Activate Environment in Current Terminal" and it should pick up your `.venv` and activate it. Then the launch should work for you to browse.

The tasks all assume you're working with PowerShell since that's cross-platform.

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

# Browse the docs at http://localhost:8081
npm run browse-doc
```

Build the docs after you edit them. There should be NO errors or warnings: `make html`

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

```powershell
# Build the docs.
dotnet msbuild build-apidoc/Documentation.proj

# Browse the docs at http://localhost:8080
npm run browse-apidoc
```

This will:

1. Restore .NET tools (including `docfx`)
2. Clean previous build artifacts
3. Restore NuGet packages and build API metadata for both `net10.0` and `net472`
4. Merge metadata into one logical DocFX output
5. Generate HTML documentation

Build output is in `build-apidoc/artifacts/doc/Website/`.

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
   - Set **Repository Permissions** / `Contents`: Read & write (to push docs to autofac.github.com)
   - Set **Where can this GitHub App be installed?**: Only on this account
   - Create the app and note the **App ID**
2. **Generate a private key**:
   - On the app page, scroll to "Private keys" and click "Generate a private key"
   - This downloads a `.pem` file—keep it secure
3. **Install the app on autofac.github.com**:
   - Go to the app's "Install app" tab or visit <https://github.com/apps/documentation-deployer>
   - Install it on the `autofac.github.com` repository only
4. **Store secrets in this repository** (<https://github.com/autofac/Documentation/settings/secrets/actions>):
   - `APIDOCS_APP_ID`: The app ID from step 1
   - `APIDOCS_APP_PRIVATE_KEY`: The full contents of the `.pem` file from step 2 (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

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
