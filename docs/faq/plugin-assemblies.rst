=============================================
Why isn't my plugin assembly getting loaded?
=============================================

Because Autofac isn't the thing that loads it. **Autofac scans assemblies you hand it; it never finds or loads assemblies on your behalf.** ``RegisterAssemblyTypes(someAssembly)`` needs an ``Assembly`` object, and getting one is the runtime's job, not the container's.

This trips people up because plugins usually get wired up through the container, so a plugin that fails to show up looks like a registration problem. If the type isn't in the container, the question to ask first is whether the assembly was ever loaded - not whether the scan matched.

.. contents::
  :local:

Confirming Where the Problem Is
===============================

Check whether the assembly is loaded before looking at registrations at all:

.. sourcecode:: csharp

    // If your plugin assembly isn't in here, no amount of registration
    // configuration will help.
    foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
    {
      Console.WriteLine(assembly.FullName);
    }

If it is loaded and the types still aren't resolving, then it is a registration question, and :doc:`the assembly scanning documentation <../register/scanning>` is the place to go - particularly the filtering rules, since ``AsImplementedInterfaces`` and ``Where`` clauses quietly exclude more than people expect.

How Assemblies Get Found Differs by Application
===============================================

There is no single answer, which is much of why this is hard:

- **Modern .NET** loads on demand and does not sweep the output folder. Unreferenced assemblies need locating and loading explicitly, usually through an ``AssemblyLoadContext``. :doc:`Autofac supports scoping registrations to a load context <../advanced/scopes-loadcontexts>` so plugin types can be unloaded again.
- **ASP.NET classic** has its own rules. Assemblies for a web application are managed by ``BuildManager``, and a plugin assembly that isn't referenced has to be registered with it - :doc:`the MVC integration page covers doing that <../integration/mvc>`. Scanning ``AppDomain.CurrentDomain.GetAssemblies()`` in a web app is also unreliable, :doc:`for reasons the IIS restart FAQ explains <iis-restart>`.
- **Console and desktop applications** on .NET Framework behave differently again, resolving from the application base and probing paths.

`The configuration example <https://github.com/autofac/Examples/tree/main/src/ConfigurationExample>`_ shows one way to handle this on modern .NET, hooking ``AssemblyLoadContext.Default.Resolving`` to load a plugin assembly from the output folder. Treat it as an illustration of the shape of the problem, not as a recommendation - it is deliberately the simplest thing that works for an example.

Things Autofac Does Not Decide For You
======================================

If you are building a plugin system rather than loading one assembly, the design questions below are yours. None of them have Autofac answers, and picking differently changes what your loading code has to do:

- **Where plugins live.** A known folder, configuration, a package feed, somewhere else.
- **How plugin dependencies resolve.** Two plugins wanting different versions of the same library is the case that hurts, and isolating them means separate load contexts.
- **Whether plugins can be unloaded.** Unloading requires a collectible load context and that nothing outside it holds a reference, which is difficult to guarantee.
- **Trust.** Loading an assembly runs its code. If plugins are not fully trusted, inspecting before loading is a decision to make deliberately.
- **What counts as a plugin.** An interface, an attribute, a naming convention - this one is the only piece Autofac participates in, through the scanning filters.

Getting those right is what makes plugins work. Registration is the last and smallest step.
