===================================================================
How do I change registrations after the container is built?
===================================================================

You don't. A container is immutable once ``Build()`` returns - ``ContainerBuilder.Update`` was obsoleted in Autofac 4.x and removed in 5.0. :doc:`The reasoning is in the best practices <../best-practices/index>`: components already resolved, singletons already cached, and auto-start components already run would all be inconsistent with the new contents.

What you almost always want instead is one of two things: decide the registration up front, or scope the difference to a child lifetime scope.

.. contents::
  :local:

Decide at Registration Time
===========================

If what varies is known when the application starts - an environment, a configuration value, a feature flag - register the variation rather than patching it in later. :doc:`The conditional registration FAQ covers the options <conditional-registration>`: configuration files, parameterized modules, and lambda registrations that make the choice as they run.

:ref:`Conditional registration <register-conditional-registration>` is worth knowing about here too. ``OnlyIf()`` and ``IfNotRegistered()`` let a registration stand down when something else has already claimed the service, which covers the "register a default unless the host supplied one" case without any need to modify the container afterward.

Register in a Child Lifetime Scope
==================================

If the difference belongs to one unit of work, one request, or one tenant, add it to a :doc:`child lifetime scope <../lifetime/working-with-scopes>` instead of the container. ``BeginLifetimeScope`` takes a configuration action, and registrations made there are visible inside that scope and nowhere else:

.. sourcecode:: csharp

    using (var scope = container.BeginLifetimeScope(builder =>
      {
        builder.RegisterInstance(currentUser).As<IUser>();
      }))
    {
      // Anything resolved here sees the extra registration.
      var service = scope.Resolve<IService>();
    }

Nothing says a scope has to be short-lived. You can create one at startup, keep it for the life of the application, and treat it as a smaller container with a specific purpose - which is precisely how :doc:`multitenant support <../advanced/multitenant>` works, with a cached scope per tenant.

Be aware that scope-level registrations do not reach back up. A ``SingleInstance`` component owned by the root container gets its dependencies from the root, so overriding one of those dependencies in a child scope will not change what the singleton already holds. :doc:`The lifetime scope documentation explains why <../lifetime/index>`.

Pass the Builder, Not the Container
===================================

If the reason you wanted to update the container is that registrations are contributed from several places during startup, pass the ``ContainerBuilder`` around instead of the built container and let each part register into it before anything calls ``Build()``. ``ContainerBuilder.Properties`` is available for carrying context between those parts, so decisions that depend on earlier registrations can still be made.

This is what the :doc:`ASP.NET Core integration <../integration/aspnetcore>` does. ``ConfigureContainer`` hands you the builder rather than the container, so the framework's registrations and yours are combined before the container exists.

If You Truly Cannot Know Up Front
=================================

Register a factory or an indirection instead of the component. A lambda registration is evaluated at resolve time, so a component that reads from mutable state you control - a settings object, a registry you own - can change behavior without the container changing. The container stays fixed while the value it produces does not.

That indirection is the supported way to get late-bound behavior, and it keeps the thing Autofac guarantees intact: what is registered when the container is built is what is registered for its lifetime.
