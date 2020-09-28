==========
Composites
==========

The `composite pattern <https://en.wikipedia.org/wiki/Composite_pattern>`_ allows a collection of objects to be treated in the
same way as a single instance of that same type of object.

In Autofac 6.0, we added support for expressing the composite pattern for services in your container that have multiple implementations, 
but should be exposed through a single wrapper class.

You can register a **composite wrapper** registration for a service, that will be returned when a consuming class resolves 
that service, and can take a collection of the same service as a constructor parameter.

This functionality is particularly useful if you find yourself needing to add a provider for a service, but you
don't want the consuming code of the original provider to a) have to change, or b) know that there are multiple providers.

.. sourcecode:: csharp

    // This is my service with multiple registrations.
    public interface ILogSink
    {
        void WriteLog(string log);
    }

    // A composite wrapper is just a regular class that injects a collection of the same service.
    public class CompositeLogSink : ILogSink
    {
        private readonly IEnumerable<ILogSink> _implementations;

        public CompositeLogSink(IEnumerable<ILogSink> implementations)
        {
            _implementations = implementations;
        }

        public void WriteLog(string log)
        {
            foreach (var sink in _implementations)
            {
                sink.WriteLog(log);
            }
        }
    }
    
    // ....

    var builder = new ContainerBuilder();
            
    builder.RegisterType<FileLogSink>().As<ILogSink>();
    builder.RegisterType<DbLogSink>().As<ILogSink>();

    // Register a composite wrapper for ILogSink.
    builder.RegisterComposite<CompositeLogSink, ILogSink>();

    var container = builder.Build();

    // This will return the composite wrapper, with the two registrations injected.
    var logSink = container.Resolve<ILogSink>();

    logSink.WriteLog("log message");

If you don't know the type up front, you can manually specify instead of using the generic:

.. sourcecode:: csharp

    builder.RegisterComposite(typeof(CompositeLogSink), typeof(ILogSink));

For more complex composite creation, you can also specify a lambda for your composite registration:

.. sourcecode:: csharp

    builder.RegisterComposite<ILogSink>((ctxt, parameters, implementations) => new CompositeLogSink(implementations));

In the lambda, ``context`` is the ``IComponentContext`` in which the resolution is happening (so you could resolve other things if needed),
``parameters`` is an ``IEnumerable<Parameter>`` with all the parameters passed in,
and ``implementations`` is an ``IEnumerable`` of all the implementations of the service.

It is also possible to register open generic composites:

.. sourcecode:: csharp

    // Generic providers...
    builder.RegisterGeneric(typeof(FileLogSink<>)).As(typeof(ILogSink<>));
    builder.RegisterGeneric(typeof(DbLogSink<>)).As(typeof(ILogSink<>));

    // ...with a generic composite.
    builder.RegisterGenericComposite(typeof(CompositeLogSink<>), typeof(ILogSink<>));

    var container = builder.Build();

    // Will return a composite of FileLogSink<HttpClient> and DbLogSink<HttpClient>.
    var sink = container.Resolve<ILogSink<HttpClient>>();

Composite wrappers can have their own additional dependencies, as well as use any combination of the :doc:`implicit relationships <../resolve/relationships>`
on the set of implementations passed in:

.. sourcecode:: csharp

    public class CompositeWrapper : ILogSink
    {
        public CompositeWrapper(IEnumerable<ILogSink> implementations, IAnotherService service)
        {
        }
    }

    public class LazyCompositeWrapper : ILogSink
    {
        // Lazy loading for the set of composites.
        public LazyCompositeWrapper(Lazy<IEnumerable<ILogSink>> implementations)
        {
        }
    }

    public class MetaCompositeWrapper : ILogSink
    {
        // Access the metadata of each implementation.
        public LazyCompositeWrapper(IEnumerable<Meta<ILogSink>> implementations)
        {
        }
    }

Metadata
--------

Composite registrations can have their own metadata, much like a normal registration; however they do **not** expose any metadata of the individual registrations they wrap:

.. sourcecode:: csharp

    // Register a composite wrapper for ILogSink:
    builder.RegisterComposite<CompositeLogSink, ILogSink>()
            .WithMetadata("key", "value");

    var container = builder.Build();

    // This will return the composite wrapper and expose the metadata.
    var logSink = container.Resolve<Meta<ILogSink>>();

Lifetime
--------

Composite wrappers can have their own lifetime, much like any other registration. However, you should consider the 
implications of making composite registrations long-living; a ``SingleInstance`` composite would ignore any additional registrations
for the wrapped service made in nested lifetime scopes (for example).

Decorators
----------

When using the composite pattern, decorators are **only applied to the individual implementations**, and **not** to the composite itself.

So, if you register a decorator for ``ILogSink``, and have a composite registration with implementations ``FileLogSink`` and ``DbLogSink``, when you resolve ``ILogSink``
``FileLogSink`` and ``DbLogSink`` **will** be decorated, but your composite wrapper **will not** be decorated.

Composites and Collections
--------------------------

Composite registrations are **never** returned when resolving a collection of implementations, even outside of a composite wrapper:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
            
    builder.RegisterType<FileLogSink>().As<ILogSink>();
    builder.RegisterType<DbLogSink>().As<ILogSink>();

    // Register a composite wrapper for ILogSink:
    builder.RegisterComposite<CompositeLogSink, ILogSink>();

    var container = builder.Build();

    // This will return 2 items only (the actual implementations).
    var logSinks = container.Resolve<IEnumerable<ILogSink>>();