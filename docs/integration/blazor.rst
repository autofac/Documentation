============
Blazor
============



`ASP.NET Core Blazor <https://docs.microsoft.com/en-gb/aspnet/core/blazor/>`_ uses the generic app hosting in ASP.NET Core 3+ but the two `hosting models <https://docs.microsoft.com/en-gb/aspnet/core/blazor/hosting-models>`_ have slightly different integrations.

**Server-side** implementations are configured in exactly the same way as any other `ASP.NET Core 3 <aspnetcore>`_ application.

**Client-side** injection is slightly more restricted due to requirements for `WebAssembly <https://webassembly.org>`_ hosting.

At present (as of 11/9/2019), some of the features around ``Startup`` classes are not available: ``ConfiguresServices`` and ``ConfigureContainer`` will not be executed by ``UseBlazorStartup``.

The alternative is to use ``UseServiceProviderFactory`` with an instance of ``AutofacServiceProviderFactory``. The ``AutofacServiceProviderFactory`` takes an ``Action`` on a ``ContainerBuilder`` which can be used for any registrations.

Example:

.. sourcecode:: csharp

  public class Program
  {
    public static void Main(string[] args)
    {
      CreateHostBuilder(args).Build().Run();
    }

    public static IWebAssemblyHostBuilder CreateHostBuilder(string[] args) =>
      BlazorWebAssemblyHost.CreateDefaultBuilder()
        .UseServiceProviderFactory(new AutofacServiceProviderFactory(Register))
        .UseBlazorStartup<Startup>();

    private static void Register(ContainerBuilder builder)
    {
      // add any registrations here
    }
  }

Once registered, Blazor components can use `dependency injection <https://docs.microsoft.com/en-gb/aspnet/core/blazor/dependency-injection>`_ via the `standard @inject Razor directive <https://docs.microsoft.com/en-us/aspnet/core/blazor/dependency-injection?view=aspnetcore-3.0#request-a-service-in-a-component>`_.