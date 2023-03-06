==================
Delegate Factories
==================

Out of the box, Autofac supports the ``Func<T>`` and ``Func<X,Y,T>`` :doc:`implicit relationships <../resolve/relationships>`. If you need to have an automatically generated factory to resolve something at runtime, these are the easiest way to go.

One drawback to the automatically generated factories is that :doc:`they don't support multiple parameters of the same type <../resolve/relationships>`. Further, there are times when you may want to provide a specific delegate type for the factory rather than using ``Func<X,Y,T>`` and hoping folks always get the parameters right.

In cases like these, it may be better to consider delegate factories.

**Lifetime scopes are respected** using delegate factories as well as when using ``Func<T>`` or the parameterized ``Func<X,Y,T>`` relationships. If you register an object as ``InstancePerDependency()`` and call the delegate factory multiple times, you'll get a new instance each time. However, if you register an object as ``SingleInstance()`` and call the delegate factory to resolve the object more than once, you will get *the same object instance every time regardless of the different parameters you pass in.* Just passing different parameters will not break the respect for the lifetime scope.

Through this page we'll use an example of a stock portfolio where different shares are held and may need to retrieve current quotes from a remote service.

Create a Delegate
=================

The first step in setting up a delegate factory is to create a delegate that will be used to dynamically resolve values from a lifetime scope. This will be used in place of the ``Func<T>`` or ``Func<X,Y,T>`` implicit relationship.

Here you see an individual shareholding - one stock held with a quantity. Instead of having consumers directly instantiate this class, we're going to use a delegate factory.

.. sourcecode:: csharp

    public class Shareholding
    {
      // Note both the TYPES and NAMES in the delegate match
      // the parameters in the constructor. This is important!
      public delegate Shareholding Factory(string symbol, uint holding);

      public Shareholding(string symbol, uint holding)
      {
        Symbol = symbol;
        Holding = holding;
      }

      public string Symbol { get; private set; }

      public uint Holding { get; set; }
    }

The ``Shareholding`` class declares a constructor, but also provides a delegate type that can be used to create ``Shareholding`` instances indirectly by resolving them from a lifetime scope.

Autofac can make use of this to automatically generate a factory:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<Shareholding>();
    using var container = builder.Build();
    using var scope = container.BeginLifetimeScope();
    var createHolding = scope.Resolve<Shareholding.Factory>();

    // 1234 shares of "ABC"
    var holding = createHolding("ABC", 1234);

The factory is a standard delegate that can be called with ``Invoke()`` or with the function syntax as shown above..

**By default, Autofac matches the parameters of the delegate to the parameters of the constructor by name.** If you use the generic ``Func`` relationships, Autofac will switch to matching parameters by type. The name matching is important here - it allows you to provide multiple parameters of the same type if you want, which isn't something the ``Func`` implicit relationships can support. However, it also means that **if you change the names of parameters in the constructor, you also have to change those names in the delegate.**

Consume the Delegate
====================

Once you've registered the factory, other components can consume it.

.. sourcecode:: csharp

    public class Portfolio
    {
      private readonly Shareholding.Factory _shareHoldingFactory;

      private readonly List<Shareholding> _holdings = new List<Shareholding>();

      public Portfolio(Shareholding.Factory shareholdingFactory)
      {
        _shareHoldingFactory = shareholdingFactory;
      }

      public void Add(string symbol, uint holding)
      {
        _holdings.Add(_shareHoldingFactory(symbol, holding));
      }
    }

To wire this up, the ``Portfolio`` class would be registered with the container before building using:

.. sourcecode:: csharp

    builder.RegisterType<Portfolio>();

You can then request an instance of ``Portfolio`` from a lifetime scope:

.. sourcecode:: csharp

    var portfolio = scope.Resolve<Portfolio>();
    portfolio.Add("DEF", 4324);

Add Resolved Constructor Parameters
===================================

This is the big payoff for using delegate factories: you can add more constructor parameters that get resolved from the lifetime scope without affecting the delegate!

Imagine a remote stock quoting service:

.. sourcecode:: csharp

    public interface IQuoteService
    {
      decimal GetQuote(string symbol);
    }

As part of the ``Shareholding`` class, we want to calculate the current value of the stock by getting a quote. We can add a dependency on an ``IQuoteService`` in the ``Shareholding`` class that will be automatically filled in by Autofac - and **you don't have to add it to the delegate**! We can then add a ``CurrentValue()`` method to use the new service.

.. sourcecode:: csharp

    public class Shareholding
    {
      // We don't have to add the quote service to the factory delegate.
      public delegate Shareholding Factory(string symbol, uint holding);

      private readonly IQuoteService _quoteService;

      // Parameters in the constructor that don't show up in
      // the delegate will come from the appropriate lifetime scope.
      public Shareholding(string symbol, uint holding, IQuoteService quoteService)
      {
        Symbol = symbol;
        Holding = holding;
        _quoteService = quoteService;
      }

      public string Symbol { get; private set; }

      public uint Holding { get; set; }

      public decimal CurrentValue()
      {
        // We can use the new service to get the current value.
        return _quoteService.GetQuote(Symbol) * Holding;
      }
    }

An implementor of ``IQuoteService`` should also be registered with the container:

.. sourcecode:: csharp

    builder.RegisterType<WebQuoteService>().As<IQuoteService>();

The ``Portfolio`` class can now take advantage of the new ``CurrentValue()`` method without knowing anything about the quote service.

.. sourcecode:: csharp

    public class Portfolio
    {
      private readonly Shareholding.Factory _shareHoldingFactory;

      private readonly List<Shareholding> _holdings = new List<Shareholding>();

      public Portfolio(Shareholding.Factory shareholdingFactory)
      {
        _shareHoldingFactory = shareholdingFactory;
      }

      public void Add(string symbol, uint holding)
      {
        // Note we don't have to pass in a quote service - Autofac
        // will fill that in automatically from the lifetime scope.
        _holdings.Add(_shareHoldingFactory(symbol, holding));
      }

      public decimal CurrentValue()
      {
        // We can use the new method to get the current value
        // of the complete portfolio.
        return _holdings.Aggregate(0m, (agg, holding) => agg + holding.CurrentValue());
      }
    }

Lifetime Scopes and Disposal
============================

Just as with the ``Func<T>`` relationships or calling ``Resolve<T>()`` directly, using delegate factories is resolving something from a lifetime scope. If the thing you're resolving is disposable, :doc:`the lifetime scope will track it and dispose of it when the scope is disposed <../lifetime/disposal>`. Resolving directly from the container or from a very long-lived lifetime scope when using disposable components may result in a memory leak as the scope holds references to all the disposable components resolved.

RegisterGeneratedFactory (Obsolete)
===================================

.. important::

    ``RegisterGeneratedFactory`` is now marked as obsolete as of Autofac 7.0. Delegate factories and the :doc:`function relationships <../resolve/relationships>` have superseded this feature.

The now-obsolete way to handle a loosely coupled scenario where the parameters are matched on type was through the use of ``RegisterGeneratedFactory()``. This worked very similar to delegate factories but required an explicit registration operation.

.. sourcecode:: csharp

    public delegate DuplicateTypes FactoryDelegate(int a, int b, string c);

Then register that delegate using ``RegisterGeneratedFactory()``:

.. sourcecode:: csharp

    builder.RegisterType<DuplicateTypes>();
    builder.RegisterGeneratedFactory<FactoryDelegate>(new TypedService(typeof(DuplicateTypes)));

Now the function will work:

.. sourcecode:: csharp

    var func = scope.Resolve<FactoryDelegate>();
    var obj = func(1, 2, "three");
