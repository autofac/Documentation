=============
Owner's Guide
=============

Becoming an Autofac owner is going a step beyond :doc:`being a contributor <contributors>`. Ownership is a longer-term commitment and, honestly, may not be for everyone. That's OK. If you don't think you're up for it, we would still love to get your help :doc:`in the form of pull requests <contributors>` or answering questions on StackOverflow!

We haven't seen a great onboarding guide for getting owners up and productive or explaining the responsibilities so... this is our attempt at that.

Ownership is About Trust
========================

**This is the number one difference between ownership and contribution.**

If you're an Autofac owner, you're providing product and support for people and products around the world, whether you know it or not. From the smallest hobby project to enterprise-level solutions, Autofac and its integration packages are used everywhere.

There is an implicit trust between all of these projects and you. They trust that every change you make is doing something for the better. They trust that things have been well tested. They trust that if something has gone wrong in the latest release that there's going to be someone - **you** - there to answer questions, help debug things, and correct issues.

They trust that `you're not doing anything malicious <https://snyk.io/blog/malicious-code-found-in-npm-package-event-stream/>`_.

Being an owner is accepting that trust and always trying your best to do the right thing for the project and the community.

Code of Conduct
===============

`Our code of conduct is posted on GitHub <https://github.com/autofac/Autofac/blob/develop/CODE_OF_CONDUCT.md>`_. All owners must follow the code of conduct. Owners are responsible for enforcing the code of conduct on each other and on contributors.

Responsibilities
================

As an owner, you have a few additional responsibilities that a standard contributor doesn't have.

API Design
----------

Owners have the final say about the shape of the public API. Do we need a new class here or a new interface there? Is that new method overload really helpful? As noted :doc:`in contributors guide <contributors>`, there are a lot of things that may constitute breaking changes in the API. We can add things pretty easily... but removing them once the package has been taken is a major version increment and a breaking change for downstream consumers.

As contributions come in, or as you work on new features and functionality, you need to keep a conscious eye toward the public API footprint.

Autofac and its extension packages make use of internal classes for things that shouldn't be consumed by the public. This allows freedom to refactor without incurring breaking changes.

Bug Fixes and Enhancements
--------------------------

Issues are filed all the time to let us know about problems folks are having or new features they'd like. The vast majority of the time, these issues do not come with any associated pull request. It's up to you to fix things or add features based on the needs noted in the issue.

Implementing fixes and features is a lot more than just coding. You need to be able to imagine what other use cases out there are occurring and whether the thing you're changing is going to break that use case. You need to consider the API design and whether the thing you're implementing will be supportable long-term.

**There is no feature roadmap unless you make it.**

Most of the enhancements and new features implemented in Autofac start with issues someone files mentioning how something is currently hard and should be easier. In some cases, people may find a new way they'd like to use an existing feature but it's just not working right.

As an owner, you get to implement the fixes and features that other contributions aren't covering.

Performance and Testing
-----------------------

Performance is your responsibility. You may think of a great fix, but if it slows everything down, it's probably not the way to go. This additional feature someone asked for may sound awesome, but if it means an additional 10ms per resolve operation, it may need to be reconsidered. That cache idea to speed things up may be great, but if it takes an additional 100MB of RAM to support, the speed trade-off may not be worth it.

Whatever you're adding, whether from your own code or by virtue of accepting a contribution, needs to be considered from a performance and testing perspective. This isn't something most contributors check.

**If it isn't tested, don't release it.**

Issue Review
------------

Issues come in for a lot of reasons - from questions to bug reports to enhancement requests.

If the issue is a question, we generally try to get them to post to `StackOverflow <https://stackoverflow.com>`_ and tag the question ``autofac``. We do that because then the question can be searched by other people. People trying to figure out how something works largely won't come looking through the closed issues list in GitHub, so answering the question in GitHub only helps *that one person* while answering on StackOverflow can help many people. We also discourage folks from double-posting questions - if it's on StackOverflow *and* it's been filed on GitHub, put a link to the StackOverflow question in the issue and close the issue. (This information should also be in the issue template in every Autofac repo, so folks double-posting aren't actually reading the issue template.)

If the issue is a bug report, we need some ability to reproduce the issue so we can verify it. Ideally this is in the form of a simple, self-contained failing unit test. If there is no reproduction, encourage the person to add one so you can more adequately help.

As an owner, it's up to you to verify whether it's a bug or whether it's functioning as designed. If it's a bug, tag the issue as ``bug``. Now you can fix it or someone can submit a pull request to fix it. In any case, there really needs to be a unit test for any bug fixes so we don't regress the issue. Consider adding a comment in the unit test to indicate which issue is associated with the test.

For things that are functioning as designed, this is an opportunity for support. Explain why the reproduction the user submitted is invalid and show them how to fix it. Usually you can refer them to documentation or examples showing working versions of what they're trying to do.

For enhancement issues, there are a lot of things to consider.

- Is this something that can already be done with the existing API?
- Is this something that the *library* should own or is it something that would be better owned by the person's *application code*?
- How many other people would find this enhancement useful?
- How does this affect the public API?
- The change may be a good one, but will it break existing features?
- How will this affect performance?
- If it's a change to the way integration works with a third-party framework, is this something the third-party framework will be obsoleting soon?

Being an owner means you get to determine if an enhancement or bug someone has reported is actually something that should be addressed. In some cases, you're going to have to say no. **It's OK to say no.** Don't say no to everything, but... not everything is a good idea, either. If you do say no, explain to the user why that's the case so they can understand.

For example, say someone files a defect saying they didn't register any ``ICar`` implementations but somehow they can resolve ``IEnumerable<ICar>`` and it's empty. They think they should be getting ``null`` instead. Unfortunately, Autofac currently *intentionally* returns an empty collection. Changing that behavior would be very breaking, so that's not a fix we could provide. We'd say no to this.

Pull Request Review
-------------------

When a pull request comes in, it's up to you as an owner to determine whether it's something that should be accepted, whether it needs work before we can accept it, or whether it shouldn't be accepted at all.

**The ultimate responsibility for accepting a pull request and maintaining the contents of that PR is with the Autofac owners.**

If accepting and releasing the contents of a pull request breaks something, it'll be up to you as the owner to fix it. The original submitter will likely not be available in the required time frame to issue a fix if something breaks. By accepting the pull request code, you're accepting responsibility and ownership for that code on behalf of all the Autofac owners.

Things to consider as you look at a PR...

- Is it against the correct branch? PRs should be against ``develop`` since we follow Gitflow.
- Can we maintain it? There are some great optimizations that folks might submit, but if no one who owns Autofac understands how it works, it'll be hard to maintain long term if something goes wrong. The original PR submitter isn't the person who will own it, you are.
- Is it really big? We get a lot of really big pull requests that drastically change things. Some of these are fantastic. Some include breaking API changes we can't take. If it's super big, it takes a long time to review. You'll likely have to check out the PR branch, build it locally, and test it yourself. Is there a way to break it into smaller PRs? If it's this big, was there an issue filed first that explains the intent? (Usually a large PR should have an issue first.)
- Does it need tests? A PR for a spelling or doc fix is easy to take. For code... does the PR come with tests that verify the behavior? If not, it's your call as an owner - you can ask the submitter to write tests (which may result in the submitter abandoning the PR because they think it's too much effort) or you can accept the PR and add tests yourself after the fact.
- Does it break anything? Some PRs come with inadvertent breaking changes to the API, a refactor of something that didn't need to be refactored, for example.
- Did NuGet package references change? Lots of PRs include updates to NuGet packages that aren't technically required. Unless there's a technical reason to take the update, we need to keep on the lowest possible versions for widest compatibility. (Sometimes we'll get issues or PRs *just* to force that update. That's not the answer. If an individual app needs an update, they need to do that at the app level.)
- Does it adhere to our standards? The :doc:`Contributor's Guide <contributors>` outlines not only our general coding standards but the fact that everything should build and test with no errors, no warnings. Does the PR introduce any Roslyn analyzer warnings?

This isn't a complete list, but it gives you some ideas of things to look for. Not every pull request that comes in is something we can just accept straight up.

If you need clarification on things, ask the person who submitted the PR to explain stuff. A pull request isn't a thing where someone throws code over the wall to you, it's a community endeavor.

**If you want help looking at something, tag one of the other Autofac owners to give it a look. You're not alone.**

Support
-------

Support is one of those "hidden costs" of being an owner of an open source project. A lot more time goes to support than you might think. Sometimes you may spend more time on support than you do on coding things.

We accept support requests through a variety of channels.

- `StackOverflow <https://stackoverflow.com>`_ with questions that are tagged ``autofac``.
- `Google Groups <https://groups.google.com/forum/#!forum/autofac>`_
- `Twitter <https://twitter.com/autofacioc>`_
- `Gitter <https://gitter.im/autofac/Autofac>`_
- GitHub issues (though, ideally, "How do I...?" sorts of questions go on StackOverflow)

At a minimum, as an owner you should subscribe to the ``autofac`` questions on SO and the Google Group.

**You are not required to write other peoples' code for them.**

**You are not a free consultant service.**

Treat people cordially and with respect, however, there are an unfortunate number of questions that amount to, "I'm trying to write a super complex system and I'm using Autofac. Show me the code that implements this system." Don't feel obligated to implement other peoples' systems for them.

If you don't know the answer, that's OK. Try your best. It may require you learn something new in the Autofac space, which is helpful as an owner. That said, you're not required to memorize every framework Autofac integrates with, so there will be times you don't know and that's OK.

Documentation and Examples
--------------------------

Documentation is how many people understand how Autofac and its integration works.

Documentation takes many forms:

- Long-form prose, like the site you're reading now. Something that explains in detail how to use something with examples.
- XML API documentation. These are the ``<summary>`` sorts of comments on members in the code. IntelliSense is generated from this content, as is the HTML API documentation.
- Inline code comments. If there's a particularly difficult to understand section of code or something in the code that might be confusing ("Why did this variable have to get proactively disposed right here?"), adding a small comment to explain *why* something is happening can help other contributors to not regress defects or inadvertently create performance issues.

As an owner, you're responsible for *all of these types of documentation.* People around the world learn in different ways. Not all of them are ready to dive into GitHub repos and "read the code." It's our job to try to accommodate all the different levels of learners with the docs they require.

Examples may be:

- Small projects that demonstrate an end-to-end feature. We have a whole `Examples repository <https://github.com/autofac/Examples>`_ with this sort of thing. These are helpful to show (and test) real working integration features.
- Unit tests. These are harder to interpret for some users, but are good for being "executable specifications" of how something should work.
- Inline examples. In the documentation, you can pull from small projects or unit tests to create code snippets that illustrate how to use a feature.

Again, as an owner, it's up to you to help support the project with proper docs and examples so people know how to consume the libraries.

Compatibility
-------------

**It is an explicit goal to be as compatible with as much as possible at any given time.**

:doc:`The contributors guide <contributors>` talks about different considerations in compatibility. Briefly:

- Framework compatibility: Changing from ``netstandard1.0`` to ``netstandard2.0`` as a minium requirement for a library means all the consumers using the library can no longer take an upgrade.
- API compatibility: Adding a new member on an interface, moving an extension method to a different static class, or even adding an optional parameter on an existing method is a breaking public API change. Doing that will break someone consuming that API if they take the upgrade.
- Dependency compatibility: If an Autofac component takes an upgrade to a dependency, it effectively forces all of the consumers of that Autofac component to also take the upgrade. In general, we should leave that choice up to the application developer where possible. There may be a technical reason to take an upgrade, like an integration that needs to take advantage of a new feature. Those choices need to be weighed individually.

As you maintain Autofac, it's up to you as an owner to determine when it's a good time to make a change that will potentially break the thousands of projects consuming the library you're working on. These are hard decisions. It's OK to ask for help.

From a general policy perspective, we should always be *compatible* with the latest release of a third party framework with which we integrate. That doesn't always mean we *require* the latest version, but that we're *compatbile* with it. If there is a choice where the two are mutually exclusive - we can *either* be compatible with the older stuff *or* we have to move forward... we'll choose to move forward.

Release Process
===============

We follow the [Gitflow workflow process](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow/). Ongoing development should happen in the ``develop`` branch. Continuous integration builds get published to MyGet and can be consumed for testing purposes.

When it's time to cut a release, we'll:

- Ensure the semantic version is correct based on the changes since the last release. Update if needed, do a final CI build on the ``develop`` branch.
- Merge ``develop`` into ``master`` and tag the repo with ``vX.Y.Z`` using the semantic version of the release.
- After the CI build is complete and pushed to MyGet, push the package from MyGet to NuGet as the final release.
- When NuGet has the new release, download the published package manually from NuGet.
- Create a release page on the GitHub repository for the thing that just released. In that release page, add the release notes explaining the changes that have taken place. Upload the .nupkg you downloaded from NuGet so folks can get it if needed.

We maintain the manual .nupkg download because there are some areas around the world that may have NuGet blocked or strongly filtered. This allows those areas to manually get the library if they need it and host their own repository.

You Are Not Alone
=================

As an Autofac owner, you're part of a small community of folks who have all committed to providing ongoing support for a popular package consumed by people all over the world. It's a lot of responsibility and it can be overwhelming.

Just remember, you're not alone. You're part of the team. If you need help from one of the other owners, say so. At some point, someone else may need help from you. That's great! Let's work together to make this the best inversion-of-control container out there.
