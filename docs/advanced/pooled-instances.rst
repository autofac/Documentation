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

When the current :ref:`Lifetime Scope <lifetime-instance-scope-per-lifetime-scope>` ends, the retrieved instance is returned to the pool.

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
you can implement a custom :ref:`Pool Policy <pooled-instances-policies>`.

Pool Capacity
-------------





.. _pooled-instances-policies:

Pool Policies
-------------