===============
Lifetime Events
===============

Autofac exposes events that can be hooked at various stages in instance lifecycle. These are subscribed to during component registration (or alternatively by attaching to the ``IComponentRegistration`` interface.

.. contents::
  :local:

OnPreparing
===========

The ``OnPreparing`` event is raised when a new instance of a component is required,
before ``OnActivating`` is invoked.

This event can be used to specify a custom set of parameter information that Autofac will consider
when it creates a new instance of the component.

The primary use case of this event is to mock or intercept the services that Autofac would normally
pass as parameters to component activation, by setting the ``Parameters`` property of the provided
``PreparingEventArgs`` argument with any custom parameters.

.. tip::

  Before you use this event to set parameters, consider whether it may be more appropriate
  to define these at registration time, using :doc:`parameter registration <../register/parameters>`.

OnActivating
============

The ``OnActivating`` event is raised before a component is used. Here you can:

* Switch the instance for another or wrap it in a proxy
* :doc:`Do property injection or method injection <../register/prop-method-injection>`
* Perform other initialization tasks

In some cases, such as with ``RegisterType<T>()``, the concrete type registered is used for type resolution and used by ``ActivatingEventArgs``. For example, the following will fail with a class cast exception:

.. sourcecode:: csharp

    builder.RegisterType<TConcrete>() // FAILS: will throw at cast of TInterfaceSubclass
           .As<TInterface>()          // to type TConcrete
           .OnActivating(e => e.ReplaceInstance(new TInterfaceSubclass()));

A simple workaround is to do the registration in two steps:

.. sourcecode:: csharp

    builder.RegisterType<TConcrete>().AsSelf();
    builder.Register<TInterface>(c => c.Resolve<TConcrete>())
           .OnActivating(e => e.ReplaceInstance(new TInterfaceSubclass()));

OnActivated
===========

The ``OnActivated`` event is raised once a component is fully constructed. Here you can perform application-level tasks that depend on the component being fully constructed - *these should be rare*.

OnRelease
=========

The ``OnRelease`` event replaces :doc:`the standard cleanup behavior for a component <disposal>`. The standard cleanup behavior of components that implement ``IDisposable`` and that are not marked as ``ExternallyOwned()`` is to call the ``Dispose()`` method. The standard cleanup behavior for components that do not implement ``IDisposable`` or are marked as externally owned is a no-op - to do nothing. ``OnRelease`` overrides this behavior with the provided implementation.
