=======================
Adapters and Decorators
=======================

Adapters
--------

The `adapter pattern <http://en.wikipedia.org/wiki/Adapter_pattern>`_ takes one service contract and adapts it (like a wrapper) to another.

This `introductory article <http://nblumhardt.com/2010/04/lightweight-adaptation-coming-soon/>`_ describes a concrete example of the adapter pattern and how you can work with it in Autofac.

Autofac provides built-in adapter registration so you can register a set of services and have them each automatically adapted to a different interface.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();

    // Register the services to be adapted
    builder.RegisterType<SaveCommand>()
           .As<ICommand>()
           .WithMetadata("Name", "Save File");
    builder.RegisterType<OpenCommand>()
           .As<ICommand>()
           .WithMetadata("Name", "Open File");

    // Then register the adapter. In this case, the ICommand
    // registrations are using some metadata, so we're
    // adapting Meta<ICommand> instead of plain ICommand.
    builder.RegisterAdapter<Meta<ICommand>, ToolbarButton>(
       cmd => new ToolbarButton(cmd.Value, (string)cmd.Metadata["Name"]));

    var container = builder.Build();

    // The resolved set of buttons will have two buttons
    // in it - one button adapted for each of the registered
    // ICommand instances.
    var buttons = container.Resolve<IEnumerable<ToolbarButton>>();

Decorators
----------

The `decorator pattern <http://en.wikipedia.org/wiki/Decorator_pattern>`_ is somewhat similar to the adapter pattern, where one service "wraps" another. However, in contrast to adapters, decorators expose the *same service* as what they're decorating. The point of using decorators is to add functionality to an object without changing the object's signature.

Autofac provides built-in decorator registration so you can register services and have them automatically wrapped with decorator classes.

Simplified Syntax
=================

Autofac 4.9.0 `came with a simplified decorator syntax <https://alexmg.com/posts/upcoming-decorator-enhancements-in-autofac-4-9>`_ that can be used as an alternative to the classic syntax (below). It is easier to use and has a bit more flexibility than the earlier mechanism.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();

    // Register the services to be decorated.
    builder.RegisterType<SaveCommandHandler>()
           .As<ICommandHandler>();
    builder.RegisterType<OpenCommandHandler>()
           .As<ICommandHandler>();

    // Then register the decorator. You can register multiple
    // decorators and they'll be applied in the order that you
    // register them. In this example, all ICommandHandlers
    // will be decorated with logging and diagnostics decorators.
    builder.RegisterDecorator<LoggingDecorator, ICommandHandler>();
    builder.RegisterDecorator<DiagnosticDecorator, ICommandHandler>();

    var container = builder.Build();

    // The resolved set of commands will have two items
    // in it, both of which will be wrapped in the decorators.
    var handlers = container.Resolve<IEnumerable<ICommandHandler>>();

If you don't know the type up front, you can manually specify instead of using the generic:

.. sourcecode:: csharp

    builder.RegisterDecorator(typeof(LoggingDecorator), typeof(ICommandHandler));
    builder.RegisterDecorator(typeof(DiagnosticDecorator), typeof(ICommandHandler));

If you want to manually instantiate your decorators or do more complex decorator creation, that's also possible.

.. sourcecode:: csharp

    builder.RegisterDecorator<ICommandHandler>(
      (context, parameters, instance) => new ComplexDecorator(instance)
    );

In the lambda, ``context`` is the ``IComponentContext`` in which the resolution is happening (so you could resolve other things if needed); ``parameters`` is an ``IEnumerable<Parameter>`` with all the parameters passed in; and ``instance`` is the service instance being decorated. Keep in mind that if you have multiple decorators being chained, ``instance`` may be a *decorator instance* rather than the root/base thing being decorated.

Decoration is supported on open generics.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();

    // Register the open generic to be decorated.
    builder.RegisterGeneric(typeof(CommandHandler<>)
           .As(ICommandHandler<>);

    // Then register the decorator. You can register multiple
    // decorators and they'll be applied in the order that you
    // register them. In this example, all ICommandHandler<T> instances
    // will be decorated with logging and diagnostics decorators.
    builder.RegisterGenericDecorator(typeof(LoggingDecorator<>), typeof(ICommandHandler<>));
    builder.RegisterGenericDecorator(typeof(DiagnosticDecorator<>), typeof(ICommandHandler<>));

    var container = builder.Build();

    // The resolved handler will be wrapped in both decorators.
    var handler = container.Resolve<ICommandHandler<Save>>();

Decoration can be conditional. A context object is provided to registrations that allows you to decide whether or not to apply the decorator:

.. sourcecode:: csharp

    // Only add the error handler decorator to the command handler if
    // there are no other decorators applied.
    builder.RegisterDecorator<ErrorHandlerDecorator, ICommandHandler>(
      context => !context.AppliedDecorators.Any());
    builder.RegisterGenericDecorator(
      typeof(ErrorHandlerDecorator<>),
      typeof(ICommandHandler<>),
      context => !context.AppliedDecorators.Any());

The ``context`` in those lambdas is an ``IDecoratorContext`` with information about the list of applied decorators, the actual service type being resolved, and more.

You can use that context to make decisions in your decorators if you want. It can be injected into your decorator as a constructor parameter.

.. sourcecode:: csharp

    public class ErrorHandlerDecorator : ICommandHandler
    {
      private readonly ICommandHandler _decorated;
      private readonly IDecoratorContext _context;

      public ErrorHandlerDecorator(ICommandHandler decorated, IDecoratorContext context)
      {
        this._decorated = decorated ?? throw new ArgumentNullException(nameof(decorated));
        this._context = context ?? throw new ArgumentNullException(nameof(context));
      }

      public void HandleCommand(Command command)
      {
        if(this._context.ImplementationType.GetCustomAttribute<SkipHandlingAttribute>() != null)
        {
          // run the command without handling the errors
        }
        else
        {
          // add the special error handling logic
        }
      }
    }

**You cannot specify a lifetime scope on a decorator.** The lifetime of a decorator is tied to the lifetime of the thing it decorates. The service and all decorators get disposed at the same time. If you decorate a singleton, all the decorators are also going to be singletons. If you decorate something that's instance per request (e.g., in a web app) the decorators will also live for the whole request.

Classic Syntax
==============

The "classic syntax" has been around since Autofac 2.4 and still works today. It's more complicated than the newer syntax but if you have some existing code that uses it, that code will continue to work.

This `article <http://nblumhardt.com/2011/01/decorator-support-in-autofac-2-4/>`_ has some details about how decorators work in Autofac.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();

    // Register the services to be decorated. You have to
    // name them rather than register them As<ICommandHandler>()
    // so the *decorator* can be the As<ICommandHandler>() registration.
    builder.RegisterType<SaveCommandHandler>()
           .Named<ICommandHandler>("handler");
    builder.RegisterType<OpenCommandHandler>()
           .Named<ICommandHandler>("handler");

    // Then register the decorator. The decorator uses the
    // named registrations to get the items to wrap.
    builder.RegisterDecorator<ICommandHandler>(
        (c, inner) => new CommandHandlerDecorator(inner),
        fromKey: "handler");

    var container = builder.Build();

    // The resolved set of commands will have two items
    // in it, both of which will be wrapped in a CommandHandlerDecorator.
    var handlers = container.Resolve<IEnumerable<ICommandHandler>>();

You can also use open generic decorator registrations.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();

    // Register the open generic with a name so the
    // decorator can use it.
    builder.RegisterGeneric(typeof(CommandHandler<>))
           .Named("handler", typeof(ICommandHandler<>));

    // Register the generic decorator so it can wrap
    // the resolved named generics.
    builder.RegisterGenericDecorator(
            typeof(CommandHandlerDecorator<>),
            typeof(ICommandHandler<>),
            fromKey: "handler");

    var container = builder.Build();

    // You can then resolve closed generics and they'll be
    // wrapped with your decorator.
    var mailHandlers = container.Resolve<IEnumerable<ICommandHandler<EmailCommand>>>();

If you are using decorators on a WCF service implementation class, :doc:`there is some additional information on the WCF integration page about some special considerations. <../integration/wcf>`
