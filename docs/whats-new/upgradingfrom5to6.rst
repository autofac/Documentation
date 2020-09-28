Upgrading from Autofac 5.x to 6.x
=================================

In the change from Autofac 5.x to 6.x, the internals of Autofac went through a major overhaul; specifically, changing to a :doc:`resolve pipeline <../advanced/pipelines>`
for executing a resolve.

While there should not be any breaking *behavioural* changes, there are some method signature and interface member changes you may need to be aware of.

We have gone out of our way to try and reduce the number of breaking changes, so the breaks are generally limited to more advanced usage scenarios
that most users shouldn't run into.

- If you have implemented a custom ``IConstructorSelector`` to pass to the ``UsingConstructor`` registration method, 
  you will need to update your implementation to use ``BoundConstructor`` instead of ``ConstructorParameterBinding``. The
  new ``BoundConstructor`` type exposes similar properties (including the ``TargetConstructor``):

  .. code-block:: csharp
     
     // v5.x
     ConstructorParameterBinding SelectConstructorBinding(ConstructorParameterBinding[] constructorBindings, IEnumerable<Parameter> parameters);

     // v6.x
     BoundConstructor SelectConstructorBinding(BoundConstructor[] constructorBindings, IEnumerable<Parameter> parameters);

- If you have implemented a custom :doc:`registration source <../advanced/registration-sources>` you will need to update the ``IRegistrationSource.RegistrationsFor`` method.

  .. code-block:: csharp
     
     // 5.x
     IEnumerable<IComponentRegistration> RegistrationsFor(Service service, Func<Service, IEnumerable<IComponentRegistration>> registrationAccessor);

     // 6.x
     IEnumerable<IComponentRegistration> RegistrationsFor(Service service, Func<Service, IEnumerable<ServiceRegistration>> registrationAccessor);

  The ``registrationAccessor`` parameter is a callback that, given a service, will return the set of registrations available for that service.

  In 6.x, the return type of this callback was changed from ``IEnumerable<IComponentRegistration>`` to ``IEnumerable<ServiceRegistration>``. 

  A ``ServiceRegistration`` encapsulates the registration (via the ``Registration`` property of the type), but also exposes the resolve pipeline Autofac needs in order to resolve
  a registration.

- If you have implemented your own ``IInstanceActivator`` (instead of relying on the built-in Autofac ones), then
  you will need to update it; instead of an ``ActivateInstance`` method to return an instance, instead the activator must implement
  a ``ConfigurePipeline``, which allows the Activator to add its own middleware to the :doc:`resolve pipeline <../advanced/pipelines>`.
 
  .. code-block:: csharp

        // 5.x
        public interface IInstanceActivator : IDisposable
        {    
            object ActivateInstance(IComponentContext context, IEnumerable<Parameter> parameters);
            Type LimitType { get; }
        }

        // 6.x
        public interface IInstanceActivator : IDisposable
        {
            void ConfigurePipeline(IComponentRegistryServices componentRegistryServices, IResolvePipelineBuilder pipelineBuilder);
            Type LimitType { get; }
        }
  

- ``RegistrationBuilder.RegistrationData`` no longer exposes the configured ``ActivatedHandlers``, ``ActivatingHandlers`` or ``PreparingHandlers``, and ``IComponentRegistration``
  no longer exposes ``Preparing``, ``Activating`` or ``Activated`` events.
  
  All Autofac events are now implemented as ``CoreEventMiddleware`` added to the resolve pipeline.

  If you need to inspect the set of event handlers added to the registration, you can inspect the registered middleware for instances of ``CoreEventMiddleware``:

  .. code-block:: csharp

    // Check if the registration has an OnActivated handler.
    if (registration.ResolvePipeline.Middleware.Any(c => c is CoreEventMiddleware ev && ev.EventType == ResolveEventType.OnActivated)) 
    {
    }

- It is no longer possible to access the set of Decorators for a registration using
  ``IComponentRegistry.DecoratorsFor``. Instead, if you need to access the set of decorators,
  (which you normally wouldn't need to) use the ``IComponentRegistry.ServiceMiddlewareFor`` method to get the middleware for a Service,
  and check for middleware that runs in the ``Decoration`` pipeline phase.

- Registrations that target a different registration, using the ``Targeting`` registration method, no longer need to specify an ``isAdapterForIndividualComponent`` parameter.

- The ``ContainerBuilder`` is now marked as ``sealed``, so it cannot be overridden. It was never expected that you would override ``ContainerBuilder``,
  but some users saw undesirable behaviour when they did.

- The constructor for ``ResolveRequest`` now takes a ``ServiceRegistration``, instead of an ``IComponentRegistration``.
