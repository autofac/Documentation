=================
Type Interceptors
=================

`Castle.Core <https://github.com/castleproject/Core>`_, part of `the Castle Project <http://castleproject.org>`_, provides a method interception framework called "DynamicProxy."

The ``Autofac.Extras.DynamicProxy`` integration package enables method calls on Autofac components to be intercepted by other components. Common use-cases are transaction handling, logging, and declarative security. You can use ``Autofac.Extras.DynamicProxy2`` for Autofac versions up to 4.0.0

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

Both techniques can be used in conjunction with the assembly scanning support, so you can configure batches of components using the same methods.

**Special case: WCF proxy and remoting objects**
While WCF proxy objects *look* like interfaces, the ``EnableInterfaceInterceptors()`` mechanism won't work because, behind the scenes, the .NET desktop framework is actually using a ``System.Runtime.Remoting.TransparentProxy`` object that behaves like the interface. As of v6.0.0 of ``Autofac.Extras.DynamicProxy`` the ability to intercept ``TransparentProxy`` objects was removed in an effort to improve cross-platform support.

.. _associate_interceptors:

Associate Interceptors with Types to be Intercepted
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

Known Issues
============

Asynchronous Method Interception
--------------------------------

Castle interceptors only expose a synchronous mechanism to intercept methods - there's no explicit ``async``/``await`` sort of support. However, given ``async``/``await`` is just syntactic sugar around returning ``Task`` objects, you can use ``Task`` and ``ContinueWith()`` sorts of methods in your interceptor. `This issue <https://github.com/castleproject/Core/issues/107>`_ shows an example of that. Alternatively, there are `helper libraries <https://github.com/JSkimming/Castle.Core.AsyncInterceptor>`_ that make async work easier.

Castle.Core Versioning
----------------------

As of Castle.Core 4.2.0, the Castle.Core *NuGet package version* updates but the *assembly version* does not. Further, the assembly version in Castle.Core 4.1.0 matched the package (4.1.0.0) but the 4.2.0 package *back-versioned* to 4.0.0.0. In full .NET framework projects any confusion around Castle.Core versioning can be solved by adding an assembly binding redirect to force use of Castle.Core 4.0.0.0.

Unfortunately, .NET core doesn't have assembly binding redirects so if you have a *transitive* dependency on Castle.Core through a library like Autofac.Extras.DynamicProxy and you *also* have a direct dependency on Castle.Core, you may see something like:

``System.IO.FileLoadException: Could not load file or assembly
'Castle.Core, Version=4.1.0.0, Culture=neutral, PublicKeyToken=407dd0808d44fbdc'.
The located assembly's manifest definition does not match the
assembly reference. (Exception from HRESULT: 0x80131040)``

This happens because of the back-versioned assembly.

**Be sure you have the latest Autofac.Extras.DynamicProxy.** We do our best to fix as much as possible from the Autofac end. An update to that and/or Castle.Core may help.

If that doesn't work, there are two solutions:

One, you can remove your direct Castle.Core reference. The transitive references should sort themselves out.

Two, if you can't remove your direct reference or removing it doesn't work... all of the direct dependencies you have will need to update to version 4.2.0 or higher of Castle.Core. You'll have to file issues with those projects; it's not something Autofac can fix for you.

`For reference, here's the Castle.Core issue discussing this challenge. <https://github.com/castleproject/Core/issues/288>`_
