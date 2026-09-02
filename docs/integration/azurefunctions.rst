===============
Azure Functions
===============

Azure Functions apps run on the .NET generic host, so there is nothing Functions-specific about wiring in Autofac. Attach the service provider factory to the host builder exactly as you would in any other generic host application.

.. sourcecode:: csharp

    var host = new HostBuilder()
        .ConfigureFunctionsWorkerDefaults()
        .UseServiceProviderFactory(new AutofacServiceProviderFactory())
        .ConfigureContainer<ContainerBuilder>(builder =>
        {
            builder.RegisterModule(new MyApplicationModule());
        })
        .Build();

    await host.RunAsync();

Reference the ``Autofac.Extensions.DependencyInjection`` package alongside the Functions worker packages. ``ConfigureContainer`` runs after the service collection has been populated, so registrations there override anything the worker or other libraries added.

Function classes are resolved from the container, so they take their dependencies through the constructor like anything else:

.. sourcecode:: csharp

    public class Function1
    {
      private readonly IRandomNumberService _randomNumberService;

      public Function1(IRandomNumberService randomNumberService)
      {
        this._randomNumberService = randomNumberService;
      }

      [Function(nameof(Function1))]
      public IActionResult Run([HttpTrigger(AuthorizationLevel.Function, "get")] HttpRequest request)
      {
        return new OkObjectResult($"Your random number is {this._randomNumberService.GetDouble()}.");
      }
    }

Logging needs nothing special. ``ILogger<T>`` is registered by the worker into the service collection and comes across into Autofac with everything else, so inject it where you need it.

.. note::

   This page previously documented the **in-process** model, which required a custom ``IJobActivator``, a wrapper to dispose the lifetime scope, and a module to work around ``ILoggerFactory`` being registered after startup. That model has been retired by Microsoft, and none of that scaffolding is needed on the isolated worker. If you are still on it, `Microsoft's migration guidance <https://learn.microsoft.com/en-us/azure/azure-functions/migrate-dotnet-to-isolated-model>`_ is the place to start.

   The community `Autofac.Extensions.DependencyInjection.AzureFunctions <https://github.com/junalmeida/autofac-azurefunctions>`_ package targets the in-process model only, so it does not apply here.
