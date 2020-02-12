============
ASP.NET Core
============

ASP.NET Core (previously ASP.NET 5) changes the way dependency injection frameworks have previously integrated into ASP.NET execution. Previously, each functionality - MVC, Web API, etc. - had its own "dependency resolver" mechanism and just slightly different ways to hook in. ASP.NET Core introduces a `conforming container <http://blog.ploeh.dk/2014/05/19/conforming-container/>`_ mechanism via `Microsoft.Extensions.DependencyInjection <https://github.com/aspnet/DependencyInjection>`_, including a unified notion of request lifetime scope, service registration, and so forth.

Further, as of ASP.NET Core 3.0, there's a "generic app hosting" mechanism in play that can be used in non-ASP.NET Core apps.

**This page explains ASP.NET Core and generic .NET Core hosting integration.** If you are using ASP.NET classic, :doc:`see the ASP.NET classic integration page <aspnet>`.

If you're using .NET Core without ASP.NET Core (and/or without the generic hosting), :doc:`there's a simpler example here <netcore>` showing that integration.

.. contents::
  :local:

Quick Start
===========

* Reference the ``Autofac.Extensions.DependencyInjection`` package from NuGet.
* In your ``Program.Main`` method, attach the hosting mechanism to Autofac. (See the examples below.)
* In the ``ConfigureServices`` method of your ``Startup`` class register things into the ``IServiceCollection`` using extension methods provided by other libraries.
* In the ``ConfigureContainer`` method of your ``Startup`` class register things directly into an Autofac ``ContainerBuilder``.

The ``IServiceProvider`` will automatically be created for you, so there's nothing you have to do but *register things*.

ASP.NET Core 1.1 - 2.2
----------------------

This example shows **ASP.NET Core 1.1 - 2.2** usage, where you call ``services.AddAutofac()`` on the ``WebHostBuilder``. **This is not for ASP.NET Core 3+** or the .NET Core 3+ generic hosting support - ASP.NET Core 3 requires you to specify a service provider factory directly rather than adding it to the service collection.

.. sourcecode:: csharp

    public class Program
    {
      public static void Main(string[] args)
      {
        // ASP.NET Core 1.1 - 2.2:
        // The ConfigureServices call here allows for
        // ConfigureContainer to be supported in Startup with
        // a strongly-typed ContainerBuilder.
        // AddAutofac() is a convenience method for
        // services.AddSingleton<IServiceProviderFactory<ContainerBuilder>>(new AutofacServiceProviderFactory())
        var host = new WebHostBuilder()
            .UseKestrel()
            .ConfigureServices(services => services.AddAutofac())
            .UseContentRoot(Directory.GetCurrentDirectory())
            .UseIISIntegration()
            .UseStartup<Startup>()
            .Build();

        host.Run();
      }
    }

This example shows **ASP.NET Core 1.1 - 2.2** usage, where you return an ``IServiceProvider`` from the ``ConfigureServices(IServiceCollection services)`` delegate. **This is not for ASP.NET Core 3+** or the .NET Core 3+ generic hosting support - ASP.NET Core 3 has deprecated the ability to return a service provider from ``ConfigureServices``.

.. sourcecode:: csharp

    public class Startup
    {
      public Startup(IHostingEnvironment env)
      {
        // In ASP.NET Core 3.0 env will be an IWebHostEnvironment , not IHostingEnvironment.
        var builder = new ConfigurationBuilder()
            .SetBasePath(env.ContentRootPath)
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
            .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true)
            .AddEnvironmentVariables();
        this.Configuration = builder.Build();
      }

      public IConfigurationRoot Configuration { get; private set; }

      public ILifetimeScope AutofacContainer { get; private set; }

      // ConfigureServices is where you register dependencies and return an `IServiceProvider` implemented by `AutofacServiceProvider`.
      // This is the old, not recommended way, and is NOT SUPPORTED in ASP.NET Core 3.0+.
      public IServiceProvider ConfigureServices(IServiceCollection services)
      {
        // Add services to the collection
        services.AddOptions();

        // Create a container-builder and register dependencies
        var builder = new ContainerBuilder();

        // Populate the service-descriptors added to `IServiceCollection`
        // BEFORE you add things to Autofac so that the Autofac
        // registrations can override stuff in the `IServiceCollection`
        // as needed
        builder.Populate(services);

        // Register your own things directly with Autofac
        builder.RegisterModule(new MyApplicationModule());

        AutofacContainer = builder.Build();

        // this will be used as the service-provider for the application!
        return new AutofacServiceProvider(AutofacContainer);
      }

      // Configure is where you add middleware.
      // You can use IApplicationBuilder.ApplicationServices
      // here if you need to resolve things from the container.
      public void Configure(
        IApplicationBuilder app,
        ILoggerFactory loggerFactory)
      {
        loggerFactory.AddConsole(this.Configuration.GetSection("Logging"));
        loggerFactory.AddDebug();
        app.UseMvc();
      }
    }

ASP.NET Core 3.0+ and Generic Hosting
-------------------------------------

**Hosting changed in ASP.NET Core 3.0** and requires a different integration. You can no longer return ``IServiceProvider`` from ``ConfigureServices``, nor can you add your service provider factory to the service collection.

This is for ASP.NET Core 3+ and the .NET Core 3+ generic hosting support:

.. sourcecode:: csharp

    public class Program
    {
      public static void Main(string[] args)
      {
        // ASP.NET Core 3.0+:
        // The UseServiceProviderFactory call attaches the
        // Autofac provider to the generic hosting mechanism.
        var host = Host.CreateDefaultBuilder(args)
            .UseServiceProviderFactory(new AutofacServiceProviderFactory())
            .ConfigureWebHostDefaults(webHostBuilder => {
              webHostBuilder
                .UseContentRoot(Directory.GetCurrentDirectory())
                .UseIISIntegration()
                .UseStartup<Startup>();
            })
            .Build();

        host.Run();
      }
    }

Startup Class
-------------

In your Startup class (which is basically the same across all the versions of ASP.NET Core) you then use ``ConfigureContainer`` to access the Autofac container builder and register things directly with Autofac.

.. sourcecode:: csharp

    public class Startup
    {
      public Startup(IHostingEnvironment env)
      {
        // In ASP.NET Core 3.0 `env` will be an IWebHostingEnvironment, not IHostingEnvironment.
        var builder = new ConfigurationBuilder()
            .SetBasePath(env.ContentRootPath)
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
            .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true)
            .AddEnvironmentVariables();
        this.Configuration = builder.Build();
      }

      public IConfigurationRoot Configuration { get; private set; }

      public ILifetimeScope AutofacContainer { get; private set; }

      // ConfigureServices is where you register dependencies. This gets
      // called by the runtime before the ConfigureContainer method, below.
      public void ConfigureServices(IServiceCollection services)
      {
        // Add services to the collection. Don't build or return
        // any IServiceProvider or the ConfigureContainer method
        // won't get called.
        services.AddOptions();
      }

      // ConfigureContainer is where you can register things directly
      // with Autofac. This runs after ConfigureServices so the things
      // here will override registrations made in ConfigureServices.
      // Don't build the container; that gets done for you by the factory.
      public void ConfigureContainer(ContainerBuilder builder)
      {
        // Register your own things directly with Autofac, like:
        builder.RegisterModule(new MyApplicationModule());
      }

      // Configure is where you add middleware. This is called after
      // ConfigureContainer. You can use IApplicationBuilder.ApplicationServices
      // here if you need to resolve things from the container.
      public void Configure(
        IApplicationBuilder app,
        ILoggerFactory loggerFactory)
      {
        // If, for some reason, you need a reference to the built container, you
        // can use the convenience extension method GetAutofacRoot.
        this.AutofacContainer = app.ApplicationServices.GetAutofacRoot();

        loggerFactory.AddConsole(this.Configuration.GetSection("Logging"));
        loggerFactory.AddDebug();
        app.UseMvc();
      }
    }

Configuration Method Naming Conventions
=======================================

The ``Configure``, ``ConfigureServices``, and ``ConfigureContainer`` methods all support environment-specific naming conventions based on the ``IHostingEnvironment.EnvironmentName`` in your app. By default, the names are ``Configure``, ``ConfigureServices``, and ``ConfigureContainer``. If you want environment-specific setup you can put the environment name after the ``Configure`` part, like ``ConfigureDevelopment``, ``ConfigureDevelopmentServices``, and ``ConfigureDevelopmentContainer``. If a method isn't present with a name matching the environment it'll fall back to the default.

This means you don't necessarily have to use :doc:`Autofac configuration <../configuration/index>` to switch configuration between a development and production environment; you can set it up programmatically in ``Startup``.

.. sourcecode:: csharp

    public class Startup
    {
      public Startup(IHostingEnvironment env)
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
      public void Configure(IApplicationBuilder app, ILoggerFactory loggerFactory)
      {
        // Set up the application.
      }

      // This only gets called if your environment is Staging. The
      // default Configure won't be automatically called if this one is called.
      public void ConfigureStaging(IApplicationBuilder app, ILoggerFactory loggerFactory)
      {
        // Set up the application for staging.
      }
    }

This is a feature of the application hosting in ASP.NET Core - it is not an Autofac behavior. The `StartupLoader class in ASP.NET Core <https://github.com/aspnet/Hosting/blob/rel/1.1.0/src/Microsoft.AspNetCore.Hosting/Internal/StartupLoader.cs>`_ is what locates the methods to call during app startup. Check that class out if you want a more in-depth understanding of how this works.

Dependency Injection Hooks
==========================

Unlike :doc:`ASP.NET classic integration <aspnet>`, ASP.NET Core is designed specifically with dependency injection in mind. What that means is if you're trying to figure out, say, `how to inject services into MVC views <https://docs.asp.net/en/latest/mvc/views/dependency-injection.html>`_ that's now controlled by (and documented by) ASP.NET Core - there's not anything Autofac-specific you need to do other than set up your service provider as outlined above.

Here are some helpful links into the ASP.NET Core documentation with specific insight into DI integration:

* `ASP.NET Core dependency injection fundamentals <https://docs.asp.net/en/latest/fundamentals/dependency-injection.html>`_
* `Controller injection <https://docs.asp.net/en/latest/mvc/controllers/dependency-injection.html>`_
* `The Subtle Perils of Controller Dependency Injection in ASP.NET Core MVC <http://www.strathweb.com/2016/03/the-subtle-perils-of-controller-dependency-injection-in-asp-net-core-mvc/>`_
* `Filter injection <https://docs.asp.net/en/latest/mvc/controllers/filters.html#configuring-filters>`_
* `View injection <https://docs.asp.net/en/latest/mvc/views/dependency-injection.html>`_
* `Authorization requirement handlers injection <https://docs.asp.net/en/latest/security/authorization/dependencyinjection.html>`_
* `Middleware options injection <https://docs.asp.net/en/latest/migration/http-modules.html#loading-middleware-options-through-direct-injection>`_
* `Middleware 'Invoke' method injection <https://docs.asp.net/en/latest/fundamentals/middleware.html>`_
* `Wiring up EF 6 with ASP.NET Core <https://docs.asp.net/en/latest/data/entity-framework-6.html#setup-connection-strings-and-dependency-injection>`_

Differences From ASP.NET Classic
================================

If you've used Autofac's other :doc:`ASP.NET integration <aspnet>` then you may be interested in the key differences as you migrate to using ASP.NET Core.

* **Use InstancePerLifetimeScope instead of InstancePerRequest.** In previous ASP.NET integration you could register a dependency as ``InstancePerRequest`` which would ensure only one instance of the dependency would be created per HTTP request. This worked because Autofac was in charge of :doc:`setting up the per-request lifetime scope <../faq/per-request-scope>`. With the introduction of ``Microsoft.Extensions.DependencyInjection``, the creation of per-request and other child lifetime scopes is now part of the `conforming container <http://blog.ploeh.dk/2014/05/19/conforming-container/>`_ provided by the framework, so all child lifetime scopes are treated equally - there's no special "request level scope" anymore. Instead of registering your dependencies ``InstancePerRequest``, use ``InstancePerLifetimeScope`` and you should get the same behavior. Note if you are creating *your own lifetime scopes* during web requests, you will get a new instance in these child scopes.
* **No more DependencyResolver.** Other ASP.NET integration mechanisms required setting up a custom Autofac-based dependency resolver in various locations. With ``Microsoft.Extensions.DependencyInjection`` and the ``Startup.ConfigureServices`` method, you now just return the ``IServiceProvider`` and "magic happens." Within controllers, classes, etc. if you need to manually do service location, get an ``IServiceProvider``.
* **No special middleware.** The :doc:`OWIN integration <owin>` previously required registration of a special Autofac middleware to manage the request lifetime scope. ``Microsoft.Extensions.DependencyInjection`` does the heavy lifting now, so there's no additional middleware to register.
* **No manual controller registration.** You used to be required to register all of your controllers with Autofac so DI would work. The ASP.NET Core framework now automatically passes all controllers through service resolution so you don't have to do that.
* **No extensions for invoking middleware via dependency injection.** The :doc:`OWIN integration <owin>` had extensions like ``UseAutofacMiddleware()`` to allow DI into middleware. This happens automatically now through a combination of `auto-injected constructor parameters and dynamically resolved parameters to the Invoke method of middleware <https://docs.asp.net/en/latest/fundamentals/middleware.html>`_. The ASP.NET Core framework takes care of it all.
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

There is a more detailed article `with a walkthrough on Filip Woj's blog <http://www.strathweb.com/2016/03/the-subtle-perils-of-controller-dependency-injection-in-asp-net-core-mvc/>`_. Note one of the commenters there `found some changes based on how RC2 handles controllers as services <http://www.strathweb.com/2016/03/the-subtle-perils-of-controller-dependency-injection-in-asp-net-core-mvc/#comment-2702995712>`_.

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

        builder.RegisterType<SomeGlobalDependency>()
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
                // things, but they each have  their own logical root lifetime scope. Registering things
                // as `InstancePerMatchingLifetimeScope("root-one")` (the name of the scope given above)
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
                // root lifetime scope `root-two`. Things registered `InstancePerMatchingLifetimeScope("root-two")`
                // will be singletons ONLY used by this second host.
                .UseUrls("http://localhost:5001")
                .UseStartup<StartupTwo>();
            })
            .Build();

        await Task.WhenAll(hostOne.RunAsync(), hostTwo.RunAsync())
      }
    }

This will change how your ``Startup`` class works - you won't use a ``ContainerBuilder`` directly in ``ConfigureContainer``, now it's an ``AutofacChildLifetimeScopeConfigurationAdapter``:

.. sourcecode:: csharp

    public class StartupOne
    {
      // IHostingEnvironment when running applications below ASP.NET Core 3.0
      public Startup(IWebHostEnvironment env)
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
      // IHostingEnvironment when running applications below ASP.NET Core 3.0
      public Startup(IWebHostEnvironment env)
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

There is an example project showing ASP.NET Core integration `in the Autofac examples repository <https://github.com/autofac/Examples/tree/master/src/AspNetCoreExample>`_.
