===============
Azure Functions
===============

Azure Functions supports dependency injection with the Microsoft dependency
injection framework out of the box, but you can make it work with Autofac with a
bit of bootstrapping code. 

We recommend reading the `official Microsoft documentation
<https://docs.microsoft.com/en-us/azure/azure-functions/functions-dotnet-dependency-injection>`_
for an overview of dependency injection in the context of Azure Functions.

.. contents::
  :local:

Overview of Steps
=================

#. Install Autofac, ``Autofac.Extensions.DependencyInjection``, and
   ``Microsoft.Azure.Functions.Extensions`` from NuGet.  
#. Add an Autofac-based job activator to create instances of your function
   classes.  
#. Create a ``Startup`` class where you register your components and replace the
   default job activator.

Autofac Job Activator
=====================

A job activator is responsible for instantiating the classes that hold your
functions. Add the following code to your project — it's a job activator that
resolves the appropriate class from an Autofac lifetime scope. We'll implement 
``LifetimeScopeWrapper`` and ``LoggerModule`` in the next steps.

.. sourcecode:: csharp

    internal class AutofacJobActivator : IJobActivatorEx
    {
        public T CreateInstance<T>()
        {
            // In practice, this method will not get called. We cannot safely resolve T here
            // because we don't have access to an ILifetimeScope, so it's better to just
            // throw.
            throw new NotSupportedException();
        }
    
        public T CreateInstance<T>(IFunctionInstanceEx functionInstance)
            where T : notnull
        {
            var lifetimeScope = functionInstance.InstanceServices
                .GetRequiredService<LifetimeScopeWrapper>()
                .Scope;
    
            // This is necessary because some dependencies of ILoggerFactory are registered
            // after FunctionsStartup.
            var loggerFactory = functionInstance.InstanceServices.GetRequiredService<ILoggerFactory>();
            lifetimeScope.Resolve<ILoggerFactory>(
                new NamedParameter(LoggerModule.LoggerFactoryParam, loggerFactory)
            );
            lifetimeScope.Resolve<ILogger>(
                new NamedParameter(LoggerModule.FunctionNameParam, functionInstance.FunctionDescriptor.LogName)
            );
    
            return lifetimeScope.Resolve<T>();
        }
    }

Next, implement ``LifetimeScopeWrapper``. This class is resolved from the
``IServiceCollection`` and allows us to dispose the Autofac lifetime scope after
the function has completed.

.. sourcecode:: csharp

  internal sealed class LifetimeScopeWrapper : IDisposable
  {
      public ILifetimeScope Scope { get; }
  
      public LifetimeScopeWrapper(IContainer container)
      {
          Scope = container.BeginLifetimeScope();
      }
  
      public void Dispose()
      {
          Scope.Dispose();
      }
  }

Special logic is needed for us to be able to resolve ``ILogger`` because certain
logger factories are not initialized until after the ``Startup`` class has run.
We can work around this by adding the following code.

.. sourcecode:: csharp

    internal class LoggerModule : Module
    {
        public const string LoggerFactoryParam = "loggerFactory";
        public const string FunctionNameParam = "functionName";
    
        protected override void Load(ContainerBuilder builder)
        {
            builder.Register((ctx, p) => p.Named<ILoggerFactory>(LoggerFactoryParam))
                .SingleInstance();
    
            builder.Register((ctx, p) =>
                {
                    var factory = ctx.Resolve<ILoggerFactory>();
                    var functionName = p.Named<string>(FunctionNameParam);
    
                    return factory.CreateLogger(Microsoft.Azure.WebJobs.Logging.LogCategories.CreateFunctionUserCategory(functionName));
                })
                .InstancePerLifetimeScope();
        }
    }

``LoggerModule`` should be included in your project even if you don't use
``ILogger`` directly, since this interface is referenced by many of Microsoft's
NuGet packages.

Startup Class
=============

Finally, add a ``Startup`` class to tie everything together. This class is
conceptually very similar to the ``Startup`` class in ASP.NET Core projects.

The ``FunctionsStartup`` base class is provided by the
``Microsoft.Azure.Functions.Extensions`` NuGet package.

.. sourcecode:: csharp

    [assembly: FunctionsStartup(typeof(MyFunctionApp.Startup))]
    
    namespace MyFunctionApp;
    
    internal class Startup : FunctionsStartup
    {
        public override void Configure(IFunctionsHostBuilder builder)
        {
            // Use IServiceCollection.Add extension method to add features as needed, e.g.
            builder.Services.AddDataProtection();
    
            builder.Services.AddSingleton(GetContainer(builder.Services));
    
            // Important: Use AddScoped so our Autofac lifetime scope gets disposed
            // when the function finishes executing
            builder.Services.AddScoped<LifetimeScopeWrapper>();
    
            builder.Services.Replace(ServiceDescriptor.Singleton(typeof(IJobActivator), typeof(AutofacJobActivator)));
            builder.Services.Replace(ServiceDescriptor.Singleton(typeof(IJobActivatorEx), typeof(AutofacJobActivator)));
        }
    
        private static IContainer GetContainer(IServiceCollection serviceCollection)
        {
            var containerBuilder = new ContainerBuilder();
            containerBuilder.Populate(serviceCollection);
            containerBuilder.RegisterModule<LoggerModule>();
    
            // This is a convenient way to register all your function classes at once
            containerBuilder.RegisterAssemblyTypes(typeof(Startup).Assembly)
                .InNamespaceOf<Function1>();
    
            // TODO: Register other dependencies with the ContainerBuilder like normal
    
            return containerBuilder.Build();
        }
    }

And that's it! Your function classes will now be resolved from Autofac.

Example Function
================

Here's an example of an HTTP-triggered function that uses a service from
dependency injection. Notice that the class and ``Run`` method are not static.

.. sourcecode:: csharp

    public class Function1
    {
        private readonly IRandomNumberService _randomNumberService;
    
        public Function1(IRandomNumberService randomNumberService)
        {
            _randomNumberService = randomNumberService;
        }
    
        // Call this by going to http://localhost:7071/api/Function1 in your web browser
        [FunctionName("Function1")]
        public IActionResult Run(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = null)]
            HttpRequest request
        )
        {
            var number = _randomNumberService.GetDouble();
    
            return new OkObjectResult($"Your random number is {number}.");
        }
    }


Acknowledgements
================

This guide was inspired by
`Autofac.Extensions.DependencyInjection.AzureFunctions
<https://github.com/junalmeida/autofac-azurefunctions>`_, a community NuGet
package. Give ``Autofac.Extensions.DependencyInjection.AzureFunctions`` a try if
you would prefer a NuGet package over the DIY approach presented here.

