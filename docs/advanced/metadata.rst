=======================================
Component Metadata / Attribute Metadata
=======================================

If you’re familiar with the Managed Extensibility Framework (MEF) you have probably seen examples using component metadata.

Metadata is information about a component, stored with that component, accessible without necessarily creating a component instance.

Adding Metadata to a Component Registration
===========================================

Values describing metadata are associated with the component at registration time. Each metadata item is a name/value pair:

.. sourcecode:: csharp

    builder.Register(c => new ScreenAppender())
        .As<ILogAppender>()
        .WithMetadata("AppenderName", "screen");

The same thing can be represented in :doc:`deployment-time configuration <../configuration/xml>`

.. sourcecode:: json

    {
      "components": [{
        "type": "MyApp.Components.Logging.ScreenAppender, MyApp",
        "services": [{
          "type": "MyApp.Services.Logging.ILogAppender, MyApp"
        }],
        "metadata": [{
          "key": "AppenderName",
          "value": "screen",
          "type": "System.String, mscorlib"
        }]
      }]
    }

Consuming Metadata
==================

Unlike a regular property, a metadata item is independent of the component itself.

This makes it useful when selecting one of many components based on runtime criteria; or, where the metadata isn’t intrinsic to the component implementation. Metadata could represent the time that an ``ITask`` should run, or the button caption for an ``ICommand``.

Other components can consume metadata using the ``Meta<T>`` type.

.. sourcecode:: csharp

    public class Log
    {
      readonly IEnumerable<Meta<ILogAppender>> _appenders;

      public Log(IEnumerable<Meta<ILogAppender>> appenders)
      {
        _appenders = appenders;
      }

      public void Write(string destination, string message)
      {
        var appender = _appenders.First(a => a.Metadata["AppenderName"].Equals( destination));
        appender.Value.Write(message);
      }
    }

To consume metadata without creating the target component, use ``Meta<Lazy<T>>``, which exposes the same dictionary alongside a ``Lazy<T>``.

Metadata Views
==============

Indexing a dictionary by string key works, but it isn't checked at compile time and a typo surfaces at runtime. ``Meta<T, TMetadata>`` and ``Lazy<T, TMetadata>`` take a second type argument - a **metadata view** - that projects the dictionary onto a type of your choosing.

Only three shapes can serve as a view:

- ``IDictionary<string, object>``, which hands back the dictionary unchanged.
- A concrete **class** with either a parameterless constructor or a constructor taking ``IDictionary<string, object>``.
- An **interface**, which requires the :doc:`Autofac.Mef <../integration/mef>` package.

Registration and consumption are independent, so metadata registered with string keys can be consumed through a typed view and vice versa.

Dictionary Views
----------------

Naming ``IDictionary<string, object>`` as the view hands you the raw dictionary. There's no type to define and no extra package needed, so this is the escape hatch when a view type would be ceremony for its own sake:

.. sourcecode:: csharp

    public class Log
    {
      readonly IEnumerable<Lazy<ILogAppender, IDictionary<string, object>>> _appenders;

      public Log(IEnumerable<Lazy<ILogAppender, IDictionary<string, object>>> appenders)
      {
        _appenders = appenders;
      }

      public void Write(string destination, string message)
      {
        var appender = _appenders.First(a => a.Metadata["AppenderName"].Equals(destination));
        appender.Value.Write(message);
      }
    }

You give up compile-time checking of the keys, which is the whole reason the other two shapes exist.

Class Views
-----------

A metadata class declares a public read/write property for every metadata item:

.. sourcecode:: csharp

    public class AppenderMetadata
    {
      public string AppenderName { get; set; }
    }

At registration time, the class is used with the overloaded ``WithMetadata`` method to associate values. Notice the strongly-typed ``AppenderName`` property:

.. sourcecode:: csharp

    builder.Register(c => new ScreenAppender())
        .As<ILogAppender>()
        .WithMetadata<AppenderMetadata>(m =>
            m.For(am => am.AppenderName, "screen"));

Consume it by naming the class as the view:

.. sourcecode:: csharp

    public class Log
    {
      readonly IEnumerable<Lazy<ILogAppender, AppenderMetadata>> _appenders;

      public Log(IEnumerable<Lazy<ILogAppender, AppenderMetadata>> appenders)
      {
        _appenders = appenders;
      }

      public void Write(string destination, string message)
      {
        var appender = _appenders.First(a => a.Metadata.AppenderName == destination);
        appender.Value.Write(message);
      }
    }

Autofac fills the properties by matching each metadata key to a property name, so **every property needs a value**. Supply a fallback with the ``DefaultValue`` attribute for any that might be absent:

.. sourcecode:: csharp

    public class AppenderMetadata
    {
      [DefaultValue("screen")]
      public string AppenderName { get; set; }
    }

Alternatively, give the class a constructor taking the metadata dictionary and do the mapping yourself. Autofac prefers this constructor over a parameterless one when both are present, and it does no property population at all in that case:

.. sourcecode:: csharp

    public class AppenderMetadata
    {
      public AppenderMetadata(IDictionary<string, object> metadata)
      {
        AppenderName = (string)metadata["AppenderName"];
      }

      public string AppenderName { get; set; }
    }

Interface Views
---------------

An interface view is the least ceremony to declare - readable properties only, no setters and no constructor:

.. sourcecode:: csharp

    public interface IAppenderMetadata
    {
      string AppenderName { get; }
    }

**Interfaces are not handled by core Autofac.** They come from the MEF metadata registration sources, so you need a reference to the :doc:`Autofac.Mef <../integration/mef>` package and a call to ``RegisterMetadataRegistrationSources()`` before registering metadata against the interface:

.. sourcecode:: csharp

    builder.RegisterMetadataRegistrationSources();

At registration time the interface is used with the same overloaded ``WithMetadata`` method:

.. sourcecode:: csharp

    builder.Register(c => new ScreenAppender())
        .As<ILogAppender>()
        .WithMetadata<IAppenderMetadata>(m =>
            m.For(am => am.AppenderName, "screen"));

Consumption is identical to a class view - name the interface as the second type argument.

When a View Can't Be Used
-------------------------

If the view type is none of the three supported shapes, resolution fails with::

    The type 'IAppenderMetadata' cannot be used as a metadata view.
    A metadata view must be a concrete class with a parameterless or
    dictionary constructor.

**That message names the view type, but the usual cause is a missing** ``RegisterMetadataRegistrationSources()`` **call.** An interface view without the MEF sources falls through to the core provider, which only accepts classes, so it reports your interface as the problem.

A class with neither a parameterless nor a dictionary constructor produces the identical message - which is why adding a parameterless constructor can look like it fixed an interface-shaped problem when it hasn't.

The other failure comes from a class view missing a value::

    Export metadata for 'AppenderName' is missing and no default value was supplied.

That means a property had no matching metadata key and no ``DefaultValue`` attribute to fall back on.

Attribute-Based Metadata
========================

The ``Autofac.Extras.AttributeMetadata`` package enables metadata to be specified via attributes. Core Autofac includes support to allow components to filter incoming dependencies using attributes.

To get attributed metadata working in your solution, you need to perform the following steps:

#. :ref:`create_attribute`
#. :ref:`apply_attribute`
#. :ref:`use_filters`
#. :ref:`container_use_attributes`

.. _create_attribute:

Create Your Metadata Attribute
------------------------------

A metadata attribute is a ``System.Attribute`` implementation that has the `System.ComponentModel.Composition.MetadataAttributeAttribute <https://learn.microsoft.com/en-us/dotnet/api/system.componentmodel.composition.metadataattributeattribute>`_ applied.

Any publicly-readable properties on the attribute will become name/value attribute pairs - the name of the metadata will be the property name and the value will be the property value.

In the example below, the ``AgeMetadataAttribute`` will provide a name/value pair of metadata where the name will be ``Age`` (the property name) and the value will be whatever is specified in the attribute during construction.

.. sourcecode:: csharp

    [MetadataAttribute]
    public class AgeMetadataAttribute : Attribute
    {
      public int Age { get; private set; }

      public AgeMetadataAttribute(int age)
      {
        Age = age;
      }
    }

.. _apply_attribute:

Apply Your Metadata Attribute
-----------------------------

Once you have a metadata attribute, you can apply it to your component types to provide metadata.

.. sourcecode:: csharp

    // Don't apply it to the interface (service type)
    public interface IArtwork
    {
      void Display();
    }

    // Apply it to the implementation (component type)
    [AgeMetadata(100)]
    public class CenturyArtwork : IArtwork
    {
      public void Display() { ... }
    }

.. _use_filters:

Use Metadata Filters on Consumers
---------------------------------

Along with providing metadata via attributes, you can also set up automatic filters for consuming components. This will help wire up parameters for your constructors based on provided metadata.

You can filter based on :doc:`a service key <keyed-services>` or based on registration metadata. This attribute based filtering can be performed without custom metadata attributes.

The ``KeyFilterAttribute``, ``MetadataFilterAttribute``, and ``WithAttributeFiltering`` extension method below can be found in the ``Autofac.Features.AttributeFilters`` namespace in the core Autofac package.

KeyFilterAttribute
~~~~~~~~~~~~~~~~~~

The ``KeyFilterAttribute`` allows you to select a specific keyed service to consume.

This example shows a class that requires a component with a particular key:

.. sourcecode:: csharp

    public class ArtDisplay : IDisplay
    {
      public ArtDisplay([KeyFilter("Painting")] IArtwork art) { ... }
    }

That component will require you to register a keyed service with the specified name. You'll also need to register the component with the filter so the container knows to look for it.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();

    // Register the keyed service to consume
    builder.RegisterType<MyArtwork>().Keyed<IArtwork>("Painting");

    // Specify WithAttributeFiltering for the consumer
    builder.RegisterType<ArtDisplay>().As<IDisplay>().WithAttributeFiltering();

    // ...
    var container = builder.Build();

MetadataFilterAttribute
~~~~~~~~~~~~~~~~~~~~~~~

The ``MetadataFilterAttribute`` allows you to filter for components based on specific metadata values.

This example shows a class that requires a component with a particular metadata value:

.. sourcecode:: csharp

    public class ArtDisplay : IDisplay
    {
      public ArtDisplay([MetadataFilter("Age", 100)] IArtwork art) { ... }
    }

That component will require you to register a service with the specified metadata name/value pair. You could use the attributed metadata class seen in earlier examples, or manually specify metadata during registration time. You'll also need to register the component with the filter so the container knows to look for it.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();

    // Register the service to consume with metadata.
    // Since we're using attributed metadata, we also
    // need to register the AttributedMetadataModule
    // so the metadata attributes get read.
    builder.RegisterModule<AttributedMetadataModule>();
    builder.RegisterType<CenturyArtwork>().As<IArtwork>();

    // Specify WithAttributeFiltering for the consumer
    builder.RegisterType<ArtDisplay>().As<IDisplay>().WithAttributeFiltering();

    // ...
    var container = builder.Build();

.. _container_use_attributes:

Ensure the Container Uses Your Attributes
-----------------------------------------

The metadata attributes you create aren't just used by default. In order to tell the container that you're making use of metadata attributes, you need to register the ``AttributedMetadataModule`` into your container.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();

    // Register the service to consume with metadata.
    // Since we're using attributed metadata, we also
    // need to register the AttributedMetadataModule
    // so the metadata attributes get read.
    builder.RegisterModule<AttributedMetadataModule>();
    builder.RegisterType<CenturyArtwork>().As<IArtwork>();

    // ...
    var container = builder.Build();

If you're using metadata filters (``KeyFilterAttribute`` or ``MetadataFilterAttribute`` in your constructors), you need to register those components using the ``WithAttributeFiltering`` extension. Note that if you're *only* using filters but not attributed metadata, you don't actually need the ``AttributedMetadataModule``. Metadata filters stand on their own.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();

    // Specify WithAttributeFiltering for the consumer
    builder.RegisterType<ArtDisplay>().As<IDisplay>().WithAttributeFiltering();
    // ...
    var container = builder.Build();

Opting In Per Registration
--------------------------

``AttributedMetadataModule`` reads metadata attributes for everything in the container. If you'd rather opt in one registration at a time, ``WithAttributedMetadata()`` does the same job for a single reflection-based registration - so ``RegisterType`` and ``RegisterAssemblyTypes`` opt in the same way:

.. sourcecode:: csharp

    builder.RegisterType<CenturyArtwork>().As<IArtwork>().WithAttributedMetadata();

    builder.RegisterAssemblyTypes(typeof(CenturyArtwork).Assembly)
           .As<IArtwork>()
           .WithAttributedMetadata();

This works on reflection-based registrations, where the implementation type is known when the registration is made. Delegate registrations don't expose one, so those still need the module. Mixing the two is safe - the module doesn't overwrite metadata keys that are already present, so metadata is applied once either way.

Example
=======

There is an example project showing all four ways to attach metadata, and filtering on it at the point of injection, `in the Autofac examples repository <https://github.com/autofac/Examples/tree/main/src/AttributeMetadataExample>`_.
