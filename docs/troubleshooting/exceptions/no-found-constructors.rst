============================
No constructors can be found
============================

Example Message
===============

::

    No constructors on type 'MyApp.MyComponent' can be found with the
    constructor finder 'Autofac.Core.Activators.Reflection.DefaultConstructorFinder'.

This error means that Autofac tried to instantiate a component via reflection using its constructor, but the service used to locate the constructors on the component indicated that the component had no constructors.

In the example message, we see:

- The class that was being created is ``MyApp.MyComponent``.
- The ``MyApp.MyComponent`` class is getting searched by ``Autofac.Core.Activators.Reflection.DefaultConstructorFinder`` to see what constructors are available.
- The ``Autofac.Core.Activators.Reflection.DefaultConstructorFinder`` is returning zero available constructors.

Troubleshooting
===============

This usually happens when a component is registered with Autofac that does not have any constructor marked ``public``, for example objects that only have ``internal`` or ``private`` constructors. By default, Autofac only works with public constructors.

If you have created your own custom ``IConstructorFinder`` instance, the message is telling you that your custom constructor finder is not returning an empty array of constructors from the ``FindConstructors()`` method. This scenario (creating a custom ``IConstructorFinder``) is not common, but it happens. You will see the component registration with a ``FindConstructorsWith()`` call to attach the custom constructor finder.

Go look at the component (class) noted in the exception and see if there are any constructors. If there are none at all, then there should be the compiler-generated default (parameterless) constructor, which is public. If there are constructors in the class, then the compiler won't generate that default public parameterless constructor. If there aren't any ``public`` constructors, that's going to be the problem.

You can :doc:`read more about constructor selection here <../../advanced/constructor-selection>`.
