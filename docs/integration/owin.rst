====
OWIN
====

`OWIN (Open Web Interface for .NET) <http://owin.org/>`_ is a simpler model for composing web-based applications without tying the application to the web server.

Due to the differences in the way OWIN handles the application pipeline (detecting when a request starts/ends, etc.) integrating Autofac into an OWIN application is slightly different than the way it gets integrated into more "standard" ASP.NET apps. `You can read about OWIN and how it works on this overview. <http://www.asp.net/aspnet/overview/owin-and-katana/an-overview-of-project-katana>`_

**The important thing to remember is that order of OWIN middleware registration matters.** Middleware gets processed in order of registration, like a chain, so you need to register foundational things (like Autofac middleware) first.

To take advantage of Autofac in your OWIN pipeline:

* Reference the ``Autofac.Owin`` package from NuGet.
* Register all the Middleware with the container
* Build your Autofac container.
* Register the Autofac middleware with OWIN and pass it the container.

Note here that the UseAutofacMiddleware does not only add the AutofacMiddleware, it also loops over the registered Middleware with the container, instantiates them, and then add them to the IAppBuilder. Any Middleware added to the IAppBuilder directly using ``app.Use<OtherMiddleware>()`` will not be managed by Autofac.

.. sourcecode:: csharp

    public class Startup
    {
      public void Configuration(IAppBuilder app)
      {
        var builder = new ContainerBuilder();
        // Register all the Middleware Autofac should manage
        builder.RegisterType<SomeMiddleware>();
        var container = builder.Build();

        // Register the Autofac middleware FIRST. This will also loop over all the registered Middleware with the container above, instantiate them, and then add them to the IAppBuilder on your behalf
        app.UseAutofacMiddleware(container);

        // ...then register other Middleware that should NOT be managed by Autofac
      }
    }

Check out the individual :doc:`ASP.NET integration library <aspnet>` pages for specific details on different app types and how they handle OWIN support.
