=============
Common Errors
=============

This list provides more detail about common `DependencyResolutionException` errors you may see.

.. _err-no-constructors-bindable-default-binder:

None of the constructors found can be invoked
=============================================

Example Message::

    None of the constructors found on type 'MyApp.MyComponent' can be invoked with the available services and parameters:
    Cannot resolve parameter 'MyApp.IMyDependency myDep' of constructor 'Void .ctor(MyApp.IMyDependency)'.

This error means that when we've tryed to instantiate a component using its constructor, one or more of the dependencies 
listed as parameters in the constructor cannot be resolved from the container.  The message tells you what parameters could not be resolved.

The two most common reasons for this are:

    - The type represents a service that has not been correctly registered in the container. In the case above, `MyApp.IMyDependency` 
      has not been registered, so the constructor cannot be invoked.

    - You have some parameter in your constructor that isn't actually a service, and won't be available in the container (for example, some string identifier).
      In that case, you can declare a :ref:`Parameter <parameters-with-reflection-components>` on the registration to provide the extra parameter.