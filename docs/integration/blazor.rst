============
Blazor
============



`ASP.NET Core Blazor <https://docs.microsoft.com/en-gb/aspnet/core/blazor/>`_ uses the generic app hosting in ASP.NET Core 3+ but the two `hosting models <https://docs.microsoft.com/en-gb/aspnet/core/blazor/hosting-models>`_ have slightly different integrations.

**Server-side** implementations are configured in exactly the same way as any other `ASP.NET Core 3 <aspnetcore>`_ application.

**Client-side** injection is slightly more restricted due to requirements for `WebAssembly <https://webassembly.org>`_ hosting.

This example for WebAssembly works as of March 30, 2021 with .NET 5.
Example:

.. sourcecode:: csharp

  public class Program
  {
    public static async Task Main(string[] args)
    {
        var builder = WebAssemblyHostBuilder.CreateDefault(args);
        builder.ConfigureContainer(new AutofacServiceProviderFactory(ConfigureContainer));

        builder.RootComponents.Add<App>("#app");

        await builder.Build().RunAsync();
    }


    private static void ConfigureContainer(ContainerBuilder builder)
    {
      // add any registrations here
    }
  }

Once registered, Blazor components can use `dependency injection <https://docs.microsoft.com/en-gb/aspnet/core/blazor/dependency-injection>`_ via the `standard @inject Razor directive <https://docs.microsoft.com/en-us/aspnet/core/blazor/dependency-injection?view=aspnetcore-3.0#request-a-service-in-a-component>`_.
