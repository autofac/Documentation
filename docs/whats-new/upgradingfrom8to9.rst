=================================
Upgrading from Autofac 8.x to 9.x
=================================

There are no public API changes in this one. Everything that compiled against 8.x still compiles against 9.x - the changes are in which frameworks Autofac targets and which versions of two dependencies come with it.

Target Frameworks
=================

``net6.0`` and ``net7.0`` were dropped, and ``net10.0`` added. The target set went from ``net8.0;net7.0;net6.0;netstandard2.1;netstandard2.0`` to ``net10.0;net8.0;netstandard2.1;netstandard2.0``.

If your application still targets ``net6.0`` or ``net7.0`` you can keep using this release, because both of those implement ``netstandard2.1`` and will resolve that asset instead. You lose nothing functionally; you are simply no longer running against a framework-specific build.

Dependencies
============

Two package references moved to their 10.x versions, and because they flow to you transitively they raise the floor for your application too:

- ``System.Diagnostics.DiagnosticSource`` from 8.0.1 to 10.0.0, on every target framework.
- ``Microsoft.Bcl.AsyncInterfaces`` from 8.0.0 to 10.0.0, on the ``netstandard2.0`` target only.

If something else in your dependency graph pins either of those to an 8.x version, that is the conflict to expect.

What You Gain
=============

The 9.x line added a fair amount that is worth knowing about once you have upgraded:

- :doc:`Native support for AnyKey and the ServiceKey attribute <../advanced/keyed-services>`, so a single registration can answer any key and a component can be told which key it was resolved under.
- :doc:`Opt-in metrics <../troubleshooting/metrics>` for resolve timing and lock contention.
- :doc:`Trimming and Native AOT annotations <../advanced/native-aot-trimming>`, which let the compiler tell you which Autofac features are safe to trim.
