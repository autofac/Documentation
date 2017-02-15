======================================
Windows Communication Foundation (WCF)
======================================

WCF integration for both clients and services requires the `Autofac.Wcf NuGet package <https://www.nuget.org/packages/Autofac.Wcf/>`_.

WCF integration provides dependency injection integration for services as well as client proxies.  **Due to WCF internals, there is no explicit support in WCF for per-request lifetime dependencies.**

.. contents::
  :local:

Clients
=======

There are a couple of benefits to using Autofac in conjunction with your service client application:

- **Deterministic disposal**: Automatically free resources consumed by proxies created by ``ChannelFactory.CreateChannel<T>()``.
- **Easy service proxy injection**: For types that consume services you can easily inject a dependency on the service interface type.

During application startup, for each service register a ``ChannelFactory<T>`` and a function that uses the factory to open channels:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();

    // Register the channel factory for the service. Make it
    // SingleInstance since you don't need a new one each time.
    builder
      .Register(c => new ChannelFactory<ITrackListing>(
        new BasicHttpBinding(),
        new EndpointAddress("http://localhost/TrackListingService")))
      .SingleInstance();

    // Register the service interface using a lambda that creates
    // a channel from the factory. Include the UseWcfSafeRelease()
    // helper to handle proper disposal.
    builder
      .Register(c => c.Resolve<ChannelFactory<ITrackListing>>().CreateChannel())
      .As<ITrackListing>()
      .UseWcfSafeRelease();

    // You can also register other dependencies.
    builder.RegisterType<AlbumPrinter>();

    var container = builder.Build();

In this example...

- The call to ``CreateChannel()`` isn't executed until ``ITrackListing`` is requested from the container.
- The ``UseWcfSafeRelease()`` configuration option ensures that exception messages are not lost when disposing client channels.

When consuming the service, add a constructor dependency as normal. This example shows an application that prints a track listing to the console using the remote ``ITrackListing`` service. It does this via the ``AlbumPrinter`` class:

.. sourcecode:: csharp

    public class AlbumPrinter
    {
      readonly ITrackListing _trackListing;

      public AlbumPrinter(ITrackListing trackListing)
      {
        _trackListing = trackListing;
      }

      public void PrintTracks(string artist, string album)
      {
        foreach (var track in _trackListing.GetTracks(artist, album))
          Console.WriteLine("{0} - {1}", track.Position, track.Title);
      }
    }

When you resolve the ``AlbumPrinter`` class from a lifetime scope, the channel to the ``ITrackListing`` service will be injected for you.

Note that, given :doc:`the service proxy is disposable <../lifetime/disposal>`, it should be resolved from a child lifetime scope, not the root container. Thus, if you have to manually resolve it (for whatever reason), be sure you're creating a child scope from which to do it:

.. sourcecode:: csharp

    using(var lifetime = container.BeginLifetimeScope())
    {
      var albumPrinter = lifetime.Resolve<AlbumPrinter>();
      albumPrinter.PrintTracks("The Shins", "Wincing the Night Away");
    }

Services
========

Quick Start
-----------

To get Autofac integrated with WCF on the service side you need to reference the WCF integration NuGet package, register your services, and set the dependency resolver. You also need to update your ``.svc`` files to reference the Autofac service host factory.

Here's a sample application startup block:

.. sourcecode:: csharp

    protected void Application_Start()
    {
      var builder = new ContainerBuilder();

      // Register your service implementations.
      builder.RegisterType<TestService.Service1>();

      // Set the dependency resolver.
      var container = builder.Build();
      AutofacHostFactory.Container = container;
    }

And here's a sample ``.svc`` file.

.. sourcecode:: aspx-cs

    <%@ ServiceHost
        Service="TestService.Service1, TestService"
        Factory="Autofac.Integration.Wcf.AutofacServiceHostFactory, Autofac.Integration.Wcf" %>

The sections below go into further detail about what each of these features do and how to use them.

Register Service Implementations
--------------------------------

You can register your service types in one of three ways: by type, by interface, or by name.

Register By Type
""""""""""""""""

Your first option is to simply register the service implementation type in the container and specify that implementation type in the .svc file. **This is the most common usage.**

In your application startup, you'd have code like this:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<TestService.Service1>();
    AutofacHostFactory.Container = builder.Build();

And your ``.svc`` file would specify the appropriate service implementation type and host factory, like this:

.. sourcecode:: aspx-cs

    <%@ ServiceHost
        Service="TestService.Service1, TestService"
        Factory="Autofac.Integration.Wcf.AutofacServiceHostFactory, Autofac.Integration.Wcf" %>

Note that **you need to use the fully-qualified name of your service in the .svc file**, i.e. ``Service="Namespace.ServiceType, AssemblyName"``.

Register by Interface
"""""""""""""""""""""

Your second option is to register the contract type in the container and specify the contract in the ``.svc`` file. This is handy if you don't want to change the ``.svc`` file but do want to change the implementation type that will handle requests.

In your application startup, you'd have code like this:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<TestService.Service1>()
           .As<TestService.IService1>();
    AutofacHostFactory.Container = builder.Build();

And your .svc file would specify the service contract type and host factory, like this:

.. sourcecode:: aspx-cs

    <%@ ServiceHost
        Service="TestService.IService1, TestService"
        Factory="Autofac.Integration.Wcf.AutofacServiceHostFactory, Autofac.Integration.Wcf" %>

Note that **you need to use the fully-qualified name of your contract in the .svc file**, i.e. ``Service="Namespace.IContractType, AssemblyName"``.

Register by Name
""""""""""""""""

The third option you have is to register a named service implementation in the container and specify that service name in the ``.svc`` file. This is handy if you want even further abstraction away from the ``.svc`` file.

In your application startup, you'd have code like this:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<TestService.Service1>()
           .Named<object>("my-service");
    AutofacHostFactory.Container = builder.Build();

Note that the service implementation type is **registered as an object - this is important**. Your service implementation won't be found if it's a named service and it's not registered as an object.

Your ``.svc`` file specifies the service name you registered and host factory, like this:

.. sourcecode:: aspx-cs

    <%@ ServiceHost
        Service="my-service"
        Factory="Autofac.Integration.Wcf.AutofacServiceHostFactory, Autofac.Integration.Wcf" %>

Pick the Right Host Factory
---------------------------

WCF offers two service host factories. Autofac has corresponding implementations for each.

If you were using ``ServiceHostFactory`` in your ``.svc`` file, update to the ``AutofacServiceHostFactory``. This is the most common usage of Autofac and WCF.

If you were using ``WebServiceHostFactory`` in your ``.svc`` file, update to ``AutofacWebServiceHostFactory``.

Svc-Less Services
-----------------

If you want to use services without an ``.svc`` file, Autofac will work with that.

As shown above, register your service with the container.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<Service1>();
    AutofacHostFactory.Container = builder.Build();

To use svc-less services, add a factory entry under the ``serviceActivation`` element in the ``web.config`` file. This ensures that the ``AutofacServiceHostFactory`` is used to activate the service.

.. sourcecode:: xml

    <serviceHostingEnvironment aspNetCompatibilityEnabled="true" multipleSiteBindingsEnabled="true">
      <serviceActivations>
        <add factory="Autofac.Integration.Wcf.AutofacServiceHostFactory, Autofac.Integration.Wcf"
             relativeAddress="~/Service1.svc"
             service="TestService.Service1, TestService" />
      </serviceActivations>
    </serviceHostingEnvironment>

Extensionless Services
----------------------

If you want extensionless services, register your service with the container as shown above.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<Service1>();
    AutofacHostFactory.Container = builder.Build();


Then define a new ``ServiceRoute`` using the ``AutofacServiceHostFactory`` and service implementation type.

.. sourcecode:: csharp

    RouteTable.Routes.Add(new ServiceRoute("Service1", new AutofacServiceHostFactory(), typeof(Service1)));

Finally, add the ``UrlRoutingModule`` to the `web.config` file.

.. sourcecode:: xml

    <system.webServer>
      <modules runAllManagedModulesForAllRequests="true">
        <add name="UrlRoutingModule" type="System.Web.Routing.UrlRoutingModule, System.Web, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a" />
      </modules>
      <handlers>
        <add name="UrlRoutingHandler" preCondition="integratedMode" verb="*" path="UrlRouting.axd" />
      </handlers>
    </system.webServer>

After configuring your application in IIS you will be able to access the WCF service at: ``http://hostname/appname/Service1``

WAS Hosting and Non-HTTP Activation
-----------------------------------

When hosting WCF Services in WAS (Windows Activation Service), you are not given an opportunity to build your container in the ``Application_Start`` event defined in your ``Global.asax`` because WAS doesn't use the standard ASP.NET pipeline.

The alternative approach is to place a code file in your ``App_Code`` folder that contains a type with a ``public static void AppInitialize()`` method.

.. sourcecode:: csharp

    namespace MyNamespace
    {
      public static class AppStart
      {
        public static void AppInitialize()
        {
          // Put your container initialization here.
        }
      }
    }

You can read more about ``AppInitialize()`` in "`How to Initialize Hosted WCF Services <http://blogs.msdn.com/b/wenlong/archive/2006/01/11/511514.aspx>`_".

Self-Hosting
------------

To use the integration when self-hosting your WCF Service, the key is to use the ``AddDependencyInjectionBehavior()`` extension on your service host. Set up your container with your registrations, but **don't set the global container**. Instead, apply the container to your service host.

.. sourcecode:: csharp

    ContainerBuilder builder = new ContainerBuilder();
    builder.RegisterType<Service1>();

    using (var container = builder.Build())
    {
        Uri address = new Uri("http://localhost:8080/Service1");
        ServiceHost host = new ServiceHost(typeof(Service1), address);
        host.AddServiceEndpoint(typeof(IEchoService), new BasicHttpBinding(), string.Empty);

        // Here's the important part - attaching the DI behavior to the service host
        // and passing in the container.
        host.AddDependencyInjectionBehavior<IService1>(container);

        host.Description.Behaviors.Add(new ServiceMetadataBehavior {HttpGetEnabled = true, HttpGetUrl = address});
        host.Open();

        Console.WriteLine("The host has been opened.");
        Console.ReadLine();

        host.Close();
        Environment.Exit(0);
    }

Handling InstanceContextMode.Single Services
--------------------------------------------

Using ``InstanceContextMode.Single`` is not a good idea from a scalability point of view, and allowing multiple callers to access the single instance using ``ConcurrencyMode.Multiple`` means that you also need to be careful about multiple threads accessing any shared state. If possible you should create services with ``InstanceContextMode.PerCall``.

IIS/WAS Hosted
""""""""""""""

The ``AutofacServiceHostFactory`` identifies WCF services that are marked with ``InstanceContextMode.Single`` and will ensure that the ``ServiceHost`` can be provided with a singleton instance from the container. An exception will be thrown if the service in the container was not registered with the ``SingleInstance()`` lifetime scope. It is also invalid to register a ``SingleInstance()`` service in the container for a WCF service that is not marked as ``InstanceContextMode.Single``.

Self-Hosted
"""""""""""

It is possible to manually perform constructor injection for service marked with ``InstanceContextMode.Single`` when self-hosting. This is achieved by resolving a ``SingleInstance()`` service from the container and then passing that into the constructor of a manually created ``ServiceHost``.

.. sourcecode:: csharp

    // Get the SingleInstance from the container.
    var service = container.Resolve<IService1>();
    // Pass it into the ServiceHost preventing it from creating an instance with the default constructor.
    var host = new ServiceHost(service, new Uri("http://localhost:8080/Service1"));

Simulating a Request Lifetime Scope
-----------------------------------

As noted earlier, **due to WCF internals, there is no explicit support in WCF for per-request lifetime dependencies.**

The way Autofac hooks into WCF, it uses an `instance provider <https://msdn.microsoft.com/en-us/library/system.servicemodel.dispatcher.iinstanceprovider(v=vs.110).aspx>`_ to resolve your service and dependencies. The instance provider makes use of the service instance context to track the lifetime scope in which your service and its dependencies live.

What that boils down to: A lifetime scope is created based on the `instance context mode <https://msdn.microsoft.com/en-us/library/system.servicemodel.servicebehaviorattribute.instancecontextmode(v=vs.110).aspx>`_ of your service.

`If you leave it default, that's "per session." <https://msdn.microsoft.com/en-us/library/system.servicemodel.servicebehaviorattribute.instancecontextmode(v=vs.110).aspx>`_ One instance of your service will be created when a client calls it, and subsequent calls from that client will get the same instance.

However, if you want to simulate a per-request lifetime scope, you can:

- Set your service to be instance-per-call using the `WCF ServiceBehaviorAttribute <https://msdn.microsoft.com/en-us/library/system.servicemodel.servicebehaviorattribute.instancecontextmode(v=vs.110).aspx>`_.
- Register your service and dependencies to be instance-per-lifetime-scope.

Doing those two things, you'll get a new lifetime scope for every call (because the WCF instance context will want to create a new service instance per call). Your service and dependencies will then be resolved as just one time within that instance context lifetime scope - effectively a per-request lifetime.

Note this can backfire on you if you have dependencies that are shared between your per-call services and your per-session / single-instance services: In those, you don't get a new instance of the service for each call, which means the shared dependencies (registered "instance per lifetime scope") will also be a singleton for the life of the service. You may need to experiment and test with dependencies registered as "instance per call" or "instance per lifetime scope" to get the desired effect.

Using Decorators With Services
------------------------------

The standard Autofac service hosting works well for almost every case, but if you are using :doc:`decorators <../advanced/adapters-decorators>` on your WCF service implementation (not the dependencies, but the actual service implementation) then you need to use the :doc:`multitenant WCF service hosting mechanism <../advanced/multitenant>` rather than the standard Autofac service host.

You do not need to use a multitenant container, pass a tenant ID, or use any of the other multitenant options, but you do need to use the multitenant service host.

The reason for this is that WCF hosting (internal to .NET) requires the host be initialized with a concrete type (not abstract/interface) and once the type is provided you can't change it. When using decorators, we don't actually know the final type (once you chain together all the decorators, etc.) until you resolve the first instance... but that happens after the host needs the type name. The multitenant hosting mechanism works around this by adding another dynamic proxy - an empty, target-free concrete class that implements the service interface. When the WCF host needs an implementation, one of these dynamic proxies gets fired up and the actual implementation (in this case, your decorated WCF implementation) will be the target.

Again, you only need to do this if you're decorating the service implementation class itself. If you are only decorating/adapting dependencies of the service implementation, you do not need the multitenant host. Standard hosting will work.

Example
-------

The Autofac example repository has a `WCF service implementation example <https://github.com/autofac/Examples/tree/master/src/WcfExample>`_ as well as `an MVC application that acts as a client for that service <https://github.com/autofac/Examples/tree/master/src/MvcExample>`_.

There are also examples showing a `multitenant WCF service <https://github.com/autofac/Examples/tree/master/src/MultitenantExample.WcfService>`_ and `associated client <https://github.com/autofac/Examples/tree/master/src/MultitenantExample.MvcApplication>`_ to illustrate how :doc:`multitenant service hosting <../advanced/multitenant>` works.
