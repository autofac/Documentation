===============================
Running Code at Container Build
===============================

Autofac provides the ability for components to be notified or automatically activated when the container is built.

There are three automatic activation mechanisms available:

- Startable components
- Auto-activated components
- Container build callbacks

In all cases, **at the time the container is built, the component will be activated**.

.. note::

    **Avoid overusing startup logic**: The ability to run startup logic on container build may feel like it's also a good fit for orchestrating general application startup logic. **Application startup is a separate concern from dependency management.** Given the ordering and other challenges you may run into, it is recommended you keep *application startup* logic separate from *dependency management* logic.

.. contents::
  :local:

Startable Components
====================

A **startable component** is one that is activated by the container when the container is initially built and has a specific method called to bootstrap an action on the component.

The key is to implement the ``Autofac.IStartable`` interface. When the container is built, the component will be activated and the ``IStartable.Start()`` method will be called.

**This only happens once, for a single instance of each component, the first time the container is built.** Resolving startable components by hand won't result in their ``Start()`` method being called. It isn't recommended that startable components are registered as anything other than ``SingleInstance()``.

Components that need to have something like a ``Start()`` method called *each time they are activated* should use :doc:`a lifetime event <events>` like ``OnActivated`` instead.

To create a startable component, implement ``Autofac.IStartable``:

.. sourcecode:: csharp

    public class StartupMessageWriter : IStartable
    {
       public void Start()
       {
          Console.WriteLine("App is starting up!");
       }
    }

Then register your component and **be sure to specify** it as ``IStartable`` or the action won't be called:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder
       .RegisterType<StartupMessageWriter>()
       .As<IStartable>()
       .SingleInstance();

When the container is built, the type will be activated and the ``IStartable.Start()`` method will be called. In this example, a message will be written to the console.

The order in which components are started is not defined, however, as of Autofac 4.7.0 when a component implementing ``IStartable`` depends on another component that is ``IStartable``, the ``Start()`` method is guaranteed to have been called on the dependency before the dependent component is activated:

.. sourcecode:: csharp

    static void Main(string[] args)
    {
        var builder = new ContainerBuilder();
        builder.RegisterType<Startable1>().AsSelf().As<IStartable>().SingleInstance();
        builder.RegisterType<Startable2>().As<IStartable>().SingleInstance();
        builder.Build();
    }

    class Startable1 : IStartable
    {
        public Startable1()
        {
            Console.WriteLine("Startable1 activated");
        }

        public void Start()
        {
            Console.WriteLine("Startable1 started");
        }
    }

    class Startable2 : IStartable
    {
        public Startable2(Startable1 startable1)
        {
            Console.WriteLine("Startable2 activated");
        }

        public void Start()
        {
            Console.WriteLine("Startable2 started");
        }
    }

Will output the following:

::

    Startable1 activated
    Startable1 started
    Startable2 activated
    Startable2 started

Auto-Activated Components
=========================

An **auto-activated component** is a component that simply needs to be activated one time when the container is built. This is a "warm start" style of behavior where no method on the component is called and no interface needs to be implemented - a single instance of the component will be resolved with no reference to the instance held.

To register an auto-activated component, use the ``AutoActivate()`` registration extension.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder
       .RegisterType<TypeRequiringWarmStart>()
       .AsSelf()
       .AutoActivate();

Note: If you *omit* the ``AsSelf()`` or ``As<T>()`` service registration calls when you register an ``AutoActivate()`` component, the component will *only* be registered to auto-activate and won't necessarily be resolvable "as itself" after container build.

Build Callbacks
===============

You can register any arbitrary action to happen at container or lifetime scope build time by registering a build callback. A build callback is an ``Action<IContainer>`` and will get the built container prior to that container being returned from ``ContainerBuilder.Build``. Build callbacks execute in the order they are registered:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder
       .RegisterBuildCallback(c => c.Resolve<DbContext>());

    // The callback will run after the container is built
    // but before it's returned.
    var container = builder.Build();

You can use build callbacks as another way to automatically start/warm up an object on container build. Do that by using them in conjunction with :doc:`the lifetime event OnActivated <events>` and ``SingleInstance`` registrations.

A long/contrived example in unit test form:

.. sourcecode:: csharp

    public class TestClass
    {
      // Create a dependency chain like
      //    ==> 2 ==+
      // 4 =+       ==> 1
      //    ==> 3 ==+
      // 4 needs 2 and 3
      // 2 needs 1
      // 3 needs 1
      // Dependencies should start up in the order
      // 1, 2, 3, 4
      // or
      // 1, 3, 2, 4
      private class Dependency1
      {
        public Dependency1(ITestOutputHelper output)
        {
          output.WriteLine("Dependency1.ctor");
        }
      }

      private class Dependency2
      {
        private ITestOutputHelper output;

        public Dependency2(ITestOutputHelper output, Dependency1 dependency)
        {
          this.output = output;
          output.WriteLine("Dependency2.ctor");
        }

        public void Initialize()
        {
          this.output.WriteLine("Dependency2.Initialize");
        }
      }

      private class Dependency3
      {
        private ITestOutputHelper output;

        public Dependency3(ITestOutputHelper output, Dependency1 dependency)
        {
          this.output = output;
          output.WriteLine("Dependency3.ctor");
        }

        public void Initialize()
        {
          this.output.WriteLine("Dependency3.Initialize");
        }
      }

      private class Dependency4
      {
        private ITestOutputHelper output;

        public Dependency4(ITestOutputHelper output, Dependency2 dependency2, Dependency3 dependency3)
        {
          this.output = output;
          output.WriteLine("Dependency4.ctor");
        }

        public void Initialize()
        {
          this.output.WriteLine("Dependency4.Initialize");
        }
      }

      // Xunit passes this to the ctor of the test class
      // so we can capture console output.
      private ITestOutputHelper _output;

      public TestClass(ITestOutputHelper output)
      {
        this._output = output;
      }

      [Fact]
      public void OnActivatedDependencyChain()
      {
        var builder = new ContainerBuilder();
        builder.RegisterInstance(this._output).As<ITestOutputHelper>();
        builder.RegisterType<Dependency1>().SingleInstance();

        // The OnActivated replaces the need for IStartable. When an instance
        // is activated/created, it'll run the Initialize method as specified. Using
        // SingleInstance means that only happens once.
        builder.RegisterType<Dependency2>().SingleInstance().OnActivated(args => args.Instance.Initialize());
        builder.RegisterType<Dependency3>().SingleInstance().OnActivated(args => args.Instance.Initialize());
        builder.RegisterType<Dependency4>().SingleInstance().OnActivated(args => args.Instance.Initialize());

        // Notice these aren't in dependency order.
        builder.RegisterBuildCallback(c => c.Resolve<Dependency4>());
        builder.RegisterBuildCallback(c => c.Resolve<Dependency2>());
        builder.RegisterBuildCallback(c => c.Resolve<Dependency1>());
        builder.RegisterBuildCallback(c => c.Resolve<Dependency3>());

        // This will run the build callbacks.
        var container = builder.Build();

        // These effectively do NOTHING. OnActivated won't be called again
        // because they're SingleInstance.
        container.Resolve<Dependency1>();
        container.Resolve<Dependency2>();
        container.Resolve<Dependency3>();
        container.Resolve<Dependency4>();
      }
    }

This sample unit test will generate this output:

::

    Dependency1.ctor
    Dependency2.ctor
    Dependency3.ctor
    Dependency4.ctor
    Dependency2.Initialize
    Dependency3.Initialize
    Dependency4.Initialize

You'll see from the output that the callbacks and ``OnActivated`` methods executed in dependency order. If you must have the activations *and* the startups all happen in dependency order (not just the activations/resolutions), this is the workaround.

Note if you don't use ``SingleInstance`` then ``OnActivated`` will be called for *every new instance of the dependency*. Since "warm start" objects are usually singletons and are expensive to create, this is generally what you want anyway.

Lifetime Scopes
===============

Registering an ``IStartable`` or ``AutoActivate`` item with something other than ``SingleInstance`` or ``InstancePerDependency`` may not work the way you expect.

For example, if you register using ``InstancePerLifetimeScope``, **this does not result in a new startable running in every lifetime scope you create**. The startable will instead run on container build only.

Further, **you can't use IStartable or AutoActivate with named lifetime scopes.** Registering with a named lifetime scope won't start the component when the named scope is created; instead it will yield an exception on container build because the named scope doesn't exist.

.. sourcecode:: csharp

    static void Main(string[] args)
    {
        var builder = new ContainerBuilder();

        // This WON'T WORK. You'll get a DependencyResolutionException when
        // the container tries to start the component because the named lifetime
        // scope doesn't exist.
        builder.RegisterType<Startable1>()
               .As<IStartable>()
               .InstancePerMatchingLifetimeScope("unitofwork");
        builder.Build();
    }

If you need to start something in a particular lifetime scope, you need to register it with that lifetime scope at the time of creation.

.. sourcecode:: csharp

    static void Main(string[] args)
    {
        var builder = new ContainerBuilder();
        var container = builder.Build();
        using(var uow = container.BeginLifetimeScope("unitofwork", b => b.RegisterType<Startable1>().As<IStartable>()))
        {
          // The startable will have run.
        }
    }

Build callbacks will work both at the container level and scope level. They'll run at the level in which they're specified.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterBuildCallback(
      c => Console.WriteLine("This happens when the container is built."));
    using var container = builder.Build();
    using var scope = container.BeginLifetimeScope(
      b => b.RegisterBuildCallback(
        c => Console.WriteLine("This happens when the scope is built."));

Tips
====

**Where possible, try to get away from startup logic**: The ability to run startup logic on container build is really convenient, but a DI container is about wiring up your objects, not orchestrating application startup. It's a good idea to keep these concerns separate whenever possible.

**Order**: In general, startup logic happens in the order ``IStartable.Start()``, ``AutoActivate``, build callbacks. That said, it is *not guaranteed*. For example, as noted in the ``IStartable`` docs above, things will happen in dependency order rather than registration order. Further, Autofac reserves the right to change this order (e.g., refactor the calls to ``IStartable.Start()`` and ``AutoActivate`` into build callbacks). If you need to control the specific order in which initialization logic runs, it's better to write your own initialization logic where you can control the order.

**Avoid creating lifetime scopes during IStartable.Start or AutoActivate**: If your startup logic includes the creation of a lifetime scope from which components will be resolved, this scope won't have all the startables executed yet. By creating the scope, you're forcing a race condition. This sort of logic would be better to execute in custom logic after the container is built rather than as part of an ``IStartable``.

**Consider OnActivated and SingleInstance for lazy initialization**: Instead of using build callbacks or startup logic, consider using :doc:`the lifetime event OnActivated <events>` with a ``SingleInstance`` registration so the initialization can happen on an object but not be tied to the order of container build.
