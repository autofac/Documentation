Upgrading from Autofac 6.x to 7.x
=================================

In the upgrade from Autofac 6.x to 7.x, the amount of breaking change was fairly minimal, and unlikely to impact most users, but there are a couple of distinct changes to make you aware of.

- The introduction of :doc:`automatic injection for required properties <../register/prop-method-injection>` means that any existing required properties on components will now be automatically injected.

  If a required property *cannot* be resolved during component activation, an exception will now be thrown.

  Equally, if you previously used ``PropertiesAutowired()`` to populate required properties on components, those properties will now be doubly-resolved, so you may wish to remove ``PropertiesAutowired()`` in favour of the default functionality.

- ``RegisterGeneratedFactory`` has been marked as obsolete.  You should update your code to use the ``Func<T>`` `implicit relationship <../resolve/relationships>`_  or `delegate factories <../advanced/delegate-factories>`_.

- The definition of the ``ILifetimeScope`` interface has been changed to add the ``BeginLoadContextLifetimeScope`` method and its overloads, on .NET 5.0+. If you implement a "fake" lifetime scope for any tests, you will need to add an implementation of these methods. For most test use-cases, it's suitable to call the existing ``BeginLifetimeScope`` methods, ignoring the provided load context.