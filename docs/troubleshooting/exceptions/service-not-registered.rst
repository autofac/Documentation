=============================================
The requested service has not been registered
=============================================

Example Message
===============

::

    The requested service 'MyApp.IMyDependency' has not been registered. To
    avoid this exception, either register a component to provide the service,
    check for service registration using IsRegistered(), or use the
    ResolveOptional() method to resolve an optional dependency.

This error means that Autofac tried to resolve a service based on an application request but that service was not registered in the container/lifetime scope. The message tells you which service could not be resolved. In the above example, it's the ``MyApp.IMyDependency`` service that was not found in the lifetime scope.

Troubleshooting
===============

It's important to :doc:`remember the difference between a service and a component <../../glossary>`: A service is the interface or class that is being exposed, while a component is the concrete class that's being created to fulfill the service.

In a registration like this...

.. sourcecode:: csharp

    builder.RegisterType<MyComponent>().As<IMyService>();

... ``MyComponent`` is the *component* and ``IMyService`` is the *service*.

What the exception is telling you is which *service* can't be found. If you look at the stack trace, you should be able to see what code in the application is trying to resolve that service. You may see this in the context of a larger resolve chain, for example if you have an object with a constructor that asks for an ``IMyService`` and you try to resolve that object.

**The usual cause of this issue is simply a missed registration.** Make sure the service is registered. Especially when using :doc:`assembly scanning <../../register/scanning>` it can be easy to miss some things.

A more subtle sort of problem may also happen, where **services with a similar name but different namespace** may be registered. For example, if your application has ``FirstNamespace.IMyService`` and ``SecondNamespace.IMyService``, it can be easy to add some ``using`` statements at the top of the class file and a registration for ``IMyService`` and not realize *which actual service is getting registered*. The code *looks* like the right thing is getting registered, but it's really something else.

Similarly, but more rare, this can happen in a "plugin system" where assemblies get loaded on the fly and scanned for dependencies - two different assemblies could have the same namespace and interface name. Which one is getting registered?

Finally, if you're using :doc:`the AnyConcreteTypeNotAlreadyRegisteredSource <../../advanced/registration-sources>` to try to save some time, it may end up auto-including things in the container that you don't want registered or don't use. These extra things may also implement interfaces you're trying to resolve, so when you're resolving services it'll generate one of these errors due to a missing dependency and it can be very confusing. Try removing the ACTNARS use and registering things more explicitly, possibly with assembly scanning instead.
