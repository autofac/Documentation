===========================================================
How do I keep Autofac references isolated away from my app?
===========================================================

It can be desirable to try to keep references to the Autofac assemblies and IoC container out of your application. Depending on how your application is structured, you may have varying levels of success. Here are some tips on how to structure your application such to minimize Autofac references as well as some things to watch for if you choose to do so.

**No one idea here will solve all of your problems.** You will need to mix and match based on the structure of your application and what you're trying to accomplish.

.. contents::
  :local:

Application Startup
===================

Application startup is where your IoC container is built up and registrations are made. This is also where the IoC container is hooked into the `composition root <http://blog.ploeh.dk/2011/07/28/CompositionRoot/>`_ for the application. For console apps, this is the ``Main`` method; for ASP.NET apps this is the ``Startup`` class or the ``Global.asax``; for other applications there are other entry points.

You shouldn't try to separate the IoC container from this section of your application. This is the point where it specifically hooks into things. If you're trying to get Autofac away from your ``Global.asax`` or out of your ``Startup`` class (that is, you're trying to remove the Autofac package/assembly reference from the assembly with this code in it), **save yourself some time and don't do that**. You will potentially sink a lot of time into writing abstractions and wrappers around things only to replicate a lot of Autofac-specific syntax and capabilities.

Component Registrations
=======================

The majority of where Autofac connects to your application is where you make your :doc:`component registrations <../register/index>` into the container. There are a few ways you can limit Autofac connections here.

Assembly Scanning
-----------------
Autofac supports :doc:`registering things through assembly scanning <../register/scanning>`. This can be helpful if you have a known set of assemblies or plugins and you want to register all of the types that, for example, implement a specific interface or are named a certain way.

It is hard to configure individual components when using assembly scanning, though. For example, you can't really say "register all of these types, but just this handful need to be singletons while the rest must be instance-per-dependency."

If you find that you want to use assembly scanning but need this level of control, you may need to use .NET reflection and handle additional functionality in your own code. For example, if you want to specify lifetime scope via a custom attribute, you could create that custom attribute and a corresponding set of methods to iterate through the set of assemblies and make the registrations based on the attribute value.

Modules
-------
Using :doc:`Autofac modules <../configuration/modules>` is a great way to group related type registrations but it does tie the type implementing ``Autofac.Module`` to the Autofac package.

One solution to this is to put the Autofac modules into separate assemblies. In this way, you would have two assemblies for a given function:

  * Product assembly: This assembly has your actual code and has no references to Autofac.
  * Module assembly: This assembly has a reference to the product assembly as well as Autofac. This is where you'd put your Autofac module.

Your application could then use :doc:`assembly scanning <../register/scanning>` to locate all of the "module assemblies" and register the modules inside. (A trick to making this scanning easy is to adopt a naming convention for the module assemblies, then just run the scanning over those assemblies.)

Configuration
-------------
The :doc:`Autofac configuration <../configuration/xml>` system works entirely based on a configuration file and allows you to specify registrations that are read in by your application startup code without requiring any references elsewhere. It is not as full-featured as :doc:`Autofac modules <../configuration/modules>` so you may not be able to do all of your registrations this way, but it can be helpful for a handful of registrations.

You can also use the configuration system to register Autofac modules - this can allow you to specify modules in "module assemblies" (see above) and skip the assembly scanning.

IStartable
----------
Autofac provides an ``IStartable`` interface you can use to :doc:`automatically resolve a component and execute code <../lifetime/startup>`.

If your ``IStartable`` is registered as a singleton (which it generally should be), you can make use of the ``AutoActivate()`` method along with an ``OnActivated`` handler to replace it and remove the Autofac dependency:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder
       .RegisterType<TypeRequiringWarmStart>()
       .AutoActivate()
       .OnActivating(e => e.Instance.Start());

Service Resolution
==================
In the majority case of DI/IoC usage, you shouldn't have a reference to your IoC container - you'll instead have constructor parameters and/or settable properties that get populated by the container.

However, there are a few areas where you may find yourself tied to Autofac...

Service Location
----------------
Some frameworks are lacking composition root hooks to enable all dependency injection hooks at the app startup level. One example of this is classic ASP.NET ``HttpModules`` - there is generally no hook that allows you to inject dependencies into a module. In cases like this, you may find use of service location useful (though you should definitely minimize service location where possible `given it's an anti-pattern <http://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/>`_).

In cases where you need a service locator but don't want to tie to Autofac, consider using an abstraction like `CommonServiceLocator <https://www.nuget.org/packages/CommonServiceLocator/>`_ or `Microsoft.Extensions.DependencyInjection <https://www.nuget.org/packages/Microsoft.Extensions.DependencyInjection/>`_. In ASP.NET MVC applications, you're already provided with a ``DependencyResolver`` for service location; other application types may have similar abstractions already provided. By using one of these abstractions, you can remove the Autofac reference... though you'll have to keep a reference to the abstraction.

Implicit Relationships
----------------------
Autofac has several :doc:`implicit relationships <../resolve/relationships>` it supports like ``IEnumerable<T>``, ``Lazy<T>``, and ``Func<T>``. For the most part, the relationships are based on core .NET types. However, **if you're using the following, you'll be tied to Autofac**:

  * ``IIndex<X, B>`` (indexed collection)
  * ``Meta<T>`` and ``Meta<B, X>`` (strongly typed metadata)

There are no substitutes or workarounds to access instance names/keys or metadata on an object. If you need that functionality, you're stuck with those relationships.

However, you can potentially reduce usage of these through your code by...

  * Creating a factory: You could wrap usage of these relationships in a factory. Define the factory interface in your application code assembly and define the implementation in a separate assembly that is allowed to reference Autofac.
  * Use lambda registrations: You can register components :doc:`using a lambda <../register/registration>` and resolve the value right in the lambda. This is sort of like putting the factory inside the lambda registration rather than defining a separate interface for it. It takes a little bit of application code and puts it in the registration (e.g., the use of the metadata and/or the service key) but that may be an acceptable compromise.
