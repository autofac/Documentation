==============================
log4net Integration Middleware
==============================

While there is no specific assembly for log4net support, you can easily inject ``log4net.ILog`` values using a simple piece of middleware, and a very small custom module to
add that middleware to all your registrations.

The ``Log4NetMiddleware`` is also a good example of how to use :doc:`pipeline middleware <../advanced/pipelines>`.

Here's the sample middleware that injects ``ILog`` parameters based on the type of the component being activated.
This sample middleware handles both constructor and property injection.

.. sourcecode:: csharp

    public class Log4NetMiddleware : IResolveMiddleware
    {
        public PipelinePhase Phase => PipelinePhase.ParameterSelection;

        public void Execute(ResolveRequestContext context, Action<ResolveRequestContext> next)
        {
            // Add our parameters.
            context.ChangeParameters(context.Parameters.Union(
                new[]
                {
                  new ResolvedParameter(
                      (p, i) => p.ParameterType == typeof(ILog),
                      (p, i) => LogManager.GetLogger(p.Member.DeclaringType)
                  ),
                }));

            // Continue the resolve.
            next(context);

            // Has an instance been activated?
            if (context.NewInstanceActivated)
            {
                var instanceType = context.Instance.GetType();

                // Get all the injectable properties to set.
                // If you wanted to ensure the properties were only UNSET properties,
                // here's where you'd do it.
                var properties = instanceType
                    .GetProperties(BindingFlags.Public | BindingFlags.Instance)
                    .Where(p => p.PropertyType == typeof(ILog) && p.CanWrite && p.GetIndexParameters().Length == 0);

                // Set the properties located.
                foreach (var propToSet in properties)
                {
                    propToSet.SetValue(context.Instance, LogManager.GetLogger(instanceType), null);
                }
            }
        }
    }

**Performance Note**: At the time of this writing, calling ``LogManager.GetLogger(type)`` has a slight performance hit as the internal log manager locks the collection of loggers to retrieve the appropriate logger. An enhancement to the middleware would be to add caching around logger instances so you can reuse them without the lock hit in the ``LogManager`` call.

Here's the simple ``MiddlewareModule`` (not specific to Logging), that adds a single middleware instance to the
pipeline for every registration.

.. sourcecode:: csharp

    // Adds a piece of middleware to every registration.
    public class MiddlewareModule : Autofac.Module
    {
        private readonly IResolveMiddleware middleware;

        public MiddlewareModule(IResolveMiddleware middleware)
        {
            this.middleware = middleware;
        }

        protected override void AttachToComponentRegistration(IComponentRegistryBuilder componentRegistryBuilder, IComponentRegistration registration)
        {
            // Attach to the registration's pipeline build.
            registration.PipelineBuilding += (sender, pipeline) =>
            {
                // Add our middleware to the pipeline.
                pipeline.Use(middleware);
            };
        }
    }
