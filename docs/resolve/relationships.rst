===========================
Implicit Relationship Types
===========================

Autofac supports automatically resolving particular types implicitly to support special relationships between :doc:`components and services <../glossary>`. To take advantage of these relationships, simply register your components as normal, but change the constructor parameter in the consuming component or the type being resolved in the ``Resolve()`` call so it takes in the specified relationship type.

For example, when Autofac is injecting a constructor parameter of type ``IEnumerable<ITask>`` it will **not** look for a component that supplies ``IEnumerable<ITask>``. Instead, the container will find all implementations of ``ITask`` and inject all of them.

(Don't worry - there are examples below showing the usage of the various types and what they mean.)

Note: To override this default behavior *it is still possible to register explicit implementations of these types*.

[Content on this document based on Nick Blumhardt's blog article `The Relationship Zoo <http://nblumhardt.com/2010/01/the-relationship-zoo/>`_.]


Supported Relationship Types
============================

The table below summarizes each of the supported relationship types in Autofac and shows the .NET type you can use to consume them. Each relationship type has a more detailed description and use case after that.

=================================================== ==================================================== =======================================================
Relationship                                        Type                                                 Meaning
=================================================== ==================================================== =======================================================
*A* needs *B*                                       ``B``                                                Direct Dependency
*A* needs *B* at some point in the future           ``Lazy<B>``                                          Delayed Instantiation
*A* needs *B* until some point in the future        ``Owned<B>``                                         :doc:`Controlled Lifetime <../advanced/owned-instances>`
*A* needs to create instances of *B*                ``Func<B>``                                          Dynamic Instantiation
*A* provides parameters of types *X* and *Y* to *B* ``Func<X,Y,B>``                                      Parameterized Instantiation
*A* needs all the kinds of *B*                      ``IEnumerable<B>``, ``IList<B>``, ``ICollection<B>`` Enumeration
*A* needs to know *X* about *B*                     ``Meta<B>`` and ``Meta<B,X>``                        :doc:`Metadata Interrogation <../advanced/metadata>`
*A* needs to choose *B* based on *X*                ``IIndex<X,B>``                                      :doc:`Keyed Service <../advanced/keyed-services>` Lookup
=================================================== ==================================================== =======================================================

.. contents:: Relationship Type Details
  :local:
  :depth: 1


Direct Dependency (B)
---------------------
A *direct dependency* relationship is the most basic relationship supported - component ``A`` needs service ``B``. This is handled automatically through standard constructor and property injection:

.. sourcecode:: csharp

    public class A
    {
      public A(B dependency) { ... }
    }

Register the ``A`` and ``B`` components, then resolve:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<A>();
    builder.RegisterType<B>();
    var container = builder.Build();

    using(var scope = container.BeginLifetimeScope())
    {
      // B is automatically injected into A.
      var a = scope.Resolve<A>();
    }


Delayed Instantiation (Lazy<B>)
-------------------------------
A *lazy dependency* is not instantiated until its first use. This appears where the dependency is infrequently used, or expensive to construct. To take advantage of this, use a ``Lazy<B>`` in the constructor of ``A``:

.. sourcecode:: csharp

    public class A
    {
      Lazy<B> _b;

      public A(Lazy<B> b) { _b = b }

      public void M()
      {
        // The component implementing B is created the
        // first time M() is called
        _b.Value.DoSomething();
      }
    }

If you have a lazy dependency for which you also need metadata, you can use ``Lazy<B,M>`` instead of the longer ``Meta<Lazy<B>, M>``.


Controlled Lifetime (Owned<B>)
------------------------------
An *owned dependency* can be released by the owner when it is no longer required. Owned dependencies usually correspond to some unit of work performed by the dependent component.

This type of relationship is interesting particularly when working with components that implement ``IDisposable``. :doc:`Autofac automatically disposes of disposable components <../lifetime/disposal>` at the end of a lifetime scope, but that may mean a component is held onto for too long; or you may just want to take control of disposing the object yourself. In this case, you'd use an *owned dependency*.

.. sourcecode:: csharp

    public class A
    {
      Owned<B> _b;

      public A(Owned<B> b) { _b = b; }

      public void M()
      {
        // _b is used for some task
        _b.Value.DoSomething();

        // Here _b is no longer needed, so
        // it is released
        _b.Dispose();
      }
    }

Internally, Autofac creates a tiny lifetime scope in which the ``B`` service is resolved, and when you call ``Dispose()`` on it, the lifetime scope is disposed. What that means is that disposing of ``B`` will *also dispose of its dependencies* unless those dependencies are shared (e.g., singletons).

This also means that if you have ``InstancePerLifetimeScope()`` registrations and you resolve one as ``Owned<B>`` then you may not get the same instance as being used elsewhere in the same lifetime scope. This example shows the gotcha:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<A>().InstancePerLifetimeScope();
    builder.RegisterType<B>().InstancePerLifetimeScope();
    var container = builder.Build();

    using(var scope = container.BeginLifetimeScope())
    {
      // Here we resolve a B that is InstancePerLifetimeScope();
      var b1 = scope.Resolve<B>();
      b1.DoSomething();

      // This will be the same as b1 from above.
      var b2 = scope.Resolve<B>();
      b2.DoSomething();

      // The B used in A will NOT be the same as the others.
      var a = scope.Resolve<A>();
      a.M();
    }

This is by design because you wouldn't want one component to dispose the ``B`` out from under everything else. However, it may lead to some confusion if you're not aware.

If you would rather control ``B`` disposal yourself all the time, :doc:`register B as ExternallyOwned() <../lifetime/disposal>`.


Dynamic Instantiation (Func<B>)
-------------------------------
Using an *auto-generated factory* can let you resolve a new `B` programmatically within the control flow of your program, without requiring a direct dependency on the Autofac library. Use this relationship type if:

* You need to create more than one instance of a given service.
* You want to specifically control when the setup of the service occurs.
* You're not sure if you're going to need a service and want to make the decision at runtime.

This relationship is also useful in cases like :doc:`WCF integration <../integration/wcf>` where you need to create a new service proxy after faulting the channel.

``Func<B>`` behaves just like calling ``Resolve<B>()``. That means it's not limited to acting on parameterless constructors on objects - it will wire up constructor parameters, do property injection, and follow the whole lifecycle that ``Resolve<B>()`` does.

Further, lifetime scopes are respected. If you register an object as ``InstancePerDependency()`` and call the ``Func<B>`` multiple times, you'll get a new instance each time; if you register an object as ``SingleInstance()`` and call the ``Func<B>`` to resolve the object more than once, you will get *the same object instance every time*.

An example of this relationship looks like:

.. sourcecode:: csharp

    public class B
    {
      public B() {}

      public void DoSomething() {}
    }

    public class A
    {
      Func<B> _bFactory;

      public A(Func<B> b) { _bFactory = b; }

      public void M()
      {
        // Calling the Func<B> resolves it from
        // the lifetime scope. It's just like calling
        // Resolve<B>() - if there are any constructor
        // parameters, they all get resolved from
        // the scope.
        var b = _bFactory();
        b.DoSomething();
      }
    }

Register the ``A`` and ``B`` components, then resolve:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<A>();
    builder.RegisterType<B>();
    var container = builder.Build();

    using(var scope = container.BeginLifetimeScope())
    {
      // B won't actually be resolved from the scope
      // until A calls that injected Func<B> factory method.
      var a = scope.Resolve<A>();

      // Here it'll resolve a B!
      a.M();

      // Since B is registered InstancePerDependency, each call
      // to a.M() will resolve a NEW instance of B.
      a.M();
      a.M();
    }

Lifetime scopes are respected, so you can use that to your advantage.

.. sourcecode:: csharp

    // This time B will be registered InstancePerLifetimeScope
    // so all of the resolve calls in a given scope will get
    // the same B instance.
    var builder = new ContainerBuilder();
    builder.RegisterType<A>();
    builder.RegisterType<B>().InstancePerLifetimeScope();
    var container = builder.Build();

    using(var scope = container.BeginLifetimeScope())
    {
      // B gets resolved inside the A.M() method
      // but since B is InstancePerLifetimeScope, the
      // A.M() method will get the SAME instance each
      // time.
      var a = scope.Resolve<A>();
      a.M();
      a.M();
      a.M();
    }


Parameterized Instantiation (Func<X, Y, B>)
-------------------------------------------
You can also use an *auto-generated factory* to provide parameters when creating an new instance of the object, where the constructor of the object calls for some additional parameters. While the ``Func<B>`` relationship is similar to ``Resolve<B>()``, the ``Func<X, Y, B>`` relationship is like calling ``Resolve<B>(TypedParameter.From<X>(x), TypedParameter.From<Y>(y))`` - a resolve operation that has typed parameters. This is an alternative to :doc:`passing parameters during registration <../register/parameters>` or :doc:`passing during manual resolution <../resolve/parameters>`:

.. sourcecode:: csharp

    public class B
    {
      public B(string someString, int id) {}

      public void DoSomething() {}
    }

    public class A
    {
      // The parameter types here match the types in the B constructor.
      Func<int, string, B> _bFactory;

      public A(Func<int, string, B> b) { _bFactory = b }

      public void M()
      {
        var b = _bFactory(42, "http://hell.owor.ld");
        b.DoSomething();
      }
    }

Note that since we're resolving the instance rather than directly calling the constructor we don't need to declare the parameters in the same order as they appear in the constructor definition, nor do we need to provide *all* the parameters listed in the constructor. If some of the constructor's parameters can be resolved by the lifetime scope, then those parameters can be omitted from the ``Func<X, Y, B>`` signature being declared. You only *need* to list the types that the scope can't resolve.

Alternatively, you can use this approach to override a constructor parameter that *would* otherwise have been resolved from the container, with a concrete instance already in hand.

Example:

.. sourcecode:: csharp

    // Suppose that Q and R are registered with the Autofac container,
    // but int and P are not. You need to provide those at runtime.
    public class B
    {
      public B(int id, P peaDependency, Q queueDependency, R ourDependency) {}

      public void DoSomething() {}
    }

    public class A
    {
      // Note Q and R aren't in this factory.
      Func<int, P, B> _bFactory;

      public A(Func<int, P, B> bFactory) { _bFactory = bFactory }

      public void M(P existingPea)
      {
        // The Q and R will be resolved by Autofac, but the int
        // and P get provided by you as parameters here.
        var b = _bFactory(42, existingPea);
        b.DoSomething();
      }
    }

Internally, Autofac determines what values to use for the constructor args solely based on the type and behaves as though we've temporarily defined the input values for resolution. A consequence of this is that  **auto-generated function factories cannot have duplicate types in the input parameter list.** See below for further notes on this.

**Lifetime scopes are respected** using this relationship type, just as they are when using ``Func<B>`` or :doc:`delegate factories <../advanced/delegate-factories>`. If you register an object as ``InstancePerDependency()`` and call the ``Func<X, Y, B>`` multiple times, you'll get a new instance each time. However, if you register an object as ``SingleInstance()`` and call the ``Func<X, Y, B>`` to resolve the object more than once, you will get *the same object instance every time regardless of the different parameters you pass in.* Just passing different parameters will not break the respect for the lifetime scope:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<A>();
    builder.RegisterType<B>();
    builder.RegisterType<Q>();
    builder.RegisterType<R>();
    var container = builder.Build();

    using(var scope = container.BeginLifetimeScope())
    {
      // B won't actually be resolved from the scope
      // until A calls that injected Func<int, P, B> factory method.
      var a = scope.Resolve<A>();
      var p = new P();

      // Here it'll resolve a B!
      a.M(p);

      // Since B is registered InstancePerDependency, each call
      // to a.M(P) will resolve a NEW instance of B.
      a.M(p);
      a.M(p);
    }

This shows how lifetime scopes are respected regardless of parameters:

.. sourcecode:: csharp

    // Note we're registering B as InstancePerLifetimeScope this time. That means
    // B will get resolved fresh only ONE TIME per lifetime scope, even if different
    // parameters are passed.
    var builder = new ContainerBuilder();
    builder.RegisterType<B>().InstancePerLifetimeScope();
    builder.RegisterType<Q>();
    builder.RegisterType<R>();
    var container = builder.Build();

    using(var scope = container.BeginLifetimeScope())
    {
      // Get the factory, just like it would be in the A class.
      var factory = scope.Resolve<Func<int, P, B>>();

      // First call, the B will be resolved with these parameters:
      var b1 = factory(10, new P());

      // Second call, the B will be the SAME even though the
      // parameters changed because B is registered InstancePerLifetimeScope.
      var b2 = factory(17, new P());

      // In a unit test this would pass because they're the same.
      Assert.Same(b1, b2);
    }


As noted above, ``Func<X, Y, B>`` treats arguments as ``TypedParameter`` so you can't have duplicate types in the parameter list. For example, say you have a type like this:

.. sourcecode:: csharp

    public class DuplicateTypes
    {
      public DuplicateTypes(int a, int b, string c)
      {
        // ...
      }
    }

You might want to register that type and have an auto-generated function factory for it. *You will be able to resolve the function, but you won't be able to execute it.*

.. sourcecode:: csharp

    var func = scope.Resolve<Func<int, int, string, DuplicateTypes>>();

    // Throws a DependencyResolutionException:
    var obj = func(1, 2, "three");

Delegate Factories
^^^^^^^^^^^^^^^^^^

In a loosely coupled scenario where the parameters are matched on type, you shouldn't really know about the order of the parameters for a specific object's constructor. If you need to do something like this, you should use a :doc:`delegate factory, which you can read about in the advanced topics section <../advanced/delegate-factories>`.

RegisterGeneratedFactory
^^^^^^^^^^^^^^^^^^^^^^^^

.. important::

    ``RegisterGeneratedFactory`` is now marked as obsolete as of Autofac 7.0, this section is included for posterity; if you cannot use the ``Func<T>`` implicit relationship, use :doc:`delegate factories <../advanced/delegate-factories>`.

The now-obsolete way to handle a loosely coupled scenario where the parameters are matched on type was through the use of ``RegisterGeneratedFactory()``.

.. sourcecode:: csharp

    public delegate DuplicateTypes FactoryDelegate(int a, int b, string c);

Then register that delegate using ``RegisterGeneratedFactory()``:

.. sourcecode:: csharp

    builder.RegisterType<DuplicateTypes>();
    builder.RegisterGeneratedFactory<FactoryDelegate>(new TypedService(typeof(DuplicateTypes)));

Now the function will work:

.. sourcecode:: csharp

    var func = scope.Resolve<FactoryDelegate>();
    var obj = func(1, 2, "three");

Should you decide to use the built-in auto-generated factory behavior (``Func<X, Y, B>``) and only resolve a factory with one of each type, it will work but you'll get the same input for all constructor parameters of the same type.

.. sourcecode:: csharp

    var func = container.Resolve<Func<int, string, DuplicateTypes>>();

    // This works and is the same as calling
    // new DuplicateTypes(1, 1, "three")
    var obj = func(1, "three");

Enumeration (IEnumerable<B>, IList<B>, ICollection<B>)
------------------------------------------------------
Dependencies of an *enumerable type* provide multiple implementations of the same service (interface). This is helpful in cases like message handlers, where a message comes in and more than one handler is registered to process the message.

Let's say you have a dependency interface defined like this:

.. sourcecode:: csharp

    public interface IMessageHandler
    {
      void HandleMessage(Message m);
    }

Further, you have a consumer of dependencies like that where you need to have more than one registered and the consumer needs all of the registered dependencies:

.. sourcecode:: csharp

    public class MessageProcessor
    {
      private IEnumerable<IMessageHandler> _handlers;

      public MessageProcessor(IEnumerable<IMessageHandler> handlers)
      {
        this._handlers = handlers;
      }

      public void ProcessMessage(Message m)
      {
        foreach(var handler in this._handlers)
        {
          handler.HandleMessage(m);
        }
      }
    }

You can easily accomplish this using the implicit enumerable relationship type. Just register all of the dependencies and the consumer, and when you resolve the consumer the *set of all matching dependencies* will be resolved as an enumeration.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<FirstHandler>().As<IMessageHandler>();
    builder.RegisterType<SecondHandler>().As<IMessageHandler>();
    builder.RegisterType<ThirdHandler>().As<IMessageHandler>();
    builder.RegisterType<MessageProcessor>();
    var container = builder.Build();

    using(var scope = container.BeginLifetimeScope())
    {
      // When processor is resolved, it'll have all of the
      // registered handlers passed in to the constructor.
      var processor = scope.Resolve<MessageProcessor>();
      processor.ProcessMessage(m);
    }

**The enumerable support will return an empty set if no matching items are registered in the container.** That is, using the above example, if you don't register any ``IMessageHandler`` implementations, this will break:

.. sourcecode:: csharp

    // This throws an exception - none are registered!
    scope.Resolve<IMessageHandler>();

*However, this works:*

.. sourcecode:: csharp

    // This returns an empty list, NOT an exception:
    scope.Resolve<IEnumerable<IMessageHandler>>();

This can create a bit of a "gotcha" where you might think you'll get a null value if you inject something using this relationship. Instead, you'll get an empty list.

Metadata Interrogation (Meta<B>, Meta<B, X>)
--------------------------------------------
The :doc:`Autofac metadata feature <../advanced/metadata>` lets you associate arbitrary data with services that you can use to make decisions when resolving. If you want to make those decisions in the consuming component, use the ``Meta<B>`` relationship, which will provide you with a string/object dictionary of all the object metadata:

.. sourcecode:: csharp

    public class A
    {
      Meta<B> _b;

      public A(Meta<B> b) { _b = b; }

      public void M()
      {
        if (_b.Metadata["SomeValue"] == "yes")
        {
          _b.Value.DoSomething();
        }
      }
    }

You can use :doc:`strongly-typed metadata <../advanced/metadata>` as well, by specifying the metadata type in the ``Meta<B, X>`` relationship:

.. sourcecode:: csharp

    public class A
    {
      Meta<B, BMetadata> _b;

      public A(Meta<B, BMetadata> b) { _b = b; }

      public void M()
      {
        if (_b.Metadata.SomeValue == "yes")
        {
          _b.Value.DoSomething();
        }
      }
    }

If you have a lazy dependency for which you also need metadata, you can use ``Lazy<B,M>`` instead of the longer ``Meta<Lazy<B>, M>``.

Keyed Service Lookup (IIndex<X, B>)
-----------------------------------
In the case where you have many of a particular item (like the ``IEnumerable<B>`` relationship) but you want to pick one based on :doc:`service key <../advanced/keyed-services>`, you can use the ``IIndex<X, B>`` relationship. First, register your services with keys:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<DerivedB>().Keyed<B>("first");
    builder.RegisterType<AnotherDerivedB>().Keyed<B>("second");
    builder.RegisterType<A>();
    var container = builder.Build();

Then consume the ``IIndex<X, B>`` to get a dictionary of keyed services:

.. sourcecode:: csharp

    public class A
    {
      IIndex<string, B> _b;

      public A(IIndex<string, B> b) { _b = b; }

      public void M()
      {
        var b = this._b["first"];
        b.DoSomething();
      }
    }


Composing Relationship Types
============================

Relationship types can be composed, so:

.. sourcecode:: csharp

    IEnumerable<Func<Owned<ITask>>>

Is interpreted correctly to mean:

 * All implementations, of
 * Factories, that return
 * :doc:`Lifetime-controlled<../advanced/owned-instances>`
 * ``ITask`` services

Relationship Types and Container Independence
=============================================
The custom relationship types in Autofac based on standard .NET types don't force you to bind your application more tightly to Autofac. They give you a programming model for container configuration that is consistent with the way you write other components (vs. having to know a lot of specific container extension points and APIs that also potentially centralize your configuration).

For example, you can still create a custom ``ITaskFactory`` in your core model, but provide an ``AutofacTaskFactory`` implementation based on ``Func<Owned<ITask>>`` if that is desirable.

Note that some relationships are based on types that are in Autofac (e.g., ``IIndex<X, B>``). Using those relationship types do tie you to at least having a reference to Autofac, even if you choose to use a different IoC container for the actual resolution of services.
