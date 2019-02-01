====================
Captive Dependencies
====================

A "captive dependency" occurs when a component intended to live for a *short* amount of time gets held by a component that lives for a *long* time. `This blog article from Mark Seemann <http://blog.ploeh.dk/2014/06/02/captive-dependency/>`_ does a good job of explaining the concept.

**Autofac does not necessarily prevent you from creating captive dependencies.** You may find times when you get a resolution exception because of the way a captive is set up, but you won't always. Stopping captive dependencies is the responsibility of the developer.

General Rule
============

The general rule to avoid captive dependencies:

**The lifetime of the consuming component should be less than or equal to the lifetime of the service being consumed.**

Basically, don't let a singleton take an instance-per-request dependency because it'll be held too long.

Simple Example
==============

Say you have a web application that uses some information from the inbound request to determine the right database to which a connection should be made. You might have the following components:

- A *repository* that takes in the current request and a database connection factory.
- The *current request* like an ``HttpContext`` that could be used to help decide the business logic.
- The *database connection factory* that takes some sort of parameter and returns the right database connection.

In this example, consider the :doc:`lifetime scope <instance-scope>` that you'd want to use for each component. The current request context is an obvious one - you want *instance-per-request*. What about the others?

For the *repository*, say you choose "singleton." A singleton gets created one time and cached for the life of the application. If you choose "singleton," the request context will be passed in and held for the life of the application - even after that current request is over, the stale request context will be held. The repository is long-lived, but holds on to a shorter-life component. **That's a captive dependency.**

However, say you make the repository "instance-per-request" - now it lives as long as the current request and no longer. That's exactly as long as the request context it needs, so now it's not a captive. Both the repository and the request context will be released at the same time (at the end of the request) and everything will be fine.

Taking it a step further, say you make the repository "instance-per-dependency" so you get a new one every time. This is still OK because it is intended to live for a *shorter* time than the current request. It won't hold onto the request for too long, so there's no captive.

The database connection factory goes through a similar thought process, but may have some different considerations. Maybe the factory is expensive to instantiate or needs to maintain some internal state to work correctly. You may not want it to be "instance-per-request" or "instance-per-dependency." You may actually need it to be a singleton.

**It's OK for shorter-lived dependencies to take on longer-lived dependencies.** If your repository is "instance-per-request" or "instance-per-dependency" you'll still be good. The database connection factory intentionally lives longer.

Code Example
============

Here's a unit test that shows what it looks like to forcibly create a captive dependency. In this example, a "rule manager" is used to deal with a set of "rules" that get used through an application.

.. sourcecode:: csharp

        public class RuleManager
        {
          public RuleManager(IEnumerable<IRule> rules)
          {
              this.Rules = rules;
          }

          public IEnumerable<IRule> Rules { get; private set; }
        }

        public interface IRule { }

        public class SingletonRule : IRule { }

        public class InstancePerDependencyRule : IRule { }


        [Fact]
        public void CaptiveDependency()
        {
            var builder = new ContainerBuilder();

            // The rule manager is a single-instance component. It
            // will only ever be instantiated one time and the cached
            // instance will be used thereafter. It will be always be resolved
            // from the root lifetime scope (the container) because
            // it needs to be shared.
            builder.RegisterType<RuleManager>()
                   .SingleInstance();

            // This rule is registered instance-per-dependency. A new
            // instance will be created every time it's requested.
            builder.RegisterType<InstancePerDependencyRule>()
                   .As<IRule>();

            // This rule is registered as a singleton. Like the rule manager
            // it will only ever be resolved one time and will be resolved
            // from the root lifetime scope.
            builder.RegisterType<SingletonRule>()
                   .As<IRule>()
                   .SingleInstance();

            using (var container = builder.Build())
            using (var scope = container.BeginLifetimeScope("request"))
            {
              // The manager will be a singleton. It will contain
              // a reference to the singleton SingletonRule, which is
              // fine. However, it will also hold onto an InstancePerDependencyRule
              // which may not be OK. The InstancePerDependencyRule that it
              // holds will live for the lifetime of the container inside the
              // RuleManager and will last until the container is disposed.
              var manager = scope.Resolve<RuleManager>();
            }
        }

Note the example above doesn't directly show it, but if you were to dynamically add registrations for rules in the ``container.BeginLifetimeScope()`` call, those dynamic registrations *would not be included* in the resolved ``RuleManager``. The ``RuleManager``, being a singleton, gets resolved from the root container where the dynamically added registrations don't exist.

Another code example shows how you may get an exception when creating a captive dependency that ties incorrectly to a child lifetime scope.

.. sourcecode:: csharp

        public class RuleManager
        {
          public RuleManager(IEnumerable<IRule> rules)
          {
              this.Rules = rules;
          }

          public IEnumerable<IRule> Rules { get; private set; }
        }

        public interface IRule { }

        public class SingletonRule : IRule
        {
          public SingletonRule(InstancePerRequestDependency dep) { }
        }

        public class InstancePerRequestDependency : IRule { }


        [Fact]
        public void CaptiveDependency()
        {
            var builder = new ContainerBuilder();

            // Again, the rule manager is a single-instance component,
            // resolved from the root lifetime and cached thereafter.
            builder.RegisterType<RuleManager>()
                   .SingleInstance();

            // This rule is registered as a singleton. Like the rule manager
            // it will only ever be resolved one time and will be resolved
            // from the root lifetime scope.
            builder.RegisterType<SingletonRule>()
                   .As<IRule>()
                   .SingleInstance();

            // This rule is registered on a per-request basis. It only exists
            // during the request.
            builder.RegisterType<InstancePerRequestDependency>()
                   .As<IRule>()
                   .InstancePerMatchingLifetimeScope("request");

            using (var container = builder.Build())
            using (var scope = container.BeginLifetimeScope("request"))
            {
              // PROBLEM: When the SingletonRule is resolved as part of the dependency
              // chain for the rule manager, the InstancePerRequestDependency in
              // the rule constructor will fail to be resolved because the rule
              // is coming from the root lifetime scope but the InstancePerRequestDependency
              // doesn't exist there.
              Assert.Throws<DependencyResolutionException>(() => scope.Resolve<RuleManager>());
            }
        }


Exception to the Rule
=====================

Given the developer of the application is ultimately responsible for determining whether captives are OK or not, the developer may determine that it's acceptable for a singleton, for example, to take an "instance-per-dependency" service.

For example, maybe you have a caching class that is intentionally set up to cache things for only the lifetime of the consuming component. If the consumer is a singleton, the cache can be used to store things for the whole app lifetime; if the consumer is "instance-per-request" then it only stores data for a single web request. In a case like that, you may end up with a longer-lived component taking a dependency on a shorter-lived component *intentionally*.

This is acceptable as long as the application developer understands the consequences of setting things up with such lifetimes. Which is to say, if you're going to do it, do it intentionally rather than accidentally.
