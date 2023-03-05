AssemblyLoadContext and Lifetime Scopes
=======================================

In .NET Core and .NET 5+, the `the AssemblyLoadContext was introduced <https://learn.microsoft.com/en-us/dotnet/core/dependency-loading/understanding-assemblyloadcontext>`_.

This allowed developers to dynamically load and unload assemblies from their application, and is very useful for developers writing applications with plugin-based architectures.

In order to unload the assemblies in an ``AssemblyLoadContext`` when a plugin is no longer needed, and reclaim the memory required by that plugin, no references to types in that assembly can be held by anything outside the loaded context. This includes Autofac, which by default holds a variety of internal references and caches for types that have been registered.

As of Autofac 7.0, we've added support for indicating to Autofac that a given lifetime scope represents types loaded for a given ``AssemblyLoadContext``; when a lifetime scope created for a specific ``AssemblyLoadContext`` is unloaded, Autofac will make a *best-effort* attempt to remove all references we hold for types from the loaded context, to allow the ``AssemblyLoadContext`` to be unloaded.

You indicate that a lifetime scope is for an ``AssemblyLoadContext`` with the new ``BeginLoadContextLifetimeScope`` method. Here's a full example:

.. sourcecode:: csharp

    //
    // In PluginDefinition project.
    //

    public interface IPlugin
    {
      void DoSomething();
    }

    //
    // In MyPlugin project.
    //

    public class MyPlugin : IPlugin
    {
        public void DoSomething()
        {
          Console.WriteLine("Hello World");
        }
    }

    //
    // In the application.
    //

    var builder = new ContainerBuilder();

    // Components defined in the "Default" load context will be available in load context lifetime scopes.
    builder.RegisterType<DefaultComponent>();

    var container = builder.Build();

    var loadContext = new AssemblyLoadContext("PluginContext", isCollectible: true);

    using (var scope = container.BeginLoadContextLifetimeScope(loadContext, builder =>
    {
      var pluginAssembly = loadContext.LoadFromAssemblyPath("plugins/MyPlugin.dll");

      builder.RegisterAssemblyTypes(pluginAssembly);
    }))
    {
      // Because of default load context behaviour, because we have already loaded
      // PluginDefinition into the *application* so we can reference IPlugin, the loaded MyPlugin assembly
      // will share the same type.
      var plugin = scope.Resolve<IPlugin>();

      plugin.DoSomething();
    }

    loadContext.Unload();

.. note::

  If you capture a reference to any resolved components, or any types in the loaded assembly, outside Autofac it's highly likely you won't be able to unload your load context.

  AssemblyLoadContexts are tricky to use in such a way that unloading is guaranteed every time (whether using Autofac or not). See the dotnet documentation on `troubleshooting unloadability <https://learn.microsoft.com/en-us/dotnet/standard/assembly/unloadability#troubleshoot-unloadability-issues>`_ if you run into problems.

You can create additional lifetime scopes from your "load context scope" using the regular `BeginLifetimeScope` method, without needing to further track your load context.

That means you can load a plugin, then the plugin can resolve `ILifetimeScope` and create new scopes, with all the assembly metadata being isolated to that initial "load context scope".