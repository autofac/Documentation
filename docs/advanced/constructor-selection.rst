============================
Custom Constructor Selection
============================

Most of the time, when :ref:`registering reflection components <register-registration-reflection-components>`, choosing the correct constructor to use can be safely left up to Autofac, or if required, a explicit constructor can be specified against the registration with ``UsingConstructor``.

For advanced use-cases, you can implement custom behaviour to choose both the set of available constructors for a type, and which one to use of the available set.

FindConstructorsWith & IConstructorFinder
-----------------------------------------

The ``FindConstructorsWith`` method on a registration allows you to specify how to determine the set of *available* constructors for a registration, either using a delegate to retrieve constructors from the ``Type``:

.. sourcecode:: csharp

  // Find all private/internal constructors as well as public
  builder.RegisterType<ComponentWithInternalConstructors>()
         .FindConstructorsWith(type => type.GetDeclaredConstructors());

or by implementing ``IConstructorFinder``, which makes it easier to cache the found constructors for performance purposes:

.. sourcecode:: csharp

  public class AllConstructorsFinder : IConstructorFinder
  {
      private static readonly ConcurrentDictionary<Type, ConstructorInfo[]> ConstructorCache = new();

      public ConstructorInfo[] FindConstructors(Type targetType)
      {
          var retval = ConstructorCache.GetOrAdd(targetType, t => t.GetDeclaredConstructors());

          if (retval.Length == 0)
          {
              throw new NoConstructorsFoundException(targetType);
          }

          return retval;
      }
  }

  // When registering...
  builder.RegisterType<ComponentWithInternalConstructors>()
         .FindConstructorsWith(new AllConstructorsFinder());

.. note:: In the case of open generic registrations, the ``Type`` passed to either the ``FindConstructorsWith`` delegate or ``IConstructorFinder`` will be that of the *concrete* type, not the generic.

IConstructorSelector
--------------------

Once the set of available constructors has been determined, each time the component is resolved, one of those constructors must be *selected*.

If there's only one available constructor, we just use that one, but if there's more than one available constructor, we have to decide which constructor is most suitable.

For this, we can implement the ``IConstructorSelector`` interface. Autofac's default implementation of this interface (``MostParametersConstructorSelector``) chooses the constructor with the most parameters that are able to be obtained from the container at the time of resolve.

You can use a custom implementation of ``IConstructorSelector`` when the default Autofac behaviour is not suitable.

Here's an abstract example of a constructor selector that allows a parameter to force use of the 'first' constructor.

.. sourcecode:: csharp

    public class FirstConstructorOverrideSelector : IConstructorSelector
    {
        private IConstructorSelector _autofacDefault = new MostParametersConstructorSelector();

        public BoundConstructor SelectConstructorBinding(BoundConstructor[] constructorBindings, IEnumerable<Parameter> parameters)
        {
            if (parameters.Any(x => x is ConstantParameter p && string.Equals(p.Value, "use-first")))
            {
                return constructorBindings.First();
            }

            return _autofacDefault.SelectConstructorBinding(constructorBindings, parameters);
        }
    }

You then register the selector against the component:

.. sourcecode:: csharp

    builder.RegisterType<MyComponent>()
           .UsingConstructor(new FirstConstructorOverrideSelector());

.. note:: Implementations of ``IConstructorSelector`` are *only* invoked if a given component has more than one available constructor.