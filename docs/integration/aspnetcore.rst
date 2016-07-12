============
ASP.NET Core
============

ASP.NET Core (previously ASP.NET 5) changes the way dependency injection frameworks have previously integrated into ASP.NET execution. Previously, each functionality - MVC, Web API, etc. - had its own "dependency resolver" mechanism and just slightly different ways to hook in. ASP.NET Core introduces a `conforming container <http://blog.ploeh.dk/2014/05/19/conforming-container/>`_ mechanism via `Microsoft.Extensions.DependencyInjection <https://github.com/aspnet/DependencyInjection>`_, including a unified notion of request lifetime scope, service registration, and so forth.

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

Differences From ASP.NET Classic
================================

If you've used Autofac's other :doc:`ASP.NET integration <aspnet>` then you may be interested in the key differences as you migrate to using ASP.NET Core.

* **Use InstancePerLifetimeScope instead of InstancePerRequest.** In previous ASP.NET integration you could register a dependency as ``InstancePerRequest`` which would ensure only one instance of the dependency would be created per HTTP request. This worked because Autofac was in charge of :doc:`setting up the per-request lifetime scope <../faq/per-request-scope>`. With the introduction of ``Microsoft.Extensions.DependencyInjection``, the creation of per-request and other child lifetime scopes is now part of the `conforming container <http://blog.ploeh.dk/2014/05/19/conforming-container/>`_ provided by the framework, so all child lifetime scopes are treated equally - there's no special "request level scope" anymore. Instead of registering your dependencies ``InstancePerRequest``, use ``InstancePerLifetimeScope`` and you should get the same behavior. Note if you are creating *your own lifetime scopes* during web requests, you will get a new instance in these child scopes.
* **No more DependencyResolver.** Other ASP.NET integration mechanisms required setting up a custom Autofac-based dependency resolver in various locations. With ``Microsoft.Extensions.DependencyInjection`` and the ``Startup.ConfigureServices`` method, you now just return the ``IServiceProvider`` and "magic happens." Within controllers, classes, etc. if you need to manually do service location, get an ``IServiceProvider``.
* **No special middleware.** The :doc:`OWIN integration <owin>` previously required registration of a special Autofac middleware to manage the request lifetime scope. ``Microsoft.Extensions.DependencyInjection`` does the heavy lifting now, so there's no additional middleware to register.
* **No manual controller registration.** You used to be required to register all of your controllers with Autofac so DI would work. The ASP.NET Core framework now automatically passes all controllers through service resolution so you don't have to do that.
* **No extensions for invoking middleware via dependency injection.** The :doc:`OWIN integration <owin>` had extensions like ``UseAutofacMiddleware()`` to allow DI into middleware. This happens automatically now through a combination of `auto-injected constructor parameters and dynamically resolved parameters to the Invoke method of middleware <http://docs.asp.net/en/latest/fundamentals/middleware.html>`_. The ASP.NET Core framework takes care of it all.