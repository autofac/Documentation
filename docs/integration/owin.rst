====
OWIN
====

`OWIN (Open Web Interface for .NET) <http://owin.org/>`_ is a simpler model for composing web-based applications without tying the application to the web server. To do this, a concept of "middleware" is used to create a pipeline through which requests travel.

Due to the differences in the way OWIN handles the application pipeline (detecting when a request starts/ends, etc.) integrating Autofac into an OWIN application is slightly different than the way it gets integrated into more "standard" ASP.NET apps. `You can read about OWIN and how it works on this overview. <http://www.asp.net/aspnet/overview/owin-and-katana/an-overview-of-project-katana>`_

**The important thing to remember is that order of OWIN middleware registration matters.** Middleware gets processed in order of registration, like a chain, so you need to register foundational things (like Autofac middleware) first.

Quick Start
===========

To take advantage of Autofac in your OWIN pipeline:

* Reference the ``Autofac.Owin`` package from NuGet.
* Build your Autofac container.
* Register the Autofac middleware with OWIN and pass it the container.

.. sourcecode:: csharp

    public class Startup
    {
      public void Configuration(IAppBuilder app)
      {
        var builder = new ContainerBuilder();
        // Register dependencies, then...
        var container = builder.Build();

        // Register the Autofac middleware FIRST. This also adds
        // Autofac-injected middleware registered with the container.
        app.UseAutofacMiddleware(container);

        // ...then register your other middleware not registered
        // with Autofac.
      }
    }

Check out the individual :doc:`ASP.NET integration library <aspnet>` pages for specific details on different app types and how they handle OWIN support.

Dependency Injection in Middleware
==================================

Normally when you register OWIN middleware with your application, you use the extension methods that come with the middleware. For example :doc:`Web API <webapi>` has the ``app.UseWebApi(config);`` extension. Middleware registered in this fashion is statically defined and will not have dependencies injected.

For custom middleware, you can allow Autofac to inject dependencies into the middleware by registering it with your application container rather than registering it with a static extension.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<MyCustomMiddleware>();
    //...
    var container = builder.Build();
    
    // This will add the Autofac middleware as well as the middleware
    // registered in the container.
    app.UseAutofacMiddleware(container);

When you call ``app.UseAutofacMiddleware(container);`` the Autofac middleware itself will be added to the pipeline, after which any ``Microsoft.Owin.OwinMiddleware`` classes registered with the container will also be added to the pipeline.

Middleware registered in this way will be resolved from the request lifetime scope for each request passing through the OWIN pipeline.
