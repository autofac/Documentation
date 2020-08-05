================
Pooled Instances
================

Frequently, applications find that they have components that are expensive to initialise 
(like a database or external service connection of some kind), and you'd like to re-use instances
if you can rather than have to create new ones each time.

This is usually referred to as maintaining a 'pool' of objects. When you want a new instance of an object,
you get one from the pool, and when you are done with it, you return it to the pool.

Autofac can help you implement a pool of components in your application without you having to write your
own pooling implementation, and making these pooled components feel more natural in the world of DI.

.. note:: 

    It's worth mentioning before we continue that a number of common .NET types, such as ``HttpClient``
    or the ADO.NET ``SqlConnection``, already implement pooling for you behind-the-scenes, so there is
    nothing to gain by adding Autofac Pooling on top of those types.

Getting Started
---------------

To start creating pooled Autofac registrations, first add a reference to
`the Autofac.Pooling NuGet package <https://nuget.org/packages/Autofac.Pooling>`_.

Once you have that, you can start defining and using pooled registrations, with the new lifetime configuration
methods, ``PooledInstancePerLifetimeScope`` and ``PooledInstancePerMatchingLifetimeScope``:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();

    builder.RegisterType<MyCustomConnection>()
           .As<ICustomConnection>()
           .PooledInstancePerLifetimeScope();

    var container = builder.Build();

    using (var scope = container.BeginLifetimeScope())
    {
        // Creates a new instance of MyCustomConnection
        var instance = scope.Resolve<ICustomConnection>();

        instance.DoSomething();
    }

    // When the scope ends, the instance of MyCustomConnection
    // is returned to the pool, rather than being disposed.

    using (var scope2 = container.BeginLifetimeScope())
    {
        // Does **not** create a new instance, but instead gets the 
        // previous instance from the pool.
        var instance = scope.Resolve<ICustomConnection>();

        instance.DoSomething();
    }

    // Instance gets returned back to the pool again at the 
    // end of the lifetime scope.

Like any other dependency, you can use these services in your constructors to inject 
the pooled instance:

.. sourcecode:: csharp

    public class WorkOperation
    {
        // Injects an instance from the pool.
        public WorkOperation(ICustomConnection customConnection)
        {
            // ...
        }
    }

When the current :ref:`lifetime scope <lifetime-instance-scope-per-lifetime-scope>` ends, the retrieved instance is returned to the pool.

Resetting Pooled Instances Between Resolves
-------------------------------------------

With pooled components, there is often a need to do some work to reset the object when it is
retrieved from or returned to the pool.

Autofac allows a component to be aware of when it is retrieved from or returned to the pool, by
implementing the ``IPooledComponent`` interface:

.. sourcecode:: csharp

    public class PoolAwareComponent : IPooledComponent
    {
        public void OnGetFromPool(IComponentContext context, IEnumerable<Parameter> parameters)
        {
            // Called when the component is retrieved from the pool during a resolve operation,
            // including the first time it is used.
        }

        public void OnReturnToPool()
        {
            // Called when the component is about to be returned to the pool.
        }
    }

The ``OnGetFromPool`` method is passed the temporary ``IComponentContext`` of the current resolve
operation, plus any parameters passed to the resolve.

.. warning:: 

    Any services resolved from the provided ``IComponentContext`` are taken from the **current scope** 
    accessing the pooled component. This means that any instances you resolve from that ``IComponentContext`` 
    should be discarded in ``OnReturnToPool`` to prevent memory leaks.

If you cannot modify the component you are pooling, but need to have custom behaviour similar to this,
you can :ref:`implement a custom pool policy <pooled-instances-policies>`.

Pool Capacity
-------------

Each pooled registration has the notion of a pool capacity.  This capacity defaults to ``Environment.ProcessorCount * 2``,
but can easily be customised using overloads of the extension methods:

.. sourcecode:: csharp

    // Set a capacity of 100
    builder.RegisterType<MyCustomConnection>()
            .As<ICustomConnection>()
            .PooledInstancePerLifetimeScope(100);

It's important to understand that **the capacity of a pool does not place a limit on the number of instances it allocates/activates**,
or can be in use at any one time; instead it limits how many instances are **retained** by the pool.

In practical terms, this means that if your pool capacity is 100, and you currently have 100 instances in use, then
resolving another instance will just activate a brand new instance of the component, rather than blocking/failing. 

However, if you have 101 instances of the component in use, the next instance that is returned to the pool will be discarded
rather than retained. In this situation, the ``OnReturnToPool`` method on ``IPooledComponent`` would still be called, but the instance will then immediately be thrown away.

When an instance is discarded by the pool, if the object implements ``IDisposable``, ``Dispose`` will be called.

If you in fact do want your pool to have custom behaviour like blocking until a resource is available, you can implement 
a custom :ref:`Pool Policy <pooled-instances-policies>`. 

.. note:: 

    The Autofac Pooling behaviour is built on top of the `Object Pool <https://docs.microsoft.com/en-us/aspnet/core/performance/objectpool>`_ implementation
    available from `the Microsoft.Extensions.ObjectPool package <https://www.nuget.org/packages/Microsoft.Extensions.ObjectPool/>`_.

    The behaviour of that pool informs a lot of the behaviour of Autofac.Pooling.

Matching Lifetime Scopes
------------------------

In the same way that you can configure a normal registration to be scoped to a :ref:`matching lifetime scope <lifetime-instance-scope-per-matching-lifetime-scope>`,
you can configure a pooled registration to be scoped in the same way:

.. sourcecode:: csharp

    builder.RegisterType<MyCustomConnection>()
           .As<ICustomConnection>()
           .PooledInstancePerMatchingLifetimeScope("tag");

Pooled registrations with a matching lifetime scope result in each tagged scope retrieving its own instance from the pool, and child scopes
sharing the same pooled instance.

When the tagged lifetime scope is disposed, the instance is returned to the pool.

.. _pooled-instances-policies:

Pool Policies
-------------

If you need some custom behaviour that is invoked when instances are retrieved from, or returned to, the pool, you can implement
``IPooledRegistrationPolicy<TPooledObject>`` or override ``DefaultPooledRegistrationPolicy<TPooledObject>``.

Here's an example of a simple policy that will block any further requests for pooled instances once the available capacity is used up:

.. sourcecode:: csharp

    public class BlockingPolicy<TPooledObject> : IPooledRegistrationPolicy<TPooledObject>
        where TPooledObject : class
    {
        private readonly SemaphoreSlim _semaphore;

        public BlockingPolicy(int maxConcurrentInstances)
        {
            // Create a semaphore with the same 'capacity' as the number of instances.
            _semaphore = new SemaphoreSlim(maxConcurrentInstances);

            // Specify that the pool should hold the specified concurrent instances.
            MaximumRetained = maxConcurrentInstances;
        }

        /// <summary>
        /// Gets a value indicating the maximum number of items that will be retained in the pool. 
        /// </summary>
        public int MaximumRetained { get; }

        /// <summary>
        /// Invoked when an instance of <typeparamref name="TPooledObject"/> is requested. The policy can invoke <paramref name="getFromPool"/> to
        /// retrieve an instance from the pool. Equally, it could decide to ignore the pool, and just return a custom instance.
        /// </summary>
        /// <param name="context">The current component context.</param>
        /// <param name="parameters">The set of parameters for the resolve request accessing the pool.</param>
        /// <param name="getFromPool">A callback that will retrieve an item from the underlying pool of objects.</param>
        public TPooledObject Get(IComponentContext context, IEnumerable<Parameter> parameters, Func<TPooledObject> getFromPool)
        {
            // Block on the semaphore before we attempt to retrieve an instance from the pool.
            _semaphore.Wait();

            // Return an instance from the pool (one will be created if needed).
            return getFromPool();
        }

        /// <summary>
        /// Invoked when an object is about to be returned into the pool. 
        /// </summary>
        /// <param name="pooledObject">The pooled object.</param>
        /// <returns>
        /// True if the object should be returned to the pool.
        /// False if it should not be placed back in the pool (and will be disposed immediately if it implements <see cref="IDisposable"/>).
        /// </returns>
        public bool Return(TPooledObject pooledObject)
        {
            // Release the semaphore to free up an instance.
            _semaphore.Release();

            // Return true to place the object back in the pool instead of discarding it.
            return true;
        }
    }

You can then use this policy when registering your pool:

.. sourcecode:: csharp

    // Register a pool that only allows a max of 100 concurrent instances.
    builder.RegisterType<MyCustomConnection>()
            .As<ICustomConnection>()
            .PooledInstancePerLifetimeScope(new BlockingPolicy<MyCustomConnection>(100));
