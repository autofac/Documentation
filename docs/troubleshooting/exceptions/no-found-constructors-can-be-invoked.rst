=============================================
None of the constructors found can be invoked
=============================================

Example Message
===============

::

    None of the constructors found on type 'MyApp.MyComponent' can be invoked
    with the available services and parameters:
    Cannot resolve parameter 'MyApp.IMyDependency myDep' of constructor
    'Void .ctor(MyApp.IMyDependency)'.

This error means that Autofac tried to instantiate a component using its constructor, one or more of the dependencies listed as parameters in the constructor cannot be resolved from the container. The message tells you what parameters could not be resolved.

In the example message, we see:

- The class that was being created is ``MyApp.MyComponent``.
- The ``MyApp.MyComponent`` class was getting created with the constructor that has the signature ``Void .ctor(MyApp.IMyDependency)`` - a single parameter constructor.
- The parameter of type ``MyApp.IMyDependency`` was not registered in the Autofac container.

Troubleshooting
===============

There are some common reasons for this:

First, **the parameter type may represent a service that has not been correctly registered in the container.** In example the case above, it may be that ``MyApp.IMyDependency`` has not been registered so it can't be used as a dependency for other components. Try manually resolving the service in a test. For the example, you might try calling ``container.Resolve<MyApp.IMyDependency>()`` to see what happens. You may think you have it registered but it really isn't.

Second, **an error occurred while resolving a dependency of the service.** In the example case above, it could be that some logic in the constructor for the ``MyApp.IMyDependency`` component encountered an issue. Read through the inner exceptions to see if there's more information about what exactly caused the problem.

Finally, **you may have a parameter in your constructor that isn't actually a service** and won't be available in the container. For example, you usually don't register plain string or integer values in the container, but if your constructor takes a value like this, it will fail to run. In that case, you can declare a :ref:`Parameter <parameters-with-reflection-components>` on the registration to provide the extra parameter. We also have :doc:`an FAQ about injecting configured parameters like connection strings or environment variables <../../faq/injecting-configured-parameters>` that may help.

If the component has more than one constructor, Autofac by default will try to use the one with the most parameters that can be fulfilled from the container. If you want, you can :doc:`specify a constructor yourself <../../advanced/constructor-selection>` that doesn't take the problem parameter.
