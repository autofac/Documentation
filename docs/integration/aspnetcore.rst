============
ASP.NET Core
============

ASP.NET Core (previously ASP.NET 5) changes the way dependency injection frameworks have previously integrated into ASP.NET execution. Previously, each functionality - MVC, Web API, etc. - had its own "dependency resolver" mechanism and just slightly different ways to hook in. ASP.NET Core introduces a `conforming container <https://blog.ploeh.dk/2014/05/19/conforming-container/>`__ mechanism via `Microsoft.Extensions.DependencyInjection <https://github.com/dotnet/runtime/tree/main/src/libraries/Microsoft.Extensions.DependencyInjection>`_, including a unified notion of request lifetime scope, service registration, and so forth.

Further, as of ASP.NET Core 3.0, there's a "generic app hosting" mechanism in play that can be used in non-ASP.NET Core apps.

**This page explains ASP.NET Core and generic .NET Core hosting integration.** If you are using ASP.NET classic, :doc:`see the ASP.NET classic integration page <aspnet>`.

If you're using .NET Core without ASP.NET Core (and/or without the generic hosting), :doc:`there's a simpler example here <netcore>` showing that integration.

.. contents::
  :local:

Quick Start
===========

* Reference the ``Autofac.Extensions.DependencyInjection`` package from NuGet.
* Attach the Autofac service provider factory to the host.
* Register services with the ``IServiceCollection`` using the extension methods other libraries provide.
* Register your own components directly with an Autofac ``ContainerBuilder``.

The ``IServiceProvider`` gets created for you, so there's nothing to do but *register things*. Autofac calls ``Populate`` on your behalf to move what's in the service collection into the container.

**You cannot return an ``IServiceProvider`` from ``ConfigureServices``, and you cannot add the factory to the service collection.** It has to be handed to the host builder directly. That is the one rule that trips people up, whichever hosting style you use.

Minimal Hosting
---------------

This is what the current project templates give you - no ``Startup`` class, everything in ``Program.cs``. ``ConfigureContainer`` runs after the service collection is populated, so registrations here override what came from ``builder.Services``.

.. sourcecode:: csharp

    var builder = WebApplication.CreateBuilder(args);

    // Swap in Autofac as the service provider factory.
    builder.Host.UseServiceProviderFactory(new AutofacServiceProviderFactory());

    // Register directly with Autofac. Don't call Populate() - the factory
    // does that for you.
    builder.Host.ConfigureContainer<ContainerBuilder>(containerBuilder =>
    {
        containerBuilder.RegisterModule(new MyApplicationModule());
    });

    builder.Services.AddControllers();

    var app = builder.Build();
    app.MapControllers();
    app.Run();

If you need the container itself - to inspect it, or to create a scope by hand - ``GetAutofacRoot()`` will get it from the built application:

.. sourcecode:: csharp

    var container = app.Services.GetAutofacRoot();

Startup Class
-------------

The ``Startup`` class style still works, and is worth knowing about because plenty of existing applications use it. Attach the factory to the host builder, then use ``ConfigureContainer`` on the ``Startup`` class to register directly with Autofac.

.. sourcecode:: csharp

    public class Program
    {
      public static void Main(string[] args)
      {
        // The UseServiceProviderFactory call attaches the
        // Autofac provider to the generic hosting mechanism.
        var host = Host.CreateDefaultBuilder(args)
            .UseServiceProviderFactory(new AutofacServiceProviderFactory())
            .ConfigureWebHostDefaults(webHostBuilder => {
              webHostBuilder
                .UseContentRoot(Directory.GetCurrentDirectory())
                .UseStartup<Startup>();
            })
            .Build();

        host.Run();
      }
    }

In the ``Startup`` class you then use ``ConfigureContainer`` to access the Autofac container builder and register things directly with Autofac.

.. sourcecode:: csharp

    public class Startup
    {
      public Startup(IConfiguration configuration)
      {
        // In ASP.NET Core 3.x, using `Host.CreateDefaultBuilder` (as in the preceding Program.cs snippet) will
        // set up some configuration for you based on your appsettings.json and environment variables. See "Remarks" at
        // https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.hosting.host.createdefaultbuilder for details.
        this.Configuration = configuration;
      }

      public IConfiguration Configuration { get; private set; }

      public ILifetimeScope AutofacContainer { get; private set; }

      // ConfigureServices is where you register dependencies. This gets
      // called by the runtime before the ConfigureContainer method, below.
      public void ConfigureServices(IServiceCollection services)
      {
        // Add services to the collection. Don't build or return
        // any IServiceProvider or the ConfigureContainer method
        // won't get called. Don't create a ContainerBuilder
        // for Autofac here, and don't call builder.Populate() - that
        // happens in the AutofacServiceProviderFactory for you.
        services.AddOptions();
      }

      // ConfigureContainer is where you can register things directly
      // with Autofac. This runs after ConfigureServices so the things
      // here will override registrations made in ConfigureServices.
      // Don't build the container; that gets done for you by the factory.
      public void ConfigureContainer(ContainerBuilder builder)
      {
        // Register your own things directly with Autofac here. Don't
        // call builder.Populate(), that happens in AutofacServiceProviderFactory
        // for you.
        builder.RegisterModule(new MyApplicationModule());
      }

      // Configure is where you add middleware. This is called after
      // ConfigureContainer. You can use IApplicationBuilder.ApplicationServices
      // here if you need to resolve things from the container.
      public void Configure(IApplicationBuilder app)
      {
        // If, for some reason, you need a reference to the built container, you
        // can use the convenience extension method GetAutofacRoot.
        this.AutofacContainer = app.ApplicationServices.GetAutofacRoot();

        app.UseRouting();
        app.UseEndpoints(endpoints => endpoints.MapControllers());
      }
    }

Configuration Method Naming Conventions
=======================================

The ``Configure``, ``ConfigureServices``, and ``ConfigureContainer`` methods all support environment-specific naming conventions based on the ``IWebHostEnvironment.EnvironmentName`` in your app. By default, the names are ``Configure``, ``ConfigureServices``, and ``ConfigureContainer``. If you want environment-specific setup you can put the environment name after the ``Configure`` part, like ``ConfigureDevelopment``, ``ConfigureDevelopmentServices``, and ``ConfigureDevelopmentContainer``. If a method isn't present with a name matching the environment it'll fall back to the default.

This means you don't necessarily have to use :doc:`Autofac configuration <../configuration/index>` to switch configuration between a development and production environment; you can set it up programmatically in ``Startup``.

.. sourcecode:: csharp

    public class Startup
    {
      public Startup(IWebHostEnvironment env)
      {
        // Do Startup-ish things like read configuration.
      }

      // This is the default if you don't have an environment specific method.
      public void ConfigureServices(IServiceCollection services)
      {
        // Add things to the service collection.
      }

      // This only gets called if your environment is Development. The
      // default ConfigureServices won't be automatically called if this
      // one is called.
      public void ConfigureDevelopmentServices(IServiceCollection services)
      {
        // Add things to the service collection that are only for the
        // development environment.
      }

      // This is the default if you don't have an environment specific method.
      public void ConfigureContainer(ContainerBuilder builder)
      {
        // Add things to the Autofac ContainerBuilder.
      }

      // This only gets called if your environment is Production. The
      // default ConfigureContainer won't be automatically called if this
      // one is called.
      public void ConfigureProductionContainer(ContainerBuilder builder)
      {
        // Add things to the ContainerBuilder that are only for the
        // production environment.
      }

      // This is the default if you don't have an environment specific method.
      public void Configure(IApplicationBuilder app)
      {
        // Set up the application.
      }

      // This only gets called if your environment is Staging. The
      // default Configure won't be automatically called if this one is called.
      public void ConfigureStaging(IApplicationBuilder app)
      {
        // Set up the application for staging.
      }
    }

This is a feature of the application hosting in ASP.NET Core - it is not an Autofac behavior. The `StartupLoader class in ASP.NET Core <https://github.com/dotnet/aspnetcore/blob/main/src/Hosting/Hosting/src/Internal/StartupLoader.cs>`_ is what locates the methods to call during app startup. Check that class out if you want a more in-depth understanding of how this works.

Dependency Injection Hooks
==========================

Unlike :doc:`ASP.NET classic integration <aspnet>`, ASP.NET Core is designed specifically with dependency injection in mind. Injecting services into views, filters, middleware and authorization handlers is all controlled and documented by ASP.NET Core itself - there is nothing Autofac-specific to do beyond setting up the service provider as outlined above.

`Microsoft's dependency injection documentation <https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection>`_ is the place to start for any of that.

Keyed Services
==============

The keyed service APIs in ``Microsoft.Extensions.DependencyInjection`` work through Autofac, backed by :doc:`Autofac's own keyed service support <../advanced/keyed-services>`. Register with the Microsoft syntax and consume with ``[FromKeyedServices]``:

.. sourcecode:: csharp

    builder.Services.AddKeyedSingleton<IStorage, BlobStorage>("blob");
    builder.Services.AddKeyedSingleton<IStorage, FileStorage>("file");

.. sourcecode:: csharp

    public class ReportService
    {
      public ReportService([FromKeyedServices("blob")] IStorage storage, IClock clock)
      {
      }
    }

Keyed and unkeyed parameters mix freely in the same constructor. ``KeyedService.AnyKey`` works too, so ``GetKeyedServices<IStorage>(KeyedService.AnyKey)`` returns every explicitly-keyed registration.

Parameter Binding and IServiceProviderIsService
===============================================

.. warning::

   This one changes behavior in a way that is easy to miss, because nothing throws.

Starting with .NET 7, ASP.NET Core asks the container whether a parameter type is a service - through ``IServiceProviderIsService`` - to decide whether to bind it from the request body or inject it. **Autofac answers yes for every collection type**, because :doc:`collections are always resolvable in Autofac <../resolve/relationships>` and simply come back empty when nothing is registered.

The result is that a parameter like this stops binding from the body and starts arriving as an empty collection:

.. sourcecode:: csharp

    // On .NET 6 this bound from the request body.
    // On .NET 7+ it arrives empty, because Autofac reports
    // IReadOnlyCollection<WeatherForecast> as a service.
    [HttpPost]
    public IActionResult Post(IReadOnlyCollection<WeatherForecast> forecasts)

It affects every collection shape Autofac supplies - ``IEnumerable<T>``, ``IList<T>``, ``ICollection<T>``, ``IReadOnlyCollection<T>``, ``IReadOnlyList<T>`` and arrays.

**Be explicit with** ``[FromBody]`` **on collection parameters you want bound from the request:**

.. sourcecode:: csharp

    [HttpPost]
    public IActionResult Post([FromBody] IReadOnlyCollection<WeatherForecast> forecasts)

Autofac deliberately doesn't special-case empty collections here. Reporting a collection as "not a service" when nothing happens to be registered would make the answer depend on registration order, break the case where you *do* want to inject an empty set, and contradict the documented behavior that collection relationships always resolve.

Differences From ASP.NET Classic
================================

If you've used Autofac's other :doc:`ASP.NET integration <aspnet>` then you may be interested in the key differences as you migrate to using ASP.NET Core.

* **Use InstancePerLifetimeScope instead of InstancePerRequest.** In previous ASP.NET integration you could register a dependency as ``InstancePerRequest`` which would ensure only one instance of the dependency would be created per HTTP request. This worked because Autofac was in charge of :doc:`setting up the per-request lifetime scope <../faq/per-request-scope>`. With the introduction of ``Microsoft.Extensions.DependencyInjection``, the creation of per-request and other child lifetime scopes is now part of the `conforming container <https://blog.ploeh.dk/2014/05/19/conforming-container/>`__ provided by the framework, so all child lifetime scopes are treated equally - there's no special "request level scope" anymore. Instead of registering your dependencies ``InstancePerRequest``, use ``InstancePerLifetimeScope`` and you should get the same behavior. Note if you are creating *your own lifetime scopes* during web requests, you will get a new instance in these child scopes.
* **No more DependencyResolver.** Other ASP.NET integration mechanisms required setting up a custom Autofac-based dependency resolver in various locations. With ``Microsoft.Extensions.DependencyInjection`` and the ``Startup.ConfigureServices`` method, you now just return the ``IServiceProvider`` and "magic happens." Within controllers, classes, etc. if you need to manually do service location, get an ``IServiceProvider``.
* **No special middleware.** The :doc:`OWIN integration <owin>` previously required registration of a special Autofac middleware to manage the request lifetime scope. ``Microsoft.Extensions.DependencyInjection`` does the heavy lifting now, so there's no additional middleware to register.
* **No manual controller registration.** You used to be required to register all of your controllers with Autofac so DI would work. The ASP.NET Core framework now automatically passes all controllers through service resolution so you don't have to do that.
* **No extensions for invoking middleware via dependency injection.** The :doc:`OWIN integration <owin>` had extensions like ``UseAutofacMiddleware()`` to allow DI into middleware. This happens automatically now through a combination of `auto-injected constructor parameters and dynamically resolved parameters to the Invoke method of middleware <https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/write>`_. The ASP.NET Core framework takes care of it all.
* **MVC and Web API are one thing.** There used to be different ways to hook into DI based on whether you were using MVC or Web API. These two things are combined in ASP.NET Core so there's only one dependency resolver to set up, only one configuration to maintain.
* **Controllers aren't resolved from the container; just controller constructor parameters.** That means controller lifecycles, property injection, and other things aren't managed by Autofac - they're managed by ASP.NET Core. You can change that using ``AddControllersAsServices()`` - see the discussion below.

Controllers as Services
=======================

By default, ASP.NET Core will resolve the controller *parameters* from the container but doesn't actually resolve *the controller* from the container. This usually isn't an issue but it does mean:

* The lifecycle of the *controller* is handled by the framework, not the request lifetime.
* The lifecycle of *controller constructor parameters* is handled by the request lifetime.
* Special wiring that you may have done during registration of the controller (like setting up property injection) won't work.

You can change this by specifying ``AddControllersAsServices()`` when you register MVC with the service collection. Doing that will automatically register controller types into the ``IServiceCollection`` when the service provider factory calls ``builder.Populate(services)``.

.. sourcecode:: csharp

    public class Startup
    {
      // Omitting extra stuff so you can see the important part...
      public void ConfigureServices(IServiceCollection services)
      {
        // Add controllers as services so they'll be resolved.
        services.AddMvc().AddControllersAsServices();
      }

      public void ConfigureContainer(ContainerBuilder builder)
      {
        // If you want to set up a controller for, say, property injection
        // you can override the controller registration after populating services.
        builder.RegisterType<MyController>().PropertiesAutowired();
      }
    }

Multitenant Support
===================

Due to the way ASP.NET Core is eager about generating the request lifetime scope it causes multitenant support to not quite work out of the box. Sometimes the ``IHttpContextAccessor``, commonly used in tenant identification, also isn't set up in time. The `Autofac.AspNetCore.Multitenant <https://github.com/autofac/Autofac.AspNetCore.Multitenant>`_ package was added to fix that.

To enable multitenant support:

* Add a reference to the ``Autofac.AspNetCore.Multitenant`` NuGet package.
* In your ``Program.Main`` when building the web host include a call to the ``UseServiceProviderFactory`` extension and use the ``AutofacMultitenantServiceProviderFactory``. Provide a callback that will configure your tenants.
* In ``Startup.ConfigureServices`` and ``Startup.ConfigureContainer`` register things that go in the **root container** that aren't tenant-specific.
* In the callback (e.g., ``Startup.ConfigureMultitenantContainer``) is where you build your multitenant container.

Here's an example of what you do in ``Program.Main``:

.. sourcecode:: csharp

    public class Program
    {
      public static async Task Main(string[] args)
      {
        var host = Host
          .CreateDefaultBuilder(args)
          .UseServiceProviderFactory(new AutofacMultitenantServiceProviderFactory(Startup.ConfigureMultitenantContainer))
          .ConfigureWebHostDefaults(webHostBuilder => webHostBuilder.UseStartup<Startup>())
          .Build();

        await host.RunAsync();
      }
    }

...and here's what ``Startup`` looks like:

.. sourcecode:: csharp

    public class Startup
    {
      // Omitting extra stuff so you can see the important part...
      public void ConfigureServices(IServiceCollection services)
      {
        // This will all go in the ROOT CONTAINER and is NOT TENANT SPECIFIC.
        services.AddMvc();

        // This adds the required middleware to the ROOT CONTAINER and is required for multitenancy to work.
        services.AddAutofacMultitenantRequestServices();
      }

      public void ConfigureContainer(ContainerBuilder builder)
      {
        // This will all go in the ROOT CONTAINER and is NOT TENANT SPECIFIC.
        builder.RegisterType<Dependency>().As<IDependency>();
      }

      public static MultitenantContainer ConfigureMultitenantContainer(IContainer container)
      {
        // This is the MULTITENANT PART. Set up your tenant-specific stuff here.
        var strategy = new MyTenantIdentificationStrategy();
        var mtc = new MultitenantContainer(strategy, container);
        mtc.ConfigureTenant("a", cb => cb.RegisterType<TenantDependency>().As<IDependency>());
        return mtc;
      }
    }

Using a Child Scope as a Root
=============================

In a complex application you may want to keep services partitioned such that the root container is shared across different parts of the app, but a child lifetime scope is used for the hosted portion (e.g., the ASP.NET Core piece).

In standard ASP.NET Core integration and generic hosted application support there's an ``AutofacChildLifetimeScopeServiceProviderFactory`` you can use instead of the standard ``AutofacServiceProviderFactory``. This allows you to provide configuration actions that will be attached to a specific named lifetime scope rather than a built container.

.. sourcecode:: csharp

    public class Program
    {
      public static async Task Main(string[] args)
      {
        // create the root-container and register global dependencies
        var containerBuilder = new ContainerBuilder();

        containerBuilder.RegisterType<SomeGlobalDependency>()
          .As<ISomeGlobalDependency>()
          .InstancePerLifetimeScope();

        var container = containerBuilder.Build();

        // The UseServiceProviderFactory call attaches the
        // Autofac provider to the generic hosting mechanism.
        var hostOne = Host
            .CreateDefaultBuilder(args)
            .UseServiceProviderFactory(new AutofacChildLifetimeScopeServiceProviderFactory(container.BeginLifetimeScope("root-one")))
            .ConfigureWebHostDefaults(webHostBuilder => {
              webHostBuilder
                .UseContentRoot(AppContext.BaseDirectory)
                // Each host listens to a different URL, they have the same root container to share SingleInstance
                // things, but they each have their own logical root lifetime scope. Registering things
                // as InstancePerMatchingLifetimeScope("root-one") (the name of the scope given above)
                // will result in a singleton that's ONLY used by this first host.
                .UseUrls("http://localhost:5000")
                .UseStartup<StartupOne>();
            })
            .Build();

        // The UseServiceProviderFactory call attaches the
        // Autofac provider to the generic hosting mechanism.
        var hostTwo = Host
            .CreateDefaultBuilder(args)
            .UseServiceProviderFactory(new AutofacChildLifetimeScopeServiceProviderFactory(container.BeginLifetimeScope("root-two")))
            .ConfigureWebHostDefaults(webHostBuilder => {
              webHostBuilder
                .UseContentRoot(AppContext.BaseDirectory)
                // As with the first host, the second host will share the root container but have its own
                // root lifetime scope "root-two". Things registered InstancePerMatchingLifetimeScope("root-two")
                // will be singletons ONLY used by this second host.
                .UseUrls("http://localhost:5001")
                .UseStartup<StartupTwo>();
            })
            .Build();

        await Task.WhenAll(hostOne.RunAsync(), hostTwo.RunAsync());
      }
    }

This will change how your ``Startup`` class works - you won't use a ``ContainerBuilder`` directly in ``ConfigureContainer``, now it's an ``AutofacChildLifetimeScopeConfigurationAdapter``:

.. sourcecode:: csharp

    public class StartupOne
    {
      public StartupOne(IWebHostEnvironment env)
      {
        // Fill this in if needed...
      }

      public void ConfigureServices(IServiceCollection services)
      {
        // The usual ConfigureServices registrations on the service collection...
      }

      // Here's the change for child lifetime scope usage! Register your "root"
      // child lifetime scope things with the adapter.
      public void ConfigureContainer(AutofacChildLifetimeScopeConfigurationAdapter config)
      {
          config.Add(builder => builder.RegisterModule(new AutofacHostOneModule()));
      }

      public void Configure(
        IApplicationBuilder app,
        ILoggerFactory loggerFactory)
      {
          // The usual app configuration stuff...
      }
    }

    public class StartupTwo
    {
      public StartupTwo(IWebHostEnvironment env)
      {
        // Fill this in if needed...
      }

      public void ConfigureServices(IServiceCollection services)
      {
        // The usual ConfigureServices registrations on the service collection...
      }

      // Here's the change for child lifetime scope usage! Register your "root"
      // child lifetime scope things with the adapter.
      public void ConfigureContainer(AutofacChildLifetimeScopeConfigurationAdapter config)
      {
          config.Add(builder => builder.RegisterModule(new AutofacHostTwoModule()));
      }

      public void Configure(
        IApplicationBuilder app,
        ILoggerFactory loggerFactory)
      {
          // The usual app configuration stuff...
      }
    }


If you're not using the service provider factory, the ``Populate()`` method offers an overload to allow you to specify a tagged child lifetime scope that should serve as the "container" for items.

:doc:`The .NET Core integration documentation also shows an example of using a child lifetime scope as a root. <netcore>`

Using a child lifetime scope as the root is not compatible with multitenant support. You must choose one or the other, not both.

Example
=======

There is an example project showing ASP.NET Core integration `in the Autofac examples repository <https://github.com/autofac/Examples/tree/main/src/AspNetCoreExample>`_.
