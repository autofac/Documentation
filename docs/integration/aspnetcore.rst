============
ASP.NET Core
============

ASP.NET Core (previously ASP.NET 5) changes the way dependency injection frameworks have previously integrated into ASP.NET execution. Previously, each functionality - MVC, Web API, etc. - had its own "dependency resolver" mechanism and just slightly different ways to hook in. ASP.NET Core introduces a `conforming container <http://blog.ploeh.dk/2014/05/19/conforming-container/>`_ mechanism via `Microsoft.Extensions.DependencyInjection <https://github.com/aspnet/DependencyInjection>`_, including a unified notion of request lifetime scope, service registration, and so forth.

**This page explains ASP.NET Core integration.** If you are using ASP.NET classic, :doc:`see the ASP.NET classic integration page <aspnet>`.

If you're using .NET Core without ASP.NET Core, :doc:`there's a simpler example here <netcore>` showing that integration.

.. contents::
  :local:

Quick Start (With ConfigureContainer)
=====================================

ASP.NET Core 1.1 introduced the ability to have strongly-typed container configuration. It provides a ``ConfigureContainer`` method where you register things with Autofac separately from registering things with the ``ServiceCollection``.

* Reference the ``Autofac.Extensions.DependencyInjection`` package from NuGet.
* In your ``Program.Main`` method, where you configure the ``WebHostBuilder``, call ``AddAutofac`` to hook Autofac into the startup pipeline.
* In the ``ConfigureServices`` method of your ``Startup`` class register things into the ``IServiceCollection`` using extension methods provided by other libraries.
* In the ``ConfigureContainer`` method of your ``Startup`` class register things directly into an Autofac ``ContainerBuilder``.

The ``IServiceProvider`` will automatically be created for you, so there's nothing you have to do but *register things*.

.. sourcecode:: csharp

    public class Program
    {
      public static void Main(string[] args)
      {
        // The ConfigureServices call here allows for
        // ConfigureContainer to be supported in Startup with
        // a strongly-typed ContainerBuilder.
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

    public class Startup
    {
      public Startup(IHostingEnvironment env)
      {
        var builder = new ConfigurationBuilder()
            .SetBasePath(env.ContentRootPath)
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
            .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true)
            .AddEnvironmentVariables();
        this.Configuration = builder.Build();
      }

      public IConfigurationRoot Configuration { get; private set; }

      // ConfigureServices is where you register dependencies. This gets
      // called by the runtime before the ConfigureContainer method, below.
      public void ConfigureServices(IServiceCollection services)
      {
        // Add services to the collection. Don't build or return
        // any IServiceProvider or the ConfigureContainer method
        // won't get called.
        services.AddMvc();
      }

      // ConfigureContainer is where you can register things directly
      // with Autofac. This runs after ConfigureServices so the things
      // here will override registrations made in ConfigureServices.
      // Don't build the container; that gets done for you. If you
      // need a reference to the container, you need to use the
      // "Without ConfigureContainer" mechanism shown later.
      public void ConfigureContainer(ContainerBuilder builder)
      {
          builder.RegisterModule(new AutofacModule());
      }

      // Configure is where you add middleware. This is called after
      // ConfigureContainer. You can use IApplicationBuilder.ApplicationServices
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

Quick Start (Without ConfigureContainer)
========================================

If you need more flexibility over how your container is built or if you need to actually store a reference to the built container you will need to skip using ``ConfigureContainer`` and register everything during ``ConfigureServices``. This is also the path you'd take for ASP.NET Core 1.0.

* Reference the ``Autofac.Extensions.DependencyInjection`` package from NuGet.
* In the ``ConfigureServices`` method of your ``Startup`` class...

  - Register services from the ``IServiceCollection`` into the ``ContainerBuilder`` via ``Populate``.
  - Register services into the ``ContainerBuilder`` directly.
  - Build your container.
  - Create an ``AutofacServiceProvider`` using the container and return it.

.. sourcecode:: csharp

    public class Startup
    {
      public Startup(IHostingEnvironment env)
      {
        var builder = new ConfigurationBuilder()
            .SetBasePath(env.ContentRootPath)
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
            .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true)
            .AddEnvironmentVariables();
        this.Configuration = builder.Build();
      }

      public IContainer ApplicationContainer { get; private set; }

      public IConfigurationRoot Configuration { get; private set; }

      // ConfigureServices is where you register dependencies. This gets
      // called by the runtime before the Configure method, below.
      public IServiceProvider ConfigureServices(IServiceCollection services)
      {
        // Add services to the collection.
        services.AddMvc();

        // Create the container builder.
        var builder = new ContainerBuilder();

        // Register dependencies, populate the services from
        // the collection, and build the container.
        //
        // Note that Populate is basically a foreach to add things
        // into Autofac that are in the collection. If you register
        // things in Autofac BEFORE Populate then the stuff in the
        // ServiceCollection can override those things; if you register
        // AFTER Populate those registrations can override things
        // in the ServiceCollection. Mix and match as needed.
        builder.Populate(services);
        builder.RegisterType<MyType>().As<IMyType>();
        this.ApplicationContainer = builder.Build();

        // Create the IServiceProvider based on the container.
        return new AutofacServiceProvider(this.ApplicationContainer);
      }

      // Configure is where you add middleware. This is called after
      // ConfigureServices. You can use IApplicationBuilder.ApplicationServices
      // here if you need to resolve things from the container.
      public void Configure(
        IApplicationBuilder app,
        ILoggerFactory loggerFactory,
        IApplicationLifetime appLifetime)
      {
          loggerFactory.AddConsole(this.Configuration.GetSection("Logging"));
          loggerFactory.AddDebug();

          app.UseMvc();

          // As of Autofac.Extensions.DependencyInjection 4.3.0 the AutofacDependencyResolver
          // implements IDisposable and will be disposed - along with the application container -
          // when the app stops and the WebHost disposes it.
          //
          // Prior to 4.3.0, if you want to dispose of resources that have been resolved in the
          // application container, register for the "ApplicationStopped" event.
          // You can only do this if you have a direct reference to the container,
          // so it won't work with the above ConfigureContainer mechanism.
          // appLifetime.ApplicationStopped.Register(() => this.ApplicationContainer.Dispose());
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

The `StartupLoader class in ASP.NET Core <https://github.com/aspnet/Hosting/blob/rel/1.1.0/src/Microsoft.AspNetCore.Hosting/Internal/StartupLoader.cs>`_ is what locates the methods to call during app startup. Check that class out if you want a more in-depth understanding of how this works.

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

You can change this by specifying ``AddControllersAsServices()`` when you register MVC with the service collection. Doing that will automatically register controller types into the ``IServiceCollection`` when you call ``builder.Populate(services)``.

.. sourcecode:: csharp

    public class Startup
    {
      // Omitting extra stuff so you can see the important part...
      public IServiceProvider ConfigureServices(IServiceCollection services)
      {
        // Add controllers as services so they'll be resolved.
        services.AddMvc().AddControllersAsServices();

        var builder = new ContainerBuilder();

        // When you do service population, it will include your controller
        // types automatically.
        builder.Populate(services);

        // If you want to set up a controller for, say, property injection
        // you can override the controller registration after populating services.
        builder.RegisterType<MyController>().PropertiesAutowired();

        this.ApplicationContainer = builder.Build();
        return new AutofacServiceProvider(this.ApplicationContainer);
      }
    }

There is a more detailed article `with a walkthrough on Filip Woj's blog <http://www.strathweb.com/2016/03/the-subtle-perils-of-controller-dependency-injection-in-asp-net-core-mvc/>`_. Note one of the commenters there `found some changes based on how RC2 handles controllers as services <http://www.strathweb.com/2016/03/the-subtle-perils-of-controller-dependency-injection-in-asp-net-core-mvc/#comment-2702995712>`_.

Multitenant Support
===================

Due to the way ASP.NET Core is eager about generating the request lifetime scope it causes multitenant support to not quite work out of the box. Sometimes the ``IHttpContextAccessor``, commonly used in tenant identification, also isn't set up in time. The `Autofac.AspNetCore.Multitenant <https://github.com/autofac/Autofac.AspNetCore.Multitenant>`_ package was added to fix that.

To enable multitenant support:

* Add a reference to the ``Autofac.AspNetCore.Multitenant`` NuGet package.
* In your ``Program.Main`` when building the web host...

  * Include a call to the ``UseAutofacMultitenantRequestServices`` extension and let Autofac know how to locate your multitenant container.
  * **Do not use** the ``ConfigureContainer`` support listed above. You can't do that because it won't give you a chance to create your multitenant container.

* Change your ``Startup.ConfigureServices`` method to return ``IServiceProvider``, create your multitenant container, and return an ``AutofacServiceProvider`` using that container.

Here's an example of what you do in ``Program.Main``:

.. sourcecode:: csharp

    public class Program
    {
      public static void Main(string[] args)
      {
        var host = new WebHostBuilder()
          .UseKestrel()
          .UseContentRoot(Directory.GetCurrentDirectory())

          // This enables the request lifetime scope to be properly spawned from
          // the container rather than be a child of the default tenant scope.
          // The ApplicationContainer static property is where the multitenant container
          // will be stored once it's built.
          .UseAutofacMultitenantRequestServices(() => Startup.ApplicationContainer)
          .UseIISIntegration()
          .UseStartup<Startup>()
          .Build();

        host.Run();
      }
    }

...and here's what ``Startup`` looks like:

.. sourcecode:: csharp

    public class Startup
    {
      // Omitting extra stuff so you can see the important part...
      public IServiceProvider ConfigureServices(IServiceCollection services)
      {
        services.AddMvc();
        var builder = new ContainerBuilder();
        builder.Populate(services);

        var container = builder.Build();
        var strategy = new MyTenantIdentificationStrategy();
        var mtc = new MultitenantContainer(strategy, container);
        Startup.ApplicationContainer = mtc;
        return new AutofacServiceProvider(mtc);
      }

      // This is what the middleware will use to create your request lifetime scope.
      public static MultitenantContainer ApplicationContainer { get; set; }
    }


Using a Child Scope as a Root
=============================

In a complex application you may want to keep services registered using ``Populate()`` in a child lifetime scope. For example, an application that does some self-hosting of ASP.NET Core components may want to keep the MVC registrations and such isolated from the main container. The ``Populate()`` method offers an overload to allow you to specify a tagged child lifetime scope that should serve as the "container" for items.

.. note::

   If you use this, you will not be able to use the ASP.NET Core support for ``IServiceProviderFactory{TContainerBuilder}`` (the ``ConfigureContainer`` support). This is because ``IServiceProviderFactory{TContainerBuilder}`` assumes it's working at the root level.

:doc:`The .NET Core integration documentation shows an example of using a child lifetime scope as a root. <netcore>`

Example
=======

There is an example project showing ASP.NET Core integration `in the Autofac examples repository <https://github.com/autofac/Examples/tree/master/src/AspNetCoreExample>`_.
