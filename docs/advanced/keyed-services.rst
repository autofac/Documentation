========================
Named and Keyed Services
========================

Autofac provides three typical ways to identify services. The most common is to identify by type:

.. sourcecode:: csharp

    builder.RegisterType<OnlineState>().As<IDeviceState>();

This example associates the ``IDeviceState`` typed service with the ``OnlineState`` component. Instances of the component can be retrieved using the service type with the ``Resolve()`` method:

.. sourcecode:: csharp

    var r = container.Resolve<IDeviceState>();

However, you can also identify services by a string name or by an object key.

Named Services
==============

Services can be further identified using a service name. Using this technique, the ``Named()`` registration method replaces ``As()``.

.. sourcecode:: csharp

    builder.RegisterType<OnlineState>().Named<IDeviceState>("online");

To retrieve a named service, the ``ResolveNamed()`` method is used:

.. sourcecode:: csharp

    var r = container.ResolveNamed<IDeviceState>("online");

**Named services are simply keyed services that use a string as a key**, so the techniques described in the next section apply equally to named services.

Keyed Services
==============

Using strings as component names is convenient in some cases, but in others we may wish to use keys of other types. Keyed services provide this ability.

For example, an enum may describe the different device states in our example:

.. sourcecode:: csharp

    public enum DeviceState { Online, Offline }

Each enum value corresponds to an implementation of the service:

.. sourcecode:: csharp

    public class OnlineState : IDeviceState { }

The enum values can then be registered as keys for the implementations as shown below.

.. sourcecode:: csharp

     var builder = new ContainerBuilder();
    builder.RegisterType<OnlineState>().Keyed<IDeviceState>(DeviceState.Online);
    builder.RegisterType<OfflineState>().Keyed<IDeviceState>(DeviceState.Offline);
    // Register other components here

Resolving Explicitly
--------------------

The implementation can be resolved explicitly with ``ResolveKeyed()``:

.. sourcecode:: csharp

    var r = container.ResolveKeyed<IDeviceState>(DeviceState.Online);

This does however result in using the container as a Service Locator, which is discouraged. As an alternative to this pattern, the ``IIndex`` type is provided.

Resolving with an Index
-----------------------

``Autofac.Features.Indexed.IIndex<K,V>`` is a :doc:`relationship type that Autofac implements automatically <../resolve/relationships>`. Components that need to choose between service implementations based on a key can do so by taking a constructor parameter of type ``IIndex<K,V>``.

.. sourcecode:: csharp

    public class Modem : IHardwareDevice
    {
      IIndex<DeviceState, IDeviceState> _states;
      IDeviceState _currentState;

      public Modem(IIndex<DeviceState, IDeviceState> states)
      {
         _states = states;
         SwitchOn();
      }

      void SwitchOn()
      {
         _currentState = _states[DeviceState.Online];
      }
    }


In the ``SwitchOn()`` method, the index is used to find the implementation of ``IDeviceState`` that was registered with the ``DeviceState.Online`` key.

Resolving with Attributes
-------------------------
The :doc:`metadata feature of Autofac provides a KeyFilterAttribute <metadata>` that allows you to mark constructor parameters with an attribute specifying which keyed service should be used. The attribute usage looks like this:

.. sourcecode:: csharp

    public class ArtDisplay : IDisplay
    {
      public ArtDisplay([KeyFilter("Painting")] IArtwork art) { ... }
    }

When you register a component that needs attribute filtering, you need to make sure to opt in. There's a minor but non-zero performance hit to query for the attributes and do the filtering so it doesn't just automatically happen.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<Painting>().Keyed<IArtwork>("Painting");
    builder.RegisterType<ArtDisplay>().As<IDisplay>().WithAttributeFiltering();

:doc:`See the metadata documentation <metadata>` for more info on working with attributes and filtering.

AnyKey
------

``KeyedService.AnyKey`` is a special sentinel value that allows a single registration to respond to *any* key at resolution time. This is useful when one implementation should handle all keyed requests dynamically.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<Service>().Keyed<IService>(KeyedService.AnyKey);

    var container = builder.Build();

    // Resolves successfully with any key
    var s1 = container.ResolveKeyed<IService>("some-key");
    var s2 = container.ResolveKeyed<IService>("another-key");

An ``AnyKey`` registration does not respond to unkeyed resolution - ``Resolve<IService>()`` will still throw if there is no unkeyed registration.

Resolving ``IEnumerable<IService>`` with ``KeyedService.AnyKey`` as the key returns all *explicitly-keyed* registrations in registration order; services registered under ``AnyKey`` are not included in that collection.

.. sourcecode:: csharp

    builder.RegisterType<Service>().Keyed<IService>(KeyedService.AnyKey);
    builder.RegisterInstance(service1).Keyed<IService>("first");
    builder.RegisterInstance(service2).Keyed<IService>("second");

    // Returns service1 and service2 - NOT the AnyKey-registered Service
    var all = container.ResolveKeyed<IEnumerable<IService>>(KeyedService.AnyKey);

Injecting the Service Key
-------------------------

The ``[ServiceKey]`` attribute injects the key used during resolution directly into the component being created. This is especially useful alongside ``AnyKey`` registrations when the component needs to know which key it was resolved under.

For constructor injection, decorate the parameter with ``[ServiceKey]``:

.. sourcecode:: csharp

    public class Service : IService
    {
        private readonly string _id;
        public Service([ServiceKey] string id) => _id = id;
    }

    // Registration:
    builder.RegisterType<Service>().Keyed<IService>(KeyedService.AnyKey);

    // The key "my-service" is passed into the constructor automatically:
    var svc = container.ResolveKeyed<IService>("my-service");

The attribute also works on properties when using ``PropertiesAutowired()``:

.. sourcecode:: csharp

    public class Service : IService
    {
        [ServiceKey]
        public string Key { get; set; }
    }

    builder.RegisterType<Service>().Keyed<IService>(KeyedService.AnyKey).PropertiesAutowired();

In a lambda registration, use ``p.KeyedServiceKey<T>()`` to access the resolution key:

.. sourcecode:: csharp

    builder.Register<IService>((ctx, p) =>
    {
        var key = p.KeyedServiceKey<string>();
        return new Service(key);
    }).Keyed<IService>(KeyedService.AnyKey);
