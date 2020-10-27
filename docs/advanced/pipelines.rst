Resolve Pipelines
-----------------

In Autofac (from version 6.0 onwards), the work of actually resolving an instance of a registration when a service is requested is implemented as a **pipeline**,
consisting of multiple **middleware**. Each individual middleware represents some part of the process required to construct or locate your instance and return it to you.

For advanced customisation scenarios, Autofac allows you to add your own middleware into the pipeline to intercept, short-circuit or extend the existing resolve 
behaviour.

Service Pipelines vs Registration Pipelines
-------------------------------------------

An individual resolve request actually ends up invoking two different pipelines. The Service Pipeline, and the Registration Pipeline.  

Each :doc:`service <../glossary>` has its own Service Pipeline, and each :doc:`registration <../glossary>` has its own Registration Pipeline.

Lets take a look at the 'default' execution pipeline for a typical service:

.. figure:: media/PipelineDiagram.png
    :align: center
    :alt: An example resolve pipeline consisting of a Service Pipeline and a Registration Pipeline.

    An example resolve pipeline consisting of a Service Pipeline and a Registration Pipeline.

The Service Pipeline is attached to a given service, the thing you use to resolve something. These are common
for all resolves of the service, regardless of the actual registration that supplies an instance.

The Registration Pipeline is attached to each individual registration, and applies to all 
resolves that invoke that registration, regardless of the service used to resolve it.

We can use this notion of separated pipelines to attach behaviour to either all invocations
of a given service (:doc:`decorators <adapters-decorators>` do this), or to an individual registration
(for example, adding :doc:`lifetime events </lifetime/events>` to the pipeline).

Pipeline Phases
---------------

When we add middleware to a pipeline, we need to specify which **phase** of the pipeline the middleware should run in. 

By specifying a phase, we allow ordering of middleware inside the pipeline, 
so we are not dependent on the actual order in which middleware is added.

Here's the available pipeline phases, broken up into service phases and registration phases. 

.. table::
    :widths: 40 60

    +----------------------------------------------------------------------------------------------------------------------------------------------------------------+
    |                                                                     Service Pipeline Phases                                                                    |
    +===========================+====================================================================================================================================+
    | ResolveRequestStart       | The start of a resolve request. Custom middleware added to this phase executes before circular dependency detection.               |
    +---------------------------+------------------------------------------------------------------------------------------------------------------------------------+
    | ScopeSelection            | In this phase, the lifetime scope selection takes place. If some middleware needs to change the lifetime scope to resolve against, |
    |                           | it happens here (but bear in mind that the configured Autofac lifetime for the registration will still take effect).               |
    +---------------------------+------------------------------------------------------------------------------------------------------------------------------------+
    | Decoration                | In this phase, instance decoration will take place (on the way 'out' of the pipeline).                                             |
    +---------------------------+------------------------------------------------------------------------------------------------------------------------------------+
    | Sharing                   | At the end of this phase, if a shared instance satisfies the request, the pipeline will stop executing and exit. Add custom        |
    |                           | middleware to this phase to choose your own shared instance.                                                                       |
    +---------------------------+------------------------------------------------------------------------------------------------------------------------------------+
    | ServicePipelineEnd        | This phase occurs just before the service pipeline ends (and the registration pipeline is about to start).                         |
    +---------------------------+------------------------------------------------------------------------------------------------------------------------------------+


.. table::
    :widths: 40 60

    +----------------------------------------------------------------------------------------------------------------------------------------------------------------+
    |                                                                  Registration Pipeline Phases                                                                  |
    +===========================+====================================================================================================================================+
    | RegistrationPipelineStart | This phase occurs at the start of the registration pipeline.                                                                       |
    +---------------------------+------------------------------------------------------------------------------------------------------------------------------------+
    | ParameterSelection        | This phase runs just before Activation, is the recommended point at which the resolve parameters should be replaced if needed.     |
    +---------------------------+------------------------------------------------------------------------------------------------------------------------------------+
    | Activation                | The Activation phase is the last phase of a pipeline, where a new instance of a component is created.                              |
    +---------------------------+------------------------------------------------------------------------------------------------------------------------------------+

.. note:: 

    If you attempt to specify a service pipeline phase when adding registration middleware (or vice versa),
    you will get an error. You need to use the appropriate phase depending on which pipeline you are adding to.

Adding Registration Middleware
------------------------------

Lets take a look at how we can insert our own middleware into the registration pipeline
when we create a registration, with a simple 'Hello World' lambda middleware that prints some information to the console:

.. code-block:: csharp

    var builder = new ContainerBuilder();

    builder.RegisterType<MyImplementation>().As<IMyService>().ConfigurePipeline(p =>
    {
        // Add middleware at the start of the registration pipeline.
        p.Use(PipelinePhase.RegistrationPipelineStart, (context, next) =>
        {
            Console.WriteLine("Before Activation - Requesting {0}", context.Service);

            // Call the next middleware in the pipeline.
            next(context);

            Console.WriteLine("After Activation - Instantiated {0}", context.Instance);
        });
    });
    
You can see that we call the next middleware in the pipeline using the ``next`` callback provided,
allowing the resolve operation to continue.

You have access to the created instance after ``next`` returns. This is because calling ``next``
invokes the next middleware in the pipeline, which also calls ``next``, and so on, until the end of the pipeline, when the instance
is activated.

If you don't invoke that ``next`` callback, the pipeline ends, and we return back up to the caller.

Defining Middleware Classes
^^^^^^^^^^^^^^^^^^^^^^^^^^^

In addition to providing middleware via a lambda function, you can also define your own middleware classes,
and add instances of those to the pipeline:

.. code-block:: csharp

    class MyCustomMiddleware : IResolveMiddleware
    {
        public PipelinePhase Phase => PipelinePhase.RegistrationPipelineStart;

        public void Execute(ResolveRequestContext context, Action<ResolveRequestContext> next)
        {
            Console.WriteLine("Before Activation - Requesting {0}", context.Service);

            // Call the next middleware in the pipeline.
            next(context);

            Console.WriteLine("After Activation - Instantiated {0}", context.Instance);
        }
    }

    // ....
    
    builder.RegisterType<MyImplementation>().As<IMyService>().ConfigurePipeline(p =>
    {
        p.Use(new MyCustomMiddleware());
    });

The two ways of adding middleware behave identically, but defining a class may help if you have complex middleware.

Adding Middleware to all Registrations
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

If you want to add a piece of middleware to all registrations, you can use the ``Registered`` event
in the same way you would have added other shared registration behaviour:

.. code-block:: csharp

    // Add MyCustomMiddleware to every registration.
    builder.ComponentRegistryBuilder.Registered += (sender, args) =>
    {
        // The PipelineBuilding event fires just before the pipeline is built, and 
        // middleware can be added inside it.
        args.ComponentRegistration.PipelineBuilding += (sender2 , pipeline) =>
        {
            pipeline.Use(new MyCustomMiddleware());
        };
    };


ResolveRequestContext
---------------------

The context object passed into all middleware is an instance of ``ResolveRequestContext``. This object 
stores the initial attributes of a resolve request, and any properties updated while the request executes.

You can use this context to:

- Check the service being resolved with the ``Service`` property.
- Check the Registration being used to provide the service.
- Get or set the result of the resolve operation with the ``Instance`` property.
- Access the parameters of the request with the ``Parameters`` property and
  change those parameters with the ``ChangeParameters`` method.
- Resolve another service (using any of the normal Resolve methods).

.. note:: 

    ``ResolveRequestContext`` is an abstract base class. If you want to write unit tests for your
    middleware you can mock it and pass the mock into your middleware implementation.


Adding Service Middleware
-------------------------

Service middleware is attached to a service, rather than a specific registration. So when we add service
middleware we can add behaviour for all resolves of the service, without caring which registration is providing the
instance.

You add service middleware directly onto the ``ContainerBuilder``:

.. code-block:: csharp

    var builder = new ContainerBuilder();

    // Run some middleware at the very start of the pipeline, before any core Autofac behaviour.
    builder.RegisterServiceMiddleware<IMyService>(PipelinePhase.ResolveRequestStart, (context, next) =>
    {
        Console.WriteLine("Requesting Service: {0}", context.Service);

        next(context);
    });

Just like with registration middleware, you can register middleware classes instead of lambdas:

.. code-block:: csharp

    builder.RegisterServiceMiddleware<IMyService>(new MyServiceMiddleware());

Service Middleware Sources
--------------------------

In a similar way to :doc:`registration sources <registration-sources>`, you can add a **service middleware source**
if you want to add service middleware dynamically at runtime.

This can be particularly useful for things like open generic services, where we don't know the 
**actual** service type until runtime.

You define a service middleware source by implementing ``IServiceMiddlewareSource``,
and registering your source with the ``ContainerBuilder``.

.. code-block:: csharp

    class MyServiceMiddlewareSource : IServiceMiddlewareSource
    {
        public void ProvideMiddleware(Service service, IComponentRegistryServices availableServices, IResolvePipelineBuilder pipelineBuilder)
        {
            // Add some middleware to the Sharing phase of every service.
            pipelineBuilder.Use(PipelinePhase.Sharing, (context, next) =>
            {
                Console.WriteLine("I'm on every service!");

                next(context);
            });
        }
    }

    // ...

    builder.RegisterServiceMiddlewareSource(new MyServiceMiddlewareSource());