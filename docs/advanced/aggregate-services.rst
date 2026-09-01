==================
Aggregate Services
==================

Introduction
============

An aggregate service is useful when you need to treat a set of dependencies as one dependency. When a class depends on several constructor-injected services, or have several property-injected services, moving those services into a separate class yields a simpler API.

An example is super- and subclasses where the superclass have one or more constructor-injected dependencies. The subclasses must usually inherit these dependencies, even though they might only be useful to the superclass. With an aggregate service, the superclass constructor parameters can be collapsed into one parameter, reducing the repetitiveness in subclasses. Another important side effect is that subclasses are now insulated against changes in the superclass dependencies, introducing a new dependency in the superclass means only changing the aggregate service definition.

The pattern and this example `are both further elaborated here <http://peterspattern.com/dependency-injection-and-class-inheritance>`_.

Aggregate services can be implemented by hand, e.g. by building a class with constructor-injected dependencies and exposing those as properties. Writing and maintaining aggregate service classes and accompanying tests can quickly get tedious though. The AggregateService extension to Autofac lets you generate aggregate services directly from interface definitions without having to write any implementation.

Getting Started
===============

First, add a reference to `the Autofac.Extras.AggregateService NuGet package <https://nuget.org/packages/Autofac.Extras.AggregateService>`_, which brings in everything you need - including the source generator that produces the aggregate service implementations.

Now, let's say we have a class with a number of constructor-injected dependencies that we store privately for later use:

.. sourcecode:: csharp

    public class SomeController
    {
      private readonly IFirstService _firstService;
      private readonly ISecondService _secondService;
      private readonly IThirdService _thirdService;
      private readonly IFourthService _fourthService;

      public SomeController(
        IFirstService firstService,
        ISecondService secondService,
        IThirdService thirdService,
        IFourthService fourthService)
      {
        _firstService = firstService;
        _secondService = secondService;
        _thirdService = thirdService;
        _fourthService = fourthService;
      }
    }

To aggregate the dependencies we move those into a separate interface definition and take a dependency on that interface instead.

.. sourcecode:: csharp

    public interface IMyAggregateService
    {
      IFirstService FirstService { get; }
      ISecondService SecondService { get; }
      IThirdService ThirdService { get; }
      IFourthService FourthService { get; }
    }

    public class SomeController
    {
      private readonly IMyAggregateService _aggregateService;

      public SomeController(IMyAggregateService aggregateService)
      {
        _aggregateService = aggregateService;
      }
    }

Finally, we register the aggregate service interface.

.. sourcecode:: csharp

    using Autofac;
    using Autofac.Extras.AggregateService;
    //...

    var builder = new ContainerBuilder();
    builder.RegisterAggregateService<IMyAggregateService>();
    builder.Register(/*...*/).As<IFirstService>();
    builder.Register(/*...*/).As<ISecondService>();
    builder.Register(/*...*/).As<IThirdService>();
    builder.Register(/*...*/).As<IFourthService>();
    builder.RegisterType<SomeController>();
    var container = builder.Build();

The interface for the aggregate service will automatically have an implementation generated for you and the dependencies will be filled in as expected. By default that implementation is produced at compile time by a source generator; see `How It Works`_ for the details and for the cases where a runtime fallback is used instead.

How Aggregate Services are Resolved
===================================

The members of an aggregate service interface are translated into resolutions according to their shape. The samples below show the functionally equivalent hand-written code for each case.

Properties
----------

Read-only properties mirror the behavior of regular constructor-injected dependencies. The type of each property will be resolved and cached in the aggregate service when the aggregate service instance is constructed.

Here is a functionally equivalent sample:

.. sourcecode:: csharp

    class MyAggregateServiceImpl: IMyAggregateService
    {
      private IMyService _myService;

      public MyAggregateServiceImpl(IComponentContext context)
      {
        _myService = context.Resolve<IMyService>();
      }

      public IMyService MyService
      {
        get { return _myService; }
      }
    }

Methods
-------

Methods will behave like factory delegates and will translate into a resolve call on each invocation. The method return type will be resolved, passing on any parameters to the resolve call.

A functionally equivalent sample of the method call:

.. sourcecode:: csharp

    class MyAggregateServiceImpl: IMyAggregateService
    {
      public ISomeThirdService GetThirdService(string data)
      {
        var dataParam = new TypedParameter(typeof(string), data);
        return _context.Resolve<ISomeThirdService>(dataParam);
      }
    }

Property Setters and Void Methods
-----------------------------------

Property setters and methods without return types do not make sense in the aggregate service. Their presence in the aggregate service interface does not prevent the implementation from being generated. Calling such members, however, will throw an exception.

How It Works
============

There are two ways an aggregate service implementation can be produced: a build-time source generator (the default and preferred path) and a runtime dynamic proxy (the fallback). Both produce the same behavior described above; they differ in *when* and *how* the implementation is created.

Source Generation (Preferred)
-------------------------------

The ``Autofac.Extras.AggregateService`` package includes a `C# source generator <https://learn.microsoft.com/dotnet/csharp/roslyn-sdk/source-generators-overview>`_ that ships as an analyzer inside the package. You don't need to reference anything extra - when you add the package, the generator is active automatically.

At compile time, the generator scans your code for aggregate service registrations and creation calls:

* ``builder.RegisterAggregateService<TInterface>()`` and ``builder.RegisterAggregateService(typeof(TInterface))``
* ``AggregateServiceGenerator.CreateInstance<TInterface>(context)`` and ``AggregateServiceGenerator.CreateInstance(typeof(TInterface), context)``

For each aggregate service interface it can identify from these call sites, it emits a concrete class implementing the interface - resolving properties in the constructor and translating method calls into ``Resolve`` calls, exactly like the hand-written examples above. The generated implementation is wired up automatically; your usage doesn't change at all.

Because the implementation is ordinary, statically-compiled C#, this path involves no runtime proxy, no per-call reflection, and is compatible with trimming and Native AOT. See :ref:`aggregate_services_aot` below.

Dynamic Proxy (Fallback)
--------------------------

When the generator can't statically determine the aggregate service interface, the implementation is generated at runtime instead, using DynamicProxy from `the Castle Project <http://castleproject.org>`_. Given the interface, a proxy is generated implementing it, translating calls to properties and methods into ``Resolve`` calls on an Autofac context.

The fallback is used when the interface isn't visible to the generator at compile time, for example:

* The interface ``Type`` is computed at runtime (``builder.RegisterAggregateService(someRuntimeType)``).
* The registration goes through a generic pass-through helper where the type argument is an open type parameter (``void Register<T>(ContainerBuilder b) => b.RegisterAggregateService<T>()``).
* The interface uses a member shape the generator doesn't emit (see below).

The fallback preserves behavior in every case, but it relies on runtime code generation, so it is **not** compatible with trimming or Native AOT.

What the Generator Supports
-----------------------------

The generator emits implementations for read-only properties, properties with setters (the setter throws, as described above), methods with return values (including generic methods and methods with generic constraints), ``void`` methods (which throw), and ``in``/``params`` method parameters. It also handles open generic aggregate service interfaces.

A few shapes always use the dynamic proxy fallback:

* ``ref`` and ``out`` method parameters - these can't be faithfully forwarded to a ``Resolve`` call.
* Interfaces with events or indexers.

When the generator skips an interface it can otherwise see, it reports an informational diagnostic (``AGSVC001``) at the registration call site so the fallback isn't silent.

Performance Considerations
==========================

When the source generator produces the implementation, method and property access is a direct, statically-compiled ``Resolve`` call with no proxy indirection - the fastest path and the recommended default.

When the dynamic proxy fallback is used, method calls pass through a dynamic proxy, so there is a small but non-zero amount of overhead on each method call. A performance study on Castle DynamicProxy vs other frameworks can be found `here <http://kozmic.pl/2009/03/31/dynamic-proxy-frameworks-comparison-update/>`_.

.. _aggregate_services_aot:

Trimming and Native AOT
=======================

Aggregate services work with :doc:`trimming and Native AOT <native-aot-trimming>` as long as the implementation comes from the source generator rather than the dynamic proxy fallback. The generated implementations are ordinary compiled C# with no runtime code generation, so the common case is fully trim- and AOT-safe and produces no warnings.

This requires **Autofac 9.3.0 or later**, which is the first version with the AOT annotations the generated code relies on.

The dynamic proxy fallback is *not* AOT- or trim-safe (it generates a proxy at runtime). To stay on the generated, AOT-safe path, register aggregate services so the generator can see the interface statically - prefer ``RegisterAggregateService<TInterface>()`` or ``RegisterAggregateService(typeof(TInterface))`` with a concrete interface name over a runtime-computed ``Type`` or a generic pass-through helper.

A few scenarios are generated but still need runtime code generation, so they remain JIT-only (they work normally on a regular runtime but are not supported under Native AOT):

* **Open generic** aggregate service interfaces. Closing the open generic over a concrete type argument happens at runtime, which Native AOT can't do.
* Methods with ``ref`` or ``out`` parameters (and interfaces with events or indexers), which use the dynamic proxy fallback.

If you build a trimmed or AOT app and an aggregate service falls back to the dynamic proxy, the call site that needs runtime code generation will produce an ``IL2026`` / ``IL3050`` warning, and you'll see the ``AGSVC001`` diagnostic for interfaces the generator had to skip. See :doc:`native-aot-trimming` for how to read and resolve those warnings.
