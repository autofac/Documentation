=================================
Upgrading from Autofac 7.x to 8.x
=================================

Very little changed for most people in the 8.x line. Beyond the target framework updates, there are two breaking changes, both narrow enough that you will probably only meet them if you write code against Autofac's internals.

- ``ResolveRequest`` became a ``readonly struct``, where it had been a class. Code that treats it as a reference type no longer compiles - comparing one to ``null`` is the usual way this shows up. It is also copied by value now, so a method taking one cannot mutate the caller's copy. This only affects code that handles ``ResolveRequest`` directly, which in practice means custom :doc:`resolve middleware <../advanced/pipelines>` or a custom ``IInstanceActivator``.

- The shim ``RequiresUnreferencedCodeAttribute`` that Autofac declares for older target frameworks changed from ``public`` to ``internal`` in 8.4.0. If you were applying that attribute in your own code and picking up Autofac's declaration of it, declare your own or reference the framework one instead.
