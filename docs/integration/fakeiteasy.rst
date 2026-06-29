==========
FakeItEasy
==========

The `FakeItEasy <https://fakeiteasy.github.io>`_ integration package allows you to automatically create fake dependencies for both concrete and fake abstract instances in unit tests using an Autofac container.

Array types, ``IEnumerable<T>`` types, and concrete types will be created via the underlying container, which is automatically configured with :doc:`the AnyConcreteTypeNotAlreadyRegisteredSource  <../advanced/registration-sources>`, while other interfaces and abstract classes will be created as FakeItEasy Fakes.

You can `get the Autofac.Extras.FakeItEasy package on NuGet <https://nuget.org/packages/Autofac.Extras.FakeItEasy>`_.

Getting Started
===============

Given you have a system under test and a dependency:

.. sourcecode:: csharp

    public class SystemUnderTest
    {
      public SystemUnderTest(IDependency dependency)
      {
      }
    }

    public interface IDependency
    {
    }

When writing your unit test, use the ``Autofac.Extras.FakeItEasy.AutoFake`` class to instantiate the system under test. Doing this will automatically inject a fake dependency into the constructor for you.

.. sourcecode:: csharp

    [Test]
    public void Test()
    {
      using (var fake = new AutoFake())
      {
        // The AutoFake class will inject a fake IDependency
        // into the SystemUnderTest constructor
        var sut = fake.Resolve<SystemUnderTest>();
      }
    }

Configuring Fakes
=================

You can configure the automatic fakes and/or assert calls on them as you would normally with FakeItEasy.

.. sourcecode:: csharp

    [Test]
    public void Test()
    {
      using (var fake = new AutoFake())
      {
        // Arrange - configure the fake
        A.CallTo(() => fake.Resolve<IDependency>().GetValue()).Returns("expected value");
        var sut = fake.Resolve<SystemUnderTest>();

        // Act
        var actual = sut.DoWork();

        // Assert - assert on the fake
        A.CallTo(() => fake.Resolve<IDependency>().GetValue()).MustHaveHappened();
        Assert.AreEqual("expected value", actual);
      }
    }

    public class SystemUnderTest
    {
      private readonly IDependency dependency;

      public SystemUnderTest(IDependency strings)
      {
        this.dependency = strings;
      }

      public string DoWork()
      {
        return this.dependency.GetValue();
      }
    }

    public interface IDependency
    {
      string GetValue();
    }

Configuring Specific Dependencies
=================================

You can configure the ``AutoFake`` to provide a specific instance for a given service type (or apply any other registration behavior) by using the ``configureAction`` constructor argument, in a similar manner to configuring a new lifetime scope:

.. sourcecode:: csharp

    [Test]
    public void Test()
    {
      var dependency = new Dependency();
      using (var fake = new AutoFake(configureAction: cfg => cfg.RegisterInstance(dependency).As<IDependency>()))
      {
        // Returns your registered instance.
        var dep = fake.Resolve<IDependency>();

        // If the system under test depends on IDependency, it will get your dependency instance.
        var sut = fake.Resolve<SystemUnderTest>();

        // ...and the rest of the test.
      }
    }

You can also configure the ``AutoFake`` to provide a specific implementation type for a given service type:

.. sourcecode:: csharp

    [Test]
    public void Test()
    {
      using (var fake = new AutoFake(configureAction: cfg =>
      {
        // Configure a component type that doesn't require
        // constructor parameters.
        cfg.RegisterType<Dependency>().As<IDependency>();

        // Configure a component type that has some
        // constructor parameters passed in. Use Autofac
        // parameters in the registration.
        cfg.RegisterType<OtherDependency>().As<IOtherDependency>()
           .WithParameter(new NamedParameter("id", "service-identifier"))
           .WithParameter(new TypedParameter(typeof(Guid), Guid.NewGuid()));
      }))
      {
        // ...and the rest of the test.
      }
    }

The ``cfg`` argument passed to your callback is a regular Autofac ``ContainerBuilder`` instance, so you can do any of the registration behavior you're used to in a normal set up.

Options for Fakes
=================

You can specify options for fake creation using optional constructor parameters on ``AutoFake``:

.. sourcecode:: csharp

    using(var fake = new AutoFake(
        // Create fakes with strict behavior (unconfigured calls throw exceptions)
        strict: true,

        // Calls to fakes of abstract types will call the base methods on the abstract types
        callsBaseMethods: true,

        // Provide an action to perform upon the creation of each fake
        configureFake: f => { ... }))
    {
      // Use the fakes/run the test.
    }

Be careful when mixing these options. It makes no sense to specify ``callsBaseMethods`` with any other options, as it will override them. When both ``configureFake`` and ``strict`` are specified, the configuration supplied to ``configureFake`` will override ``strict``, as applicable.

Migrating from 7.0.0
====================

Version 8.0.0 removed the ``AutoFake.Provide<TService>(instance)`` and ``AutoFake.Provide<TService, TImplementation>()`` methods. Each ``Provide`` call started a new lifetime scope on top of the previous one, which meant any fake you resolved *before* calling ``Provide`` was a different instance than the one injected into your system under test *afterward*. Configuration applied to the earlier fake (for example, via ``A.CallTo(...)``) silently had no effect, which was a frequent source of confusing test failures.

Register your specific dependencies through the ``configureAction`` constructor argument instead. Everything is registered into a single scope before the container is built, so the instances you configure are the instances that get injected.

To migrate an instance registration, move the ``Provide`` call into ``configureAction`` and register the instance explicitly:

.. sourcecode:: csharp

    // Before (7.0.0)
    using (var fake = new AutoFake())
    {
      var dependency = A.Fake<IDependency>();
      fake.Provide(dependency);

      var sut = fake.Resolve<SystemUnderTest>();
    }

    // After (8.0.0)
    var dependency = A.Fake<IDependency>();
    using (var fake = new AutoFake(configureAction: cfg => cfg.RegisterInstance(dependency).As<IDependency>()))
    {
      var sut = fake.Resolve<SystemUnderTest>();
    }

To migrate an implementation registration, register the implementation type in ``configureAction``. Autofac parameters that you used to pass to ``Provide`` move onto the registration via ``WithParameter``:

.. sourcecode:: csharp

    // Before (7.0.0)
    using (var fake = new AutoFake())
    {
      fake.Provide<IDependency, Dependency>();
      fake.Provide<IOtherDependency, OtherDependency>(
                  new NamedParameter("id", "service-identifier"));

      var sut = fake.Resolve<SystemUnderTest>();
    }

    // After (8.0.0)
    using (var fake = new AutoFake(configureAction: cfg =>
    {
      cfg.RegisterType<Dependency>().As<IDependency>();
      cfg.RegisterType<OtherDependency>().As<IOtherDependency>()
         .WithParameter(new NamedParameter("id", "service-identifier"));
    }))
    {
      var sut = fake.Resolve<SystemUnderTest>();
    }

If you previously relied on calling ``Provide`` to read back the resolved instance, resolve it from the ``AutoFake`` after construction instead (for example, ``var dependency = fake.Resolve<IDependency>();``).

Version 8.0.0 also removed the ``builder`` constructor parameter that let you supply your own ``ContainerBuilder``. It was redundant with ``configureAction`` and bypassed the ordering ``AutoFake`` relies on when registering its fake handler. Move any registrations you performed on your own builder into the ``configureAction`` callback, which receives the ``ContainerBuilder`` that ``AutoFake`` configures and builds.
