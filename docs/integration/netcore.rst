============
.NET Core
============

.NET Core comes with a `conforming container <http://blog.ploeh.dk/2014/05/19/conforming-container/>`_ in the form of `Microsoft.Extensions.DependencyInjection <https://github.com/aspnet/DependencyInjection>`_. The ``Autofac.Extensions.DependencyInjection`` package implements the abstractions for this to provide DI via Autofac.

The integration with :doc:`ASP.NET Core <aspnetcore>` is very similar to this since the whole framework has unified the abstraction around dependency injection. Our :doc:`ASP.NET Core integration docs<aspnetcore>` have more info on specific topics relating to ASP.NET Core usage.

.. contents::
  :local:

Quick Start
===========

To take advantage of Autofac in your .NET Core application via the ``Microsoft.Extensions.DependencyInjection`` package:

* Reference the ``Autofac.Extensions.DependencyInjection`` package from NuGet.
* During application startup (e.g., in the ``Program`` or  ``Startup`` class)...

  - Register services in an ``IServiceCollection`` using framework extensions.
  - Populate those registered servcies into Autofac.
  - Add Autofac registrations and overrides.
  - Build your container.
  - Create an ``AutofacServiceProvider`` using the container.

.. sourcecode:: csharp

    public class Program
    {
      public static void Main(string[] args)
      {
        // The Microsoft.Extensions.DependencyInjection.ServiceCollection
        // has extension methods provided by other .NET Core libraries to
        // regsiter services with DI.
        var serviceCollection = new ServiceCollection();

        // The Microsoft.Extensions.Logging package provides this one-liner
        // to add logging services.
        serviceCollection.AddLogging();

        var containerBuilder = new ContainerBuilder();

        // Once you've registered everything in the ServiceCollection, call
        // Populate to bring those registrations into Autofac. This is
        // just like a foreach over the list of things in the collection
        // to add them to Autofac.
        containerBuilder.Populate(serviceCollection);

        // Make your Autofac registrations. Order is important!
        // If you make them BEFORE you call Populate, then the
        // registrations in the ServiceCollection will override Autofac
        // registrations; if you make them AFTER Populate, the Autofac
        // registrations will override. You can make registrations
        // before or after Populate, however you choose.
        containerBuilder.RegisterType<MessageHandler>().As<IHandler>();

        // Creating a new AutofacServiceProvider makes the container
        // available to your app using the Microsoft IServiceProvider
        // interface so you can use those abstractions rather than
        // binding directly to Autofac.
        var container = containerBuilder.Build();
        var serviceProvider = new AutofacServiceProvider(container);
      }
    }

**You don't have to use Microsoft.Extensions.DependencyInjection.** If you aren't writing a .NET Core app that requires it or if you're not using any of the DI extensions provided by other libraries you can consume Autofac directly. You also may only need to do the ``Populate()`` call and not need the ``AutofacServiceProvider``. Use the pieces that make sense for your app.

Using a Child Scope as a Root
=============================

In a complex application you may want to keep services registered using ``Populate()`` in a child lifetime scope. For example, an application that does some self-hosting of ASP.NET Core components may want to keep the MVC registrations and such isolated from the main container. The ``Populate()`` method offers an overload to allow you to specify a tagged child lifetime scope that should serve as the "container" for items.

.. note::

   If you use this, you will not be able to use the ASP.NET Core support for ``IServiceProviderFactory{TContainerBuilder}`` (the ``ConfigureContainer`` support). This is because ``IServiceProviderFactory{TContainerBuilder}`` assumes it's working at the root level.

.. sourcecode:: csharp

    public class Program
    {
      private const string RootLifetimeTag = "MyIsolatedRoot";

      public static void Main(string[] args)
      {
        var serviceCollection = new ServiceCollection();
        serviceCollection.AddLogging();

        var containerBuilder = new ContainerBuilder();
        containerBuilder.RegisterType<MessageHandler>().As<IHandler>();
        var container = containerBuilder.Build();

        using(var scope = container.BeginLifetimeScope(RootLifetimeTag, b =>
        {
          b.Populate(serviceCollection, RootLifetimeTag);
        }))
        {
          // This service provider will have access to global singletons
          // and registrations but the "singletons" for things registered
          // in the service collection will be "rooted" under this
          // child scope, unavailable to the rest of the application.
          //
          // Obviously it's not super helpful being in this using block,
          // so likely you'll create the scope at app startup, keep it
          // around during the app lifetime, and dispose of it manually
          // yourself during app shutdown.
          var serviceProvider = new AutofacServiceProvider(scope);
        }
      }
    }