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

Required Properties
-------------------

From Autofac 7.0 onwards, for :ref:`reflection components <register-registration-reflection-components>`, all `required properties <https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/required>`_ are automatically resolved at the time of object construction, and are generally treated in much the same way as mandatory constructor arguments.

For example, given the following type:

.. sourcecode:: csharp

    public class MyComponent
    {
      public required ILogger Logger { protected get; init; }

      public required IConfigReader ConfigReader { protected get; init; }

      public IDatabaseContext Context { get; set; }
    }

When the component is resolved, Autofac will populate the ``Logger`` and ``ConfigReader`` properties as if they were constructor parameters. The ``Context`` property will be treated like a standard property and will not be populated by default.

You can use any valid combination of access modifiers on required properties, however, ``public required ... { protected get; init; }`` is used in these examples as it provides access and visibility that are similar to constructors: the property is only settable at construction and not publicly visible to other classes.

Required property injection also works automatically in all base classes with required properties:

.. sourcecode:: csharp

    public class ComponentBase
    {
      public required ILogger Logger { protected get; init; }
    }

    public class MyComponent : ComponentBase
    {
      public required IConfigReader ConfigReader { protected get; init; }
    }

In the above example, resolving ``MyComponent`` would populate ``Logger`` in the base class, as well as ``ConfigReader`` in the component itself.

.. important::

  Autofac does *not* consider the nullability of the type of a required property to indicate any sort of "optional" required property. If the property is marked as ``required``,
  then it is required, and must be injected, or provided via a parameter, regardless of its nullability.

Required Properties and Constructors
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

You can mix-and-match constructors and required properties if you so wish:

.. sourcecode:: csharp

    public class MyComponent
    {
      public MyComponent(ILogger logger)
      {
        Logger = logger;
      }

      private ILogger Logger { get; set; }

      public required IConfigReader ConfigReader { protected get; init; }
    }

When multiple constructors are available, by default Autofac selects the constructor with the most matching parameters (unless :doc:`custom constructor selection is used <../advanced/constructor-selection>`).  This remains the case, and the set of required properties has no impact on the selected constructor.

Autofac has no idea whether or not you set a given required property inside a constructor. Take this example:

.. sourcecode:: csharp

    public class MyComponent
    {
      public MyComponent()
      {
      }

      public MyComponent(ILogger logger)
      {
        Logger = logger;
      }

      public required ILogger Logger { protected get; init; }
    }

Here, the constructor that Autofac will pick is going to be the one that takes the ``ILogger`` parameter, which in turn sets the ``Logger`` property. However, since ``Logger`` is marked as a required property, Autofac will resolve ``ILogger`` a second time, and inject it into the required property.

To avoid this, mark constructors that set all your required properties with the `SetsRequiredMembers <https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.codeanalysis.setsrequiredmembersattribute>`_ attribute:

.. sourcecode:: csharp

    using System.Diagnostics.CodeAnalysis;

    public class MyComponent
    {
      public MyComponent()
      {
      }

      [SetsRequiredMembers]
      public MyComponent(ILogger logger)
      {
        Logger = logger;
      }

      public required ILogger Logger { protected get; init; }
    }

Since the constructor is marked as setting all required members, no required property injection will occur in Autofac, when *that constructor* is used to create an instance of the component.

Required Properties and Parameters
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Any ``TypedParameter`` provided at :doc:`registration <parameters>` or :doc:`resolve <../resolve/parameters>` will be considered when injecting required properties. However, ``NamedParameter`` and ``PositionalParameter`` are not considered valid parameters for property injection, since they are considered to only apply to constructor parameters.

PropertiesAutowired
-------------------

You can use the ``PropertiesAutowired()`` modifier at registration time to inject properties on any component:

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

Manually Specifying Properties
------------------------------

If you have one specific property and value to wire up, you can use the ``WithProperty()`` modifier:

.. sourcecode:: csharp

    builder.RegisterType<A>().WithProperty("PropertyName", propertyValue);

Overriding Required Properties
------------------------------

Any property values provided for required properties using the ``WithProperty`` method when registering a type will override the requirement to inject that property, and Autofac will use the provided value instead:

.. sourcecode:: csharp

  public class MyComponent
  {
    public required ILogger Logger { protected get; init; }

    public required IConfigReader ConfigReader { protected get; init; }
  }

  var builder = new ContainerBuilder();
  builder.RegisterType<MyComponent>().WithProperty("Logger", new ConsoleLogger());

  var container = builder.Build();

  // This will not throw, despite ILogger not being registered.
  // The Logger property is provided by WithProperty.
  container.Resolve<MyComponent>();

Injecting Properties on an Existing Object
------------------------------------------

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
