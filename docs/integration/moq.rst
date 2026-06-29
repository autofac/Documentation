===
Moq
===

The `Moq <https://github.com/Moq/moq4>`_ integration package allows you to automatically create mock dependencies for both concrete and mock abstract instances in unit tests using an Autofac container. You can `get the Autofac.Extras.Moq package on NuGet <https://www.nuget.org/packages/Autofac.Extras.Moq>`_.

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

When writing your unit test, use the ``Autofac.Extras.Moq.AutoMock`` class to instantiate the system under test. Doing this will automatically inject a mock dependency into the constructor for you. At the time you create the ``AutoMock`` factory, you can specify default mock behavior:

* ``AutoMock.GetLoose()`` - creates automatic mocks using loose mocking behavior.
* ``AutoMock.GetStrict()`` - creates automatic mocks using strict mocking behavior.
* ``AutoMock.GetFromRepository(repo)`` - creates mocks based on an existing configured repository.

.. sourcecode:: csharp

    [Test]
    public void Test()
    {
      using (var mock = AutoMock.GetLoose())
      {
        // The AutoMock class will inject a mock IDependency
        // into the SystemUnderTest constructor
        var sut = mock.Create<SystemUnderTest>();
      }
    }

Configuring Mocks
=================

You can configure the automatic mocks and/or assert calls on them as you would normally with Moq.

.. sourcecode:: csharp

    [Test]
    public void Test()
    {
      using (var mock = AutoMock.GetLoose())
      {
        // Arrange - configure the mock
        mock.Mock<IDependency>().Setup(x => x.GetValue()).Returns("expected value");
        var sut = mock.Create<SystemUnderTest>();

        // Act
        var actual = sut.DoWork();

        // Assert - assert on the mock
        mock.Mock<IDependency>().Verify(x => x.GetValue());
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

You can configure the ``AutoMock`` to provide a specific instance for a given service type (or apply any other registration behavior), by using the ``beforeBuild`` callback argument to ``GetLoose``, ``GetStrict`` or ``GetFromRepository``, in a similar manner to configuring a new Lifetime Scope:

.. sourcecode:: csharp

    [Test]
    public void Test()
    {
      var dependency = new Dependency();
      using (var mock = AutoMock.GetLoose(cfg => cfg.RegisterInstance(dependency).As<IDependency>()))
      {
        // Returns your registered instance.
        var dep = mock.Create<IDependency>();

        // If SystemUnderTest depends on IDependency, it will get your dependency instance.
        var underTest = mock.Create<SystemUnderTest>();

        // ...and the rest of the test.
      }
    }

The ``cfg`` argument passed to your callback is a regular Autofac ``ContainerBuilder`` instance, so you can do any of the registration behavior you're used to in a normal set up.

You can also configure the ``AutoMock`` to use any existing mock, through the ``RegisterMock`` extension method:

.. sourcecode:: csharp

    [Test]
    public void Test()
    {
      var mockA = new Mock<IServiceA>();
      mockA.Setup(x => x.RunA());

      // mockA is automatically registered as providing IServiceA
      using (var mock = AutoMock.GetLoose(cfg => cfg.RegisterMock(mockA)))
      {
        // mockA will be injected into TestComponent as IServiceA
        var component = mock.Create<TestComponent>();

        // ...and the rest of the test
      }
    }

Mixing Real Framework Services with Auto-Mocking
================================================

Be careful when adding real framework services - such as Entity Framework Core or ``Microsoft.Extensions.Logging`` - into the ``AutoMock`` container.

``AutoMock`` automatically supplies a mock for any service it cannot otherwise resolve. That includes the individual elements of an otherwise-empty collection dependency. For example, a framework that depends on ``IEnumerable<ILoggerProvider>`` would normally receive an *empty* collection when no providers are registered. Under ``AutoMock``, the empty collection instead gets a single mock element injected into it.

A loosely-mocked element returns ``null`` from any member that hasn't been explicitly set up. When a framework consumes that collection and assumes the members return non-null values, this can surface as a confusing failure deep inside the framework's own code - frequently a ``NullReferenceException`` that has nothing obviously to do with your test.

A common example is constructing an Entity Framework Core ``DbContext`` inside an ``AutoMock`` container that also has logging wired up. EF Core asks for the registered logger providers, receives the mock element whose ``CreateLogger`` returns ``null``, and then throws when it tries to use that logger.

.. note::

    You may see this behavior appear intermittently - for instance, only when tests run in a particular order. That is usually because the framework caches internal state (EF Core, for example, caches an internal service provider), which can mask the problem when a "good" code path runs first. The underlying cause is the same regardless of ordering.

If you need real framework services in your test, register concrete implementations for the services that framework consumes so ``AutoMock`` does not fill those slots with mocks. For example, provide a real logger factory (``NullLoggerFactory`` lives in the ``Microsoft.Extensions.Logging.Abstractions`` namespace):

.. sourcecode:: csharp

    using Microsoft.Extensions.Logging.Abstractions;

    using (var mock = AutoMock.GetLoose(cfg =>
      cfg.RegisterInstance(NullLoggerFactory.Instance).As<ILoggerFactory>()))
    {
      // Real logging is used instead of a mock, so frameworks that consume
      // the logger providers behave as they would outside of AutoMock.
    }

Alternatively, avoid mixing real framework wiring into the auto-mocking container - keep the auto-mock container focused on the system under test and its direct dependencies.
