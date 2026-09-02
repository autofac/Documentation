======
Blazor
======

`Blazor <https://learn.microsoft.com/en-us/aspnet/core/blazor/>`_ runs the same components in two very different places, and which one you're in decides how Autofac gets wired up. There is nothing Blazor-specific in Autofac itself - the difference is entirely in which host builder you have to work with.

Server-Side Blazor
==================

Blazor Server, and the server project of a Blazor Web App, run on ordinary ASP.NET Core hosting. :doc:`Set Autofac up exactly as you would for any other ASP.NET Core application <aspnetcore>` - attach ``AutofacServiceProviderFactory`` to the host builder and register through ``ConfigureContainer``. Nothing further is needed.

Blazor WebAssembly
==================

A WebAssembly app - a standalone Blazor WebAssembly project, or the ``.Client`` project of a Blazor Web App - is built by ``WebAssemblyHostBuilder``, which has no ``Host`` property to hang a service provider factory from. Instead it exposes ``ConfigureContainer``, which takes the factory directly:

.. sourcecode:: csharp

    var builder = WebAssemblyHostBuilder.CreateDefault(args);

    builder.ConfigureContainer(new AutofacServiceProviderFactory(ConfigureContainer));

    builder.RootComponents.Add<App>("#app");

    await builder.Build().RunAsync();

    static void ConfigureContainer(ContainerBuilder containerBuilder)
    {
        // Autofac registrations go here.
    }

The registration callback can go either place: pass it to the ``AutofacServiceProviderFactory`` constructor as above, or as the second argument to ``ConfigureContainer``. There is also a factory overload taking ``ContainerBuildOptions`` if you need it.

Components then consume services through the `standard @inject directive <https://learn.microsoft.com/en-us/aspnet/core/blazor/dependency-injection>`_ - the same as with the built-in container.

A Blazor Web App with WebAssembly interactivity has **two** projects and therefore two containers, one per process. Registrations made in the server project are not visible to components rendered on the client, so anything both sides resolve has to be registered in both.

Trimming
========

WebAssembly publishes with trimming enabled, which can remove types that are only ever reached by reflection - and reflection is how Autofac finds constructors and properties. :doc:`The Native AOT and trimming page <../advanced/native-aot-trimming>` covers which Autofac features are trim-safe and how to read the warnings.
