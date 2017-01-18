============
ASP.NET Core
============

ASP.NET Core (previously ASP.NET 5) changes the way dependency injection frameworks have previously integrated into ASP.NET execution. Previously, each functionality - MVC, Web API, etc. - had its own "dependency resolver" mechanism and just slightly different ways to hook in. ASP.NET Core introduces a `conforming container <http://blog.ploeh.dk/2014/05/19/conforming-container/>`_ mechanism via `Microsoft.Extensions.DependencyInjection <https://github.com/aspnet/DependencyInjection>`_, including a unified notion of request lifetime scope, service registration, and so forth.

**This page explains ASP.NET Core integration.** If you are using ASP.NET classic, :doc:`see the ASP.NET classic integration page <aspnet>`.

.. contents::
  :local:

Quick Start
===========

To take advantage of Autofac in your ASP.NET Core pipeline:

* Reference the ``Autofac.Extensions.DependencyInjection`` package from NuGet.
* In the ``ConfigureServices`` method of your ``Startup`` class...

  - Register services from the ``IServiceCollection``.
  - Build your container.
  - Create an ``AutofacServiceProvider`` using the container and return it.

* In the ``Configure`` method of your ``Startup`` class, you can optionally register with the ``IApplicationLifetime.ApplicationStopped`` event to dispose of the container at app shutdown.

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
        // the collection, and build the container. If you want
        // to dispose of the container at the end of the app,
        // be sure to keep a reference to it as a property or field.
        builder.RegisterType<MyType>().As<IMyType>();
        builder.Populate(services);
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

          // If you want to dispose of resources that have been resolved in the
          // application container, register for the "ApplicationStopped" event.
          appLifetime.ApplicationStopped.Register(() => this.ApplicationContainer.Dispose());
      }
    }

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
* **No extensions for invoking middleware via dependency injection.** The :doc:`OWIN integration <owin>` had extensions like ``UseAutofacMiddleware()`` to allow DI into middleware. This happens automatically now through a combination of `auto-injected constructor parameters and dynamically resolved parameters to the Invoke method of middleware <http://docs.asp.net/en/latest/fundamentals/middleware.html>`_. The ASP.NET Core framework takes care of it all.
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

Example
=======

There is an example project showing ASP.NET Core integration `in the Autofac examples repository <https://github.com/autofac/Examples/tree/master/src/AspNetCoreExample>`_.
