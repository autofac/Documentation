=================
Type Interceptors
=================

`Castle.Core <https://github.com/castleproject/Core>`_, part of `the Castle Project <https://castleproject.org>`_, provides a method interception framework called "DynamicProxy."

The ``Autofac.Extras.DynamicProxy`` integration package enables method calls on Autofac components to be intercepted by other components. Common use-cases are transaction handling, logging, and declarative security.

Enabling Interception
=====================

The basic steps to get DynamicProxy integration working are:

- :ref:`create_interceptors`
- :ref:`register_interceptors`
- :ref:`enable_type_interception`
- :ref:`associate_interceptors`

.. _create_interceptors:

Create Interceptors
-------------------
Interceptors implement the ``Castle.DynamicProxy.IInterceptor`` interface. Here's a simple interceptor example that logs method calls including inputs and outputs:

.. sourcecode:: csharp

    public class CallLogger : IInterceptor
    {
      TextWriter _output;

      public CallLogger(TextWriter output)
      {
        _output = output;
      }

      public void Intercept(IInvocation invocation)
      {
        _output.Write("Calling method {0} with parameters {1}... ",
          invocation.Method.Name,
          string.Join(", ", invocation.Arguments.Select(a => (a ?? "").ToString()).ToArray()));

        invocation.Proceed();

        _output.WriteLine("Done: result was {0}.", invocation.ReturnValue);
      }
    }

.. _register_interceptors:

Register Interceptors with Autofac
----------------------------------

Interceptors must be registered with the container. You can register them either as typed services or as named services. If you register them as named services, they must be named ``IInterceptor`` registrations.

Which of these you choose depends on how you decide to associate interceptors with the types being intercepted.

.. sourcecode:: csharp

    // Named registration
    builder.Register(c => new CallLogger(Console.Out))
           .Named<IInterceptor>("log-calls");

    // Typed registration
    builder.Register(c => new CallLogger(Console.Out));

.. _enable_type_interception:

Enable Interception on Types
----------------------------

When you register a type being intercepted, you have to mark the type at registration time so Autofac knows to wire up that interception. You do this using the ``EnableInterfaceInterceptors()`` and ``EnableClassInterceptors()`` registration extensions.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<SomeType>()
           .As<ISomeInterface>()
           .EnableInterfaceInterceptors();
    builder.Register(c => new CallLogger(Console.Out));
    var container = builder.Build();
    var willBeIntercepted = container.Resolve<ISomeInterface>();

Under the covers, ``EnableInterfaceInterceptors()`` creates an interface proxy that performs the interception, while ``EnableClassInterceptors()`` dynamically subclasses the target component to perform interception of virtual methods.

Both techniques can be used in conjunction with :doc:`assembly scanning <../register/scanning>`, so you can configure batches of components using the same methods. That includes closed generics discovered with ``AsClosedTypesOf()``:

.. sourcecode:: csharp

    builder.RegisterAssemblyTypes(typeof(Program).Assembly)
           .AsClosedTypesOf(typeof(ICommandHandler<,>))
           .EnableInterfaceInterceptors()
           .InterceptedBy(typeof(CallLogger));

**Special case: WCF proxy and remoting objects.** While WCF proxy objects *look* like interfaces, the ``EnableInterfaceInterceptors()`` mechanism won't work because, behind the scenes, the .NET desktop framework is actually using a ``System.Runtime.Remoting.TransparentProxy`` object that behaves like the interface. As of v6.0.0 of ``Autofac.Extras.DynamicProxy`` the ability to intercept ``TransparentProxy`` objects was removed in an effort to improve cross-platform support.

Intercept Only Some Types
-------------------------

Both ``EnableClassInterceptors()`` and ``EnableInterfaceInterceptors()`` accept an optional ``Func<Type, bool>`` predicate. Types for which it returns ``false`` are registered without a proxy. This matters most with assembly scanning, where you want interception on some of the scanned types and not others.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<CallLogger>();

    // Only types marked with [InterceptMe] get a proxy. Everything
    // else the scan picks up is registered as-is.
    builder.RegisterAssemblyTypes(typeof(Program).Assembly)
           .As<IPublicInterface>()
           .EnableInterfaceInterceptors(t => t.IsDefined(typeof(InterceptMeAttribute), false))
           .InterceptedBy(typeof(CallLogger));

**The predicate runs at a different point for each mechanism.** Class interception evaluates it once per candidate type, as registrations are built. Interface interception evaluates it against the resolved implementation type, so the decision happens per resolve.

When interface interception skips a type you get the original instance back rather than a pass-through proxy, so excluded types carry no interception cost at all.

.. _associate_interceptors:

Associate Interceptors with Types to Be Intercepted
---------------------------------------------------

To pick which interceptor is associated with your type, you have two choices.

Your first option is to mark the type with an attribute, like this:

.. sourcecode:: csharp

    // This attribute will look for a TYPED
    // interceptor registration:
    [Intercept(typeof(CallLogger))]
    public class First
    {
      public virtual int GetValue()
      {
        // Do some calculation and return a value
      }
    }

    // This attribute will look for a NAMED
    // interceptor registration:
    [Intercept("log-calls")]
    public class Second
    {
      public virtual int GetValue()
      {
        // Do some calculation and return a value
      }
    }

When you use attributes to associate interceptors, you don't need to specify the interceptor at registration time. You can just enable interception and the interceptor type will automatically be discovered.

.. sourcecode:: csharp

    // Using the TYPED attribute:
    var builder = new ContainerBuilder();
    builder.RegisterType<First>()
           .EnableClassInterceptors();
    builder.Register(c => new CallLogger(Console.Out));

    // Using the NAMED attribute:
    var builder = new ContainerBuilder();
    builder.RegisterType<Second>()
           .EnableClassInterceptors();
    builder.Register(c => new CallLogger(Console.Out))
           .Named<IInterceptor>("log-calls");

The second option is to declare the interceptor at Autofac registration time. You can do this using the ``InterceptedBy()`` registration extension:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<SomeType>()
           .EnableClassInterceptors()
           .InterceptedBy(typeof(CallLogger));
    builder.Register(c => new CallLogger(Console.Out));

Tips
====

Use Public Interfaces
---------------------

Interface interception requires the interface be public (or, at least, visible to the dynamically generated proxy assembly). Non-public interface types can't be intercepted.

If you want to proxy ``internal`` interfaces, you must mark the assembly containing the interface with ``[assembly: InternalsVisibleTo("DynamicProxyGenAssembly2")]``.

Use Virtual Methods
-------------------

Class interception requires the methods being intercepted to be virtual since it uses subclassing as the proxy technique.

Usage with Expressions
----------------------

Components created using expressions, or those registered as instances, cannot be subclassed by the DynamicProxy2 engine. In these cases, it is necessary to use interface-based proxies.

Interface Registrations
-----------------------

To enable proxying via interfaces, the component must provide its services through interfaces only. For best performance, all such service interfaces should be part of the registration, i.e. included in ``As<X>()`` clauses.

WCF Proxies
-----------

As mentioned earlier, WCF proxies and other remoting types are special cases and can't use standard interface or class interception.

Class Interceptors and UsingConstructor
---------------------------------------

If you are using class interceptors via ``EnableClassInterceptors()`` then avoid using the constructor selector ``UsingConstructor()`` with it. When class interception is enabled, the generated proxy adds some new constructors that also take the set of interceptors you want to use. When you specify ``UsingConstructor()`` you'll bypass this logic and your interceptors won't be used.

Optional Constructor Arguments
------------------------------

Optional constructor arguments work on class-intercepted registrations. The generated proxy constructor mirrors the parameters of the type being proxied but not their default values, so Autofac reads the defaults off the proxied type and supplies them on its behalf. Values passed to the resolve operation, values configured on the registration, and services available from the container all still take precedence, so binding behaves the same as it would without a proxy.

This can change which constructor gets selected. A constructor with an optional argument that previously couldn't be bound now can be, so Autofac may pick it where a narrower overload used to win. Given ``MyService(IThing thing)`` and ``MyService(IThing thing, int retries = 5)``, the two-argument constructor is chosen.

Known Issues
============

Asynchronous Method Interception
--------------------------------

Castle interceptors only expose a synchronous mechanism to intercept methods - there's no explicit ``async``/``await`` sort of support. However, given ``async``/``await`` is just syntactic sugar around returning ``Task`` objects, you can use ``Task`` and ``ContinueWith()`` sorts of methods in your interceptor. `This issue <https://github.com/castleproject/Core/issues/107>`_ shows an example of that. Alternatively, there are `helper libraries <https://github.com/JSkimming/Castle.Core.AsyncInterceptor>`_ that make async work easier.

Enum Keys with Class Interception
---------------------------------

Using :doc:`KeyFilter <keyed-services>` with an **enum** key does not work together with **class** interception. Castle DynamicProxy reproduces the attribute argument on the generated proxy constructor as the enum's underlying integer type, so the key stops matching the registered keyed service and resolution fails.

Use a string key, or use interface interception instead - neither goes through the conversion. `The upstream Castle issue tracks this. <https://github.com/castleproject/Core/issues/748>`_

Castle.Core Versioning
----------------------

Castle.Core pins its *assembly* version to ``<major>.0.0.0`` and leaves it there for the life of that major version - every Castle.Core 5.x package, 5.1.0 through 5.2.1, ships assembly version ``5.0.0.0``. Updating the package within a major version needs no binding redirect, because the assembly identity never moved.

Straddling a major version is what breaks. ``Autofac.Extras.DynamicProxy`` 8.x depends on Castle.Core 5.x, so if something else in your application was built against Castle.Core 4.x you can see:

``System.IO.FileLoadException: Could not load file or assembly 'Castle.Core, Version=4.0.0.0, Culture=neutral, PublicKeyToken=407dd0808d44fbdc'. The located assembly's manifest definition does not match the assembly reference. (Exception from HRESULT: 0x80131040)``

On .NET Framework a binding redirect to ``5.0.0.0`` may get you past it, but Castle 5 removed API that Castle 4 exposed, so a redirect only holds if the library on the older version doesn't reach for anything that went away. Modern .NET has no binding redirects, so there the only real fix is getting every direct and transitive dependency onto Castle.Core 5.x - which sometimes means filing issues with projects still on 4.x. `The Castle.Core issue discussing this versioning policy has the background. <https://github.com/castleproject/Core/issues/288>`_

Example
=======

There is an example project showing interception wired up both on the registration and with an attribute `in the Autofac examples repository <https://github.com/autofac/Examples/tree/main/src/DynamicProxyExample>`_.
