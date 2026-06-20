======================================
Native AOT and Trimming
======================================

Autofac works with `trimming <https://learn.microsoft.com/dotnet/core/deploying/trimming/trim-self-contained>`_ and `Native AOT <https://learn.microsoft.com/dotnet/core/deploying/native-aot/>`_ on .NET 8 and later. The core ``Autofac`` assembly is marked ``IsAotCompatible``, so the parts of Autofac that are safe to use in a trimmed or AOT app produce no warnings, and the parts that aren't will warn you at compile time at the exact call site.

This page explains what works, what to avoid, and how to read the warnings you might see.

The short version
=================

A small amount of background helps everything else make sense. Autofac is a reflection-based container, and two things are hard for the trimmer and the AOT compiler:

* **Trimming** removes types and members it can't see being used. Anything Autofac reaches by reflection (like the constructors and properties of your components) has to be preserved or it may be trimmed away.
* **Native AOT** compiles everything ahead of time and can't generate new code at runtime. Anything that builds a new type or compiles an expression at runtime (like closing an open generic over a value type) won't work.

The good news: the most common way to use Autofac - registering concrete types and resolving them - is safe for both. The features that aren't safe are annotated, so you don't have to guess.

What works
==========

These are safe under trimming and Native AOT and produce no warnings:

* Registering concrete types (``RegisterType<T>``) and resolving them, by type or by ``Type``.
* Constructor injection (the default, public-constructor selection).
* Public property injection (``PropertiesAutowired``).
* Keyed and named registrations and resolution.
* ``RegisterInstance`` and lambda registrations (``Register(c => new Foo(...))``).
* Modules (``RegisterModule<T>``).
* Lifetime scopes, instance sharing, and disposal.
* The reference-typed :doc:`relationship types <../resolve/relationships>` - ``IEnumerable<T>``, ``Lazy<T>``, ``Func<T>``, ``Meta<T>``, and ``Owned<T>`` - as long as the service type is a reference type.

.. sourcecode:: csharp

    // All AOT/trim-safe.
    var builder = new ContainerBuilder();
    builder.RegisterType<Logger>().As<ILogger>().SingleInstance();
    builder.Register(c => new Repository(c.Resolve<ILogger>())).As<IRepository>();
    builder.RegisterModule<DataModule>();

    using var container = builder.Build();
    var repo = container.Resolve<IRepository>();

.. tip::

    Lambda registrations (``Register(c => new Foo(...))``) are the most trim- and AOT-friendly way to register a component, because you construct the object yourself instead of relying on reflection. When in doubt, prefer them.

What warns (and why)
====================

Some Autofac features rely on runtime code generation or on reflecting over types the trimmer can't track. These are annotated with ``[RequiresDynamicCode]`` or ``[RequiresUnreferencedCode]``, so when you build a trimmed or AOT app you'll get a warning (``IL3050`` or ``IL2026`` respectively) **at your call site** - not buried inside Autofac.

* **Open generic registrations** (``RegisterGeneric``, ``RegisterGenericDecorator``, generic composites) - closing an open generic at runtime uses ``MakeGenericType``, which needs dynamic code when the type argument is a value type.
* **Generated factories and delegate factories** (``RegisterGeneratedFactory``) - these compile an expression tree at runtime.
* **Assembly scanning** (``RegisterAssemblyTypes``, ``RegisterAssemblyModules``) - the trimmer can't know which discovered types to keep.
* **Strongly-typed metadata views** (``Meta<T, TMetadata>``) - these compile an expression tree to populate the metadata object.
* **Custom property selectors** (``PropertiesAutowired`` with your own ``IPropertySelector``).

A warning doesn't necessarily mean the feature is broken - it means *the compiler can't prove it's safe*. Many of these work fine in practice (for example, an open generic closed over a reference type), but you take on responsibility for making sure the types involved are preserved and that you don't hit a dynamic-code path.

.. note::

    Resolving a relationship type like ``IEnumerable<T>`` or ``Lazy<T>`` does **not** warn at your call site, because that resolution goes through Autofac's built-in registration sources rather than an API you call directly. These work for reference types but can still fail at runtime for value-type cases (see below). "No warning" here doesn't guarantee "fully AOT-safe."

What fails at runtime under Native AOT
======================================

A couple of scenarios compile cleanly but throw a ``DependencyResolutionException`` at runtime under Native AOT, because they need code that can only be generated at runtime:

* Closing an **open generic over a value type**, e.g. resolving ``IRepository<int>`` from an open generic ``RegisterGeneric(typeof(Repository<>))``. Closing over a reference type (``IRepository<Customer>``) works.
* **Strongly-typed metadata views** (``Meta<T, TMetadata>``).

The dividing line is *constructing a new type at runtime*, not value types in general - resolving ``IEnumerable<int>`` is fine, because no new type is built.

If you need these patterns in an AOT app, register the closed types explicitly instead of relying on the open generic, or use a lambda registration.

Reading and resolving warnings
==============================

When you publish a trimmed or AOT app you'll see warnings like::

    warning IL3050: Using member '...RegisterGeneric...' which has 'RequiresDynamicCodeAttribute' ...
    warning IL2026: Using member '...RegisterAssemblyTypes...' which has 'RequiresUnreferencedCodeAttribute' ...

You have a few options for each one:

* **Avoid the feature.** Replace the open generic, scan, or factory with explicit registrations - usually the cleanest fix.
* **Preserve the types yourself.** If you know a feature is safe in your case, make sure the relevant types survive trimming (for example with a `feature switch or trimmer-roots descriptor <https://learn.microsoft.com/dotnet/core/deploying/trimming/trimming-options>`_) and suppress the warning with a justification.
* **Propagate the annotation.** If your own method wraps an annotated Autofac API, put the same ``[RequiresDynamicCode]`` / ``[RequiresUnreferencedCode]`` attribute on your method so the warning surfaces to *your* callers.

Legacy: Xamarin and .NET Native
================================

The guidance below predates modern Native AOT and applies to older toolchains (the Xamarin linker and .NET Native / UWP). If you're targeting .NET 8+ Native AOT or trimming, use the guidance above instead.

Xamarin
-------

When using Xamarin to create an iOS or Android app and the linker is enabled, you may need to explicitly describe types requiring reflection. The `Xamarin Custom Linker Configuration <https://developer.xamarin.com/guides/cross-platform/advanced/custom_linking/>`_ documentation explains how you can notify the linker to keep certain types and not strip them from the finished product. This boils down to...

* Mark types you own with a ``[Preserve]`` attribute
* Include a custom XML link description file in your build

A simple link description file looks like this:

.. sourcecode:: xml

    <linker>
      <assembly fullname="mscorlib">
        <type fullname="System.Convert" />
      </assembly>
      <assembly fullname="My.Own.Assembly">
        <type fullname="Foo" preserve="fields">
          <method name=".ctor" />
        </type>
        <namespace fullname="My.Own.Namespace" />
        <type fullname="My.Other*" />
      </assembly>
      <assembly fullname="Autofac" preserve="all"/>
    </linker>

Autofac makes use of the ``System.Convert.ChangeType`` method in lambda expressions to convert types so including it in the linker definition is needed. See `issue #842 <https://github.com/autofac/Autofac/issues/842>`_ for further discussion.

For additional details on how to structure your Xamarin custom linker configuration file and how to include it in your build, `check out the Xamarin documentation <https://developer.xamarin.com/guides/cross-platform/advanced/custom_linking/>`_.

Autofac may not be seen as "linker safe" by the Xamarin linker. If the linker gets too aggressive, you may see an exception like::

    The type 'Autofac.Features.Indexed.KeyedServiceIndex'2' does not implement the interface 'Autofac.Features.Indexed.IIndex'2'

This StackOverflow answer (`linked here <https://stackoverflow.com/questions/58114288/autofac-build-throws-exception-on-latest-xamarin-ios-when-linker-configured-to>`_) indicates that you can do one of the following things:

* Set the linker to ``Don't link`` or ``Link Framework SDKs Only`` (which will increase your application size)
* Add the ``--linkskip=Autofac`` argument to the ``Additional mtouch arguments in iOS Build`` found in the iOS project properties.
* Use a linker XML like the one above and make sure the ``Autofac`` line with ``preserve="all"`` is included.

.NET Native
-----------

`.NET Native <https://msdn.microsoft.com/en-us/library/dn584397(v=vs.110).aspx>`_ is a way to compile .NET binaries to native code. It's used in Universal Windows Platform (UWP) and Windows Store apps, among others.

When using `.NET Native with reflection <https://msdn.microsoft.com/en-us/library/dn600640(v=vs.110).aspx>`_ you may run into exceptions like ``MissingMetadataException`` when the compiler has removed the reflection metadata for types you need.

You can configure .NET Native compilation using a `Runtime Directives (rd.xml) file <https://msdn.microsoft.com/en-us/library/dn600639(v=vs.110).aspx>`_. A simple directive file looks like this:

.. sourcecode:: xml

    <Directives xmlns="http://schemas.microsoft.com/netfx/2013/01/metadata">
      <Application>
        <Assembly Name="*Application*" Dynamic="Required All" />
      </Application>
    </Directives>

That directive file tells the compiler to keep all the reflection data for everything in the entire application package. That's sort of the "nuclear option" - if you want to make your application package smaller you can be much more specific about what to include. `Refer to the MSDN documentation for more detail. <https://msdn.microsoft.com/en-us/library/dn600639(v=vs.110).aspx>`_
