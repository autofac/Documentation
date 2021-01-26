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

Example
=======

There is an example project showing Service Fabric integration `in the Autofac examples repository <https://github.com/autofac/Examples/tree/master/src/ServiceFabricDemo>`_.
