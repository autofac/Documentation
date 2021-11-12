=============================
Property and Method Injection
=============================

While constructor parameter injection is the preferred method of passing values to a component being constructed, you can also use property or method injection to provide values.

**Property injection** uses writeable properties rather than constructor parameters to perform injection. **Method injection** sets dependencies by calling a method.

Property Injection
==================

If the component is a :ref:`lambda expression component <register-registration-lambda-expression-components>`, use an object initializer:

.. sourcecode:: csharp

    builder.Register(c => new A { B = c.Resolve<B>() });

To support :doc:`circular dependencies <../advanced/circular-dependencies>`, use an :doc:`activated event handler <../lifetime/events>`:

.. sourcecode:: csharp

    builder.Register(c => new A()).OnActivated(e => e.Instance.B = e.Context.Resolve<B>());

If the component is a :ref:`reflection component <register-registration-reflection-components>`, use the ``PropertiesAutowired()`` modifier to inject properties:

.. sourcecode:: csharp

    // Default behavior: inject all properties that are public and writable.
    builder.RegisterType<A>().PropertiesAutowired();

    // Provide a delegate property selector to be more granular. This example
    // shows injecting all properties where the property type starts with
    // 'I' - one way you might "only inject interface properties." The delegate
    // gets the PropertyInfo describing the property to be injected and the
    // instance getting injected.
    builder.RegisterType<B>()
           .PropertiesAutowired(
             (propInfo, instance) => propInfo.PropertyType.Name.StartsWith("I"));

    // Even more fancy, you can provide your own implementation of
    // IPropertySelector with as much functionality as you want. Don't
    // forget this will run on every associated resolution, so performance
    // is important!
    builder.RegisterType<C>().PropertiesAutowired(new MyCustomPropSelector());

If you have one specific property and value to wire up, you can use the ``WithProperty()`` modifier:

.. sourcecode:: csharp

    builder.RegisterType<A>().WithProperty("PropertyName", propertyValue);

You can also populate *just the properties* on an object. Do this using the ``InjectUnsetProperties`` extension on a lifetime scope, which will resolve and populate properties that are *public, writable, and not yet set (null)*:

.. sourcecode:: csharp

    lifetimeScope.InjectUnsetProperties(myObject);

Method Injection
================

The simplest way to call a method to set a value on a component is to use a :ref:`lambda expression component <register-registration-lambda-expression-components>` and handle the method call right in the activator:

.. sourcecode:: csharp

    builder.Register(c => {
      var result = new MyObjectType();
      var dep = c.Resolve<TheDependency>();
      result.SetTheDependency(dep);
      return result;
    });

If you can't use a registration lambda, you can add an :doc:`activating event handler <../lifetime/events>`:

.. sourcecode:: csharp

    builder
      .RegisterType<MyObjectType>()
      .OnActivating(e => {
        var dep = e.Context.Resolve<TheDependency>();
        e.Instance.SetTheDependency(dep);
      });
