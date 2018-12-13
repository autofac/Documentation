=====================================
Managed Extensibility Framework (MEF)
=====================================

The Autofac MEF integration allows you to expose extensibility points in your applications using the `Managed Extensibility Framework <https://msdn.microsoft.com/en-us/library/dd460648(VS.100).aspx>`_.

To use MEF in an Autofac application, you must reference the .NET framework ``System.ComponentModel.Composition.dll`` assembly and get the `Autofac.Mef <https://www.nuget.org/packages/Autofac.Mef/>`_ package from NuGet.

**Note this is a one-way operation** MEF integration allows Autofac to resolve items that were registered in MEF, but it doesn't allow MEF to resolve items that were registered in Autofac.

Consuming MEF Extensions in Autofac
===================================

The Autofac/MEF integration allows MEF catalogs to be registered with the ``ContainerBuilder``, then use the ``RegisterComposablePartCatalog()`` extension method.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    var catalog = new DirectoryCatalog(@"C:\MyExtensions");
    builder.RegisterComposablePartCatalog(catalog);

All MEF catalog types are supported:

* ``TypeCatalog``
* ``AssemblyCatalog``
* ``DirectoryCatalog``

Once MEF catalogs are registered, exports within them can be resolved through the Autofac container or by injection into other components. For example, say you have a class with an export type defined using MEF attributes:

.. sourcecode:: csharp

    [Export(typeof(IService))]
    public class Component : IService { }

Using MEF catalogs, you can register that type. Autofac will find the exported interface and provide the service.

.. sourcecode:: csharp

    var catalog = new TypeCatalog(typeof(Component));
    builder.RegisterComposablePartCatalog(catalog);
    var container = builder.Build();

    // The resolved IService will be implemented
    // by type Component.
    var obj = container.Resolve<IService>();

Providing Autofac Components to MEF Extensions
==============================================

Autofac components aren't automatically available for MEF extensions to import. Which is to say, if you use Autofac to resolve a component that was registered using MEF, only other services registered using MEF will be allowed to satisfy its dependencies.

To provide an Autofac component to MEF, the ``Exported()`` extension method must be used:

.. sourcecode:: csharp

    builder.RegisterType<Component>()
           .Exported(x => x.As<IService>().WithMetadata("SomeData", 42));

Again, this is a one-way operation. It allows Autofac to provide dependencies to MEF components that are registered within Autofac - it doesn't export Autofac registrations to be resolved from a MEF catalog.

Using Metadata
==============

Autofac MEF integration adds the ``Lazy<T, TMetadata>`` relationship support to the already existing ``Lazy<T>`` support.

For example, say you have an interface defining metadata like this:

.. sourcecode:: csharp

    public interface IAgeMetadata
    {
        int Age { get; }
    }

You can register Autofac services and use the ``Lazy<T, TMetadata>`` relationship by adding the MEF metadata registration sources:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();

    // This adds the MEF relationship registration sources.
    builder.RegisterMetadataRegistrationSources();

    builder.RegisterType<Component>()
           .WithMetadata<IAgeMetadata>(m => m.For(value => value.Age, 42));
    var container = builder.Build();

You can then resolve a ``Lazy<T, TMetadata>`` from that:

.. sourcecode:: csharp

    using (var scope = container.BeginLifetimeScope())
    {
      var lazy = scope.Resolve<Lazy<Component, IAgeMetadata>>();

      // lazy.Metadata.Age == 42
    }

**KNOWN ISSUE**: If you have a MEF ``[Imports]`` over a ``Lazy<T, TMetadata>`` value, the object ``T`` is **not lazy instantiated** at this time. `There is an issue filed for this on the Autofac.Mef repo. <https://github.com/autofac/Autofac.Mef/issues/1>`_ If you're looking to help, we'd love a PR for it!

Known Issues / Gotchas
======================

* **MEF integration with Autofac is one-way.** It does not allow MEF composition containers access to things registered in Autofac. Instead, it basically takes MEF registration semantics and helps populate an Autofac container. You are expected to resolve things from Autofac after that, not from a MEF container.
* **Lazy metadata imports don't work.** If you have a MEF ``[Imports]`` over a ``Lazy<T, TMetadata>`` value, the object ``T`` is **not lazy instantiated** at this time. `There is an issue filed for this on the Autofac.Mef repo. <https://github.com/autofac/Autofac.Mef/issues/1>`_
* **Open generic exports are not supported.** If you have an attribute like ``[Export(typeof(A<>))`` on a MEF component, Autofac will not properly handle that export and resolving objects of that type will fail. `There is an issue `There is an issue filed for this on the Autofac.Mef repo. <https://github.com/autofac/Autofac.Mef/issues/4>`_