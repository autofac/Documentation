==============
Service Fabric
==============

The `Autofac.ServiceFabric <https://www.nuget.org/packages/Autofac.ServiceFabric>`_ package enables integration of Autofac with `Service Fabric <https://azure.microsoft.com/en-us/services/service-fabric/>`_ services.

.. contents::
  :local:

Quick Start
===========

In your ``Main`` program method, build up your container and register services using the Autofac extensions. This will attach service registrations from the container and the ``ServiceRuntime``. Dispose of the container at app shutdown.

.. sourcecode:: csharp

    using System;
    using System.Diagnostics;
    using System.Reflection;
    using System.Threading;
    using Autofac;
    using Autofac.Integration.ServiceFabric;

    namespace DemoService
    {
      public static class Program
      {
          private static void Main()
          {
            try
            {
              // The ServiceManifest.xml file defines one or more service type names.
              // Registering a service maps a service type name to a .NET type.
              // When Service Fabric creates an instance of this service type,
              // an instance of the class is created in this host process.

              // Start with the trusty old container builder.
              var builder = new ContainerBuilder();

              // Register any regular dependencies.
              builder.RegisterModule(new LoggerModule(ServiceEventSource.Current.Message));

              // Register the Autofac magic for Service Fabric support.
              builder.RegisterServiceFabricSupport();

              // Register a stateless service...
              builder.RegisterStatelessService<DemoStatelessService>("DemoStatelessServiceType");

              // ...and/or register a stateful service.
              // builder.RegisterStatefulService<DemoStatefulService>("DemoStatefulServiceType");

              using (builder.Build())
              {
                ServiceEventSource.Current.ServiceTypeRegistered(
                  Process.GetCurrentProcess().Id,
                  typeof(DemoStatelessService).Name);

                // Prevents this host process from terminating so services keep running.
                Thread.Sleep(Timeout.Infinite);
              }
          }
          catch (Exception e)
          {
            ServiceEventSource.Current.ServiceHostInitializationFailed(e.ToString());
            throw;
          }
        }
      }
    }

Registration Requirements
=========================

Registered service and actor types are wrapped in a dynamic proxy so the integration can dispose the service's lifetime scope when Service Fabric closes or aborts the service. That places some requirements on the types you register:

* The type must be a class, and it must not be ``sealed`` or ``abstract``.
* Only ``virtual`` members can be intercepted.
* The type must be visible to the proxy generator - see below if your service types are ``internal``.

Internal Service Types
----------------------

Castle DynamicProxy generates proxies into an assembly named ``DynamicProxyGenAssembly2``, so an ``internal`` service or actor type has to grant that assembly access to its internals. Without it you'll see an error like ``Access is denied: 'MyNamespace.MyService'``.

Which form of the attribute you need depends on whether **your** assembly is strong named. Castle only signs the generated assembly when the assembly containing the proxied type is itself signed.

If your assembly is strong named, use the constant from ``Castle.Core.Internal``, which includes Castle's public key:

.. sourcecode:: csharp

    using System.Runtime.CompilerServices;
    using Castle.Core.Internal;

    [assembly: InternalsVisibleTo(InternalsVisible.ToDynamicProxyGenAssembly2)]

If your assembly is *not* strong named, name the assembly without a public key:

.. sourcecode:: csharp

    using System.Runtime.CompilerServices;

    [assembly: InternalsVisibleTo("DynamicProxyGenAssembly2")]

.. note::

   Using the keyed form from an unsigned assembly is the usual cause of ``Access is denied``. The public key in the attribute won't match the unsigned generated assembly, so the grant doesn't apply. This is unrelated to whether the ``Autofac.ServiceFabric`` package is signed.

Service and Actor Lifetime Scopes
=================================

When Service Fabric creates a service or actor, the integration creates a child lifetime scope for it, tagged ``ServiceFabric`` by default, and resolves the instance from that scope. The scope is disposed when the service is closed or aborted.

The context objects that Service Fabric supplies are registered into that child scope rather than into the root container. That includes ``ServiceContext`` and its ``StatelessServiceContext`` / ``StatefulServiceContext`` forms, along with ``ActorService`` and ``ActorId`` for actors.

This has an important consequence: **a component that depends on** ``ServiceContext`` **cannot be registered as** ``SingleInstance()``. A single instance component is rooted in the container, where those context registrations don't exist, so resolving it fails with ``The requested service 'System.Fabric.ServiceContext' has not been registered``. Injecting ``Lazy<T>`` or ``Func<T>`` doesn't help, because the problem is where the component lives, not when it's created.

Register such components against the service scope instead:

.. sourcecode:: csharp

    // This fails at resolve time - the root container has no ServiceContext.
    builder.RegisterType<TelemetryLogger>()
      .As<ILogger>()
      .SingleInstance();

    // This works, and gives you one instance per service or actor.
    builder.RegisterType<TelemetryLogger>()
      .As<ILogger>()
      .InstancePerMatchingLifetimeScope("ServiceFabric");

If you passed a custom ``lifetimeScopeTag`` when registering the service, match that tag instead of ``"ServiceFabric"``.

Adding Registrations to the Service Scope
-----------------------------------------

Some components can only be built once the ``ServiceContext`` exists, which means they have to be registered while the service scope is being created. ``RegisterServiceFabricSupport`` takes a ``configurationAction`` for this - it runs during creation of every service and actor scope, after the context objects have been registered.

The Application Insights ``FabricTelemetryInitializer`` is the canonical example, since it needs the ``ServiceContext`` to be constructed:

.. sourcecode:: csharp

    builder.RegisterServiceFabricSupport(
      configurationAction: b =>
        b.Register(c => FabricTelemetryInitializerExtension.CreateFabricTelemetryInitializer(
            c.Resolve<ServiceContext>()))
          .As<ITelemetryInitializer>()
          .SingleInstance());

Resolve the context from the ``IComponentContext`` passed to the registration delegate, as shown, rather than capturing it - the instance is registered just before the action runs, while the scope is still being built.

Per-Request Scopes
==================

It is possible to achieve a "per request" style scoping mechanism by making use of the :doc:`implicit relationships <../resolve/relationships>` supported by Autofac.

For example, if you have a stateless service, its lifetime is effectively a singleton. You would want to use the ``Func<T>`` or ``Func<Owned<T>>`` relationships (for non-disposable vs. disposable components, respectively) to inject an auto-generated factory into your service. Your service could then resolve dependencies as needed.

For example, say you have a user service that is stateless and it needs to read from some backing store that shouldn't be a singleton. Assuming the backing store is ``IDisposable`` you'd want to use ``Func<Owned<T>>`` and inject it like this:

.. sourcecode:: csharp

    public class UserService: IUserService
    {
      private readonly Func<Owned<IUserStore>> _userStoreFactory;

      public UserService(Func<Owned<IUserStore>> userStoreFactory)
      {
        _userStoreFactory = userStoreFactory;
      }

      public async Task<string> GetNameAsync(int id)
      {
        using (var userStore = _userStoreFactory())
        {
          return await userStore.Value.GetNameAsync(id);
        }
      }
    }

While there's no "built in" semantics around per-request handling specifically, you can do a lot with the :doc:`implicit relationships <../resolve/relationships>` so it's worth becoming familiar with them.

Service Fabric Package Versions
===============================

The ``Microsoft.ServiceFabric.*`` packages pin each other to exact versions. ``Microsoft.ServiceFabric.Actors``, for example, requires an exact match of ``Microsoft.ServiceFabric.Services.Remoting``, which in turn requires exact matches of its own dependencies, all the way down to the ``Microsoft.ServiceFabric`` runtime package.

To keep that from dictating your Service Fabric version, ``Autofac.ServiceFabric`` references the *oldest* Service Fabric SDK it supports rather than the newest. NuGet treats package references as minimums, so your own Service Fabric version wins and you're free to use any newer SDK without waiting for a new release of the integration.

What this does mean is that you should **reference the Service Fabric packages you use explicitly, and keep them consistent with each other**. Mixing versions among your own Service Fabric references is what produces ``NU1608``:

.. sourcecode:: text

    warning NU1608: Detected package version outside of dependency constraint:
    Microsoft.ServiceFabric.Actors 8.6.239 requires Microsoft.ServiceFabric.Data (= 8.6.239)
    but version Microsoft.ServiceFabric.Data 8.5.216 was resolved.

If you don't reference the Service Fabric packages yourself, you'll silently get the oldest supported versions, which probably isn't what you want. The Service Fabric project templates add these references for you.

.. note::

   Building against an older SDK than you run against is expected and supported here - the Service Fabric assemblies keep the same assembly version across package releases, so there's no binding difference. Microsoft documents the SDK as backwards compatible, and which SDK versions pair with which cluster runtime is listed in the `Service Fabric versions <https://learn.microsoft.com/azure/service-fabric/service-fabric-versions>`_ reference.
