====================
Registration Sources
====================

A *registration source* is a way to dynamically feed registrations into an Autofac component context (e.g., container or lifetime scope).

Registration sources are created by implementing the ``IRegistrationSource`` interface. Many of the Autofac features are implemented this way - for example, the :doc:`implicit relationship types <../resolve/relationships>` are added via registration sources. (You didn't think we actually registered every single type of collection manually into the container, did you?) `Nick Blumhardt has a great blog article about how this works. <http://nblumhardt.com/2010/01/declarative-context-adapters-autofac2/>`_

Registration sources are great when you don't have a finite set of registrations you can add to a container. Many times, :doc:`assembly scanning <../register/scanning>` and/or :doc:`use of modules <../configuration/modules>` can address dynamic registration concerns... but when all else fails or those means don't accomplish what you're looking to do, a registration source may be the way to go.

"Any Concrete Type Not Already Registered" Source
=================================================
The ``AnyConcreteTypeNotAlreadyRegisteredSource``, or "ACTNARS" as we call it, is an example of a registration source that Autofac ships with that allows you to resolve any concrete type from the Autofac container regardless of whether or not you specifically registered it. People moving from other inversion-of-control containers may be used to this sort of behavior, so ACTNARS is a way to bridge that gap.

You can use the ``Autofac.Features.ResolveAnything.AnyConcreteTypeNotAlreadyRegisteredSource`` by adding it to your container.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterSource(new AnyConcreteTypeNotAlreadyRegisteredSource());
    var container = builder.Build();

Contravariant Registration Source
=================================
The ``ContravariantRegistrationSource`` is helpful in registering types that need to be later resolved in a `contravariant context <https://docs.microsoft.com/en-us/dotnet/standard/generics/covariance-and-contravariance>`_ (using a more generic / less derived type than originally specified). This is common in handler patterns:

.. sourcecode:: csharp

    public interface IHandler<in TCommand>
    {
      void Handle(TCommand command);
    }

    public class CommandAHandler : IHandler<CommandA>
    {
      public void Handle(CommandA command)
      {
      }
    }

    public class CommandA
    {
    }

    public class CommandB : CommandA
    {
    }

    var builder = new ContainerBuilder();
    builder.RegisterSource(new ContravariantRegistrationSource());
    builder.RegisterType<CommandAHandler>().As<IHandler<CommandA>>();
    var container = builder.Build();

    // a and b are both CommandAHandler.
    var a = container.Resolve<IHandler<CommandA>>();
    var b = container.Resolve<IHandler<CommandB>>();


Implementing a Registration Source
==================================

The best way to show how to implement a registration source is through a simple example.

Let's say you have a factory that is responsible for generating some sort of event handler class. You need to generate them through the factory rather than through Autofac, so you don't have the handlers themselves registered with Autofac. At the same time, there's not a good way to say "when a person asks for any event handler, generate it through this special factory." This is a great example of where a registration source can come in handy.

For the example, let's define a simple event handler base/abstract class and a couple of implementations.

.. sourcecode:: csharp

    public abstract class BaseHandler
    {
      public virtual string Handle(string message)
      {
        return "Handled: " + message;
      }
    }

    public class HandlerA : BaseHandler
    {
      public override string Handle(string message)
      {
        return "[A] " + base.Handle(message);
      }
    }

    public class HandlerB : BaseHandler
    {
      public override string Handle(string message)
      {
        return "[B] " + base.Handle(message);
      }
    }

Now let's create a factory interface and implementation.

.. sourcecode:: csharp

    public interface IHandlerFactory
    {
      T GetHandler<T>() where T : BaseHandler;
    }

    public class HandlerFactory : IHandlerFactory
    {
      public T GetHandler<T>() where T : BaseHandler
      {
        return (T)Activator.CreateInstance(typeof(T));
      }
    }

Finally, let's create a couple of consuming classes that use the handlers.

.. sourcecode:: csharp

  public class ConsumerA
  {
    private HandlerA _handler;
    public ConsumerA(HandlerA handler)
    {
      this._handler = handler;
    }

    public void DoWork()
    {
      Console.WriteLine(this._handler.Handle("ConsumerA"));
    }
  }


  public class ConsumerB
  {
    private HandlerB _handler;
    public ConsumerB(HandlerB handler)
    {
      this._handler = handler;
    }

    public void DoWork()
    {
      Console.WriteLine(this._handler.Handle("ConsumerB"));
    }
  }

Now that we have the services and the consumers, let's make a registration source. In the example source, we'll...

1. Determine if the resolve operation is asking for a ``BaseHandler`` type or not. If it's not, the source won't provide any registration to satisfy the resolve request.
2. Build up the dynamic registration for the specific type of ``BaseHandler`` derivative being requested, which will include the lambda that invokes the provider/factory to get the instance.
3. Return the dynamic registration to the resolve operation so it can do the work.

Here's the code for the registration source.

.. sourcecode:: csharp

    using Autofac;
    using Autofac.Core;
    using Autofac.Core.Activators.Delegate;
    using Autofac.Core.Lifetime;
    using Autofac.Core.Registration;

    public class HandlerRegistrationSource : IRegistrationSource
    {
      public IEnumerable<IComponentRegistration> RegistrationsFor(
        Service service,
        Func<Service, IEnumerable<ServiceRegistration>> registrationAccessor)
      {
        var swt = service as IServiceWithType;
        if(swt == null || !typeof(BaseHandler).IsAssignableFrom(swt.ServiceType))
        {
          // It's not a request for the base handler type, so skip it.
          return Enumerable.Empty<IComponentRegistration>();
        }

        // This is where the magic happens!
        var registration = new ComponentRegistration(
          Guid.NewGuid(),
          new DelegateActivator(swt.ServiceType, (c, p) =>
            {
              // In this example, the factory itself is assumed to be registered
              // with Autofac, so we can resolve the factory. If you want to hard
              // code the factory here, you can do that, too.
              var provider = c.Resolve<IHandlerFactory>();

              // Our factory interface is generic, so we have to use a bit of
              // reflection to make the call.
              var method = provider.GetType().GetMethod("GetHandler").MakeGenericMethod(swt.ServiceType);

              // In the end, return the object from the factory.
              return method.Invoke(provider, null);
            }),
          new CurrentScopeLifetime(),
          InstanceSharing.None,
          InstanceOwnership.OwnedByLifetimeScope,
          new [] { service },
          new Dictionary<string, object>());

        return new IComponentRegistration[] { registration };
      }

      public bool IsAdapterForIndividualComponents { get{ return false; } }
    }

The last step is to register everything with Autofac - the registration source, the factory, and the consuming classes. Notice, though, that we don't have to register the actual handlers themselves because the registration source takes care of that.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<HandlerFactory>().As<IHandlerFactory>();
    builder.RegisterSource(new HandlerRegistrationSource());
    builder.RegisterType<ConsumerA>();
    builder.RegisterType<ConsumerB>();
    var container = builder.Build();

Now when you resolve one of your handler consumers, you'll get the correct handler.

.. sourcecode:: csharp

    using(var scope = container.BeginLifetimeScope())
    {
      var consumer = scope.Resolve<ConsumerA>();

      // Calling this will yield the following output on the console:
      // [A] Handled: ConsumerA
      consumer.DoWork();
    }
