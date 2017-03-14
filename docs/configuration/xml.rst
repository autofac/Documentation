==========================
JSON/XML Configuration
==========================

Most IoC containers provide a programmatic interface as well as JSON/XML file-based configuration support, and Autofac is no exception.

Autofac encourages programmatic configuration through the ``ContainerBuilder`` class. Using the programmatic interface is central to the design of the container. JSON or XML is recommended when concrete classes cannot be chosen or configured at compile-time.

Before diving too deeply into JSON/XML configuration, be sure to read :doc:`Modules<modules>` - this explains how to handle more complex scenarios than the basic JSON/XML component registration will allow.

.. contents::
  :local:
  :depth: 2

Configuring With Microsoft Configuration (4.0+)
===============================================

.. note::

   Microsoft Configuration applies to the 4.0+ version of Autofac.Configuration. It does not work with previous versions of the configuration package.

With the release of `Microsoft.Extensions.Configuration <https://www.nuget.org/packages/Microsoft.Extensions.Configuration>`_, and Autofac.Configuration 4.0.0, Autofac takes advantage of the more flexible configuration model not previously available when limited to application configuration files. If you were using the ``app.config`` or ``web.config`` based configuration available before, you will need to migrate your configuration to the new format and update the way you set configuration with your application container.

Quick Start
-----------
The basic steps to getting configuration set up with your application are:

1. Set up your configuration in JSON or XML files that can be read by ``Microsoft.Extensions.Configuration``.
2. Build the configuration using the ``Microsoft.Extensions.Configuration.ConfigurationBuilder``.
3. Create a new ``Autofac.Configuration.ConfigurationModule`` and pass the built ``Microsoft.Extensions.Configuration.IConfiguration`` into it.
4. Register the ``Autofac.Configuration.ConfigurationModule`` with your container.

A configuration file with some simple registrations looks like this:

.. sourcecode:: json

    {
      "defaultAssembly": "Autofac.Example.Calculator",
      "components": [{
        "type": "Autofac.Example.Calculator.Addition.Add, Autofac.Example.Calculator.Addition",
        "services": [{
          "type": "Autofac.Example.Calculator.Api.IOperation"
        }],
        "injectProperties": true
      }, {
        "type": "Autofac.Example.Calculator.Division.Divide, Autofac.Example.Calculator.Division",
        "services": [{
          "type": "Autofac.Example.Calculator.Api.IOperation"
        }],
        "parameters": {
          "places": 4
        }
      }]
    }

JSON is cleaner and easier to read, but if you prefer XML, the same configuration looks like this:

.. sourcecode:: xml

    <?xml version="1.0" encoding="utf-8" ?>
    <autofac defaultAssembly="Autofac.Example.Calculator">
        <components name="0">
            <type>Autofac.Example.Calculator.Addition.Add, Autofac.Example.Calculator.Addition</type>
            <services name="0" type="Autofac.Example.Calculator.Api.IOperation" />
            <injectProperties>true</injectProperties>
        </components>
        <components name="1">
            <type>Autofac.Example.Calculator.Division.Divide, Autofac.Example.Calculator.Division</type>
            <services name="0" type="Autofac.Example.Calculator.Api.IOperation" />
            <injectProperties>true</injectProperties>
            <parameters>
                <places>4</places>
            </parameters>
        </components>
    </autofac>

*Note the ordinal "naming" of components and services in XML - this is due to the way Microsoft.Extensions.Configuration handles ordinal collections (arrays).*

Build up your configuration and register it with the Autofac ``ContainerBuilder`` like this:

.. sourcecode:: csharp

    // Add the configuration to the ConfigurationBuilder.
    var config = new ConfigurationBuilder();
    config.AddJsonFile("autofac.json");

    // Register the ConfigurationModule with Autofac.
    var module = new ConfigurationModule(config.Build());
    var builder = new ContainerBuilder();
    builder.RegisterModule(module);

Default Assembly
-----------------
You can specify a "default assembly" option in the configuration to help write types in a shorter fashion. If you don't specify an assembly-qualified type name in a type or interface reference, it will be assumed to be in the default assembly.


.. sourcecode:: json

    {
      "defaultAssembly": "Autofac.Example.Calculator"
    }

Components
----------
Components are the most common thing that you'll register. You can specify several things on each component from lifetime scope to parameters.

Components are added to a top-level ``components`` element in configuration. Inside that is an array of the components you want to register.

This example shows one component that has *all of the options* on it, just for syntax illustration purposes. You wouldn't actually use every one of these in every component registration.

.. sourcecode:: json

    {
      "components": [{
        "type": "Autofac.Example.Calculator.Addition.Add, Autofac.Example.Calculator.Addition",
        "services": [{
          "type": "Autofac.Example.Calculator.Api.IOperation"
        }, {
          "type": "Autofac.Example.Calculator.Api.IAddOperation",
          "key": "add"
        }],
        "autoActivate": true,
        "injectProperties": true,
        "instanceScope": "per-dependency",
        "metadata": [{
          "key": "answer",
          "value": 42,
          "type": "System.Int32, mscorlib"
        }],
        "ownership": "external",
        "parameters": {
          "places": 4
        },
        "properties": {
          "DictionaryProp": {
            "key": "value"
          },
          "ListProp": [1, 2, 3, 4, 5]
        }
      }]
    }

====================== ======================================================================================================================================================= ===========================================================================
Element Name           Description                                                                                                                                             Valid Values
====================== ======================================================================================================================================================= ===========================================================================
``type``               The only required thing. The concrete class of the component (assembly-qualified if in an assembly other than the default).                             Any .NET type name that can be created through reflection.
``services``           An array of :doc:`services exposed by the component<../register/registration>`. Each service must have a ``type`` and may optionally specify a ``key``. Any .NET type name that can be created through reflection.
``autoActivate``       A Boolean indicating if the component should :doc:`auto-activate<../lifetime/startup>`.                                                                 ``true``, ``false``
``injectProperties``   A Boolean indicating whether :doc:`property (setter) injection<../register/prop-method-injection>` for the component should be enabled.                 ``true``, ``false``
``instanceScope``      :doc:`Instance scope<../lifetime/instance-scope>` for the component.                                                                                    ``singleinstance``, ``perlifetimescope``, ``perdependency``, ``perrequest``
``metadata``           An array of :doc:`metadata values <../advanced/metadata>` to associate with the component. Each item specifies the ``name``, ``type``, and ``value``.   Any :doc:`metadata values <../advanced/metadata>`.
``ownership``          Allows you to control :doc:`whether the lifetime scope disposes the component or your code does<../lifetime/disposal>`.                                 ``lifetimescope``, ``external``
``parameters``         A name/value dictionary where the name of each element is the name of a constructor parameter and the value is the value to inject.                     Any parameter in the constructor of the component type.
``properties``         A name/value dictionary where the name of each element is the name of a property and the value is the value to inject.                                  Any settable property on the component type.
====================== ======================================================================================================================================================= ===========================================================================

Note that both ``parameters`` and ``properties`` support dictionary and enumerable values. You can see an example of how to specify those in the JSON structure, above.

Modules
-------

When using :doc:`modules<modules>` with Autofac, you can register those modules along with components when using configuration.

Modules are added to a top-level ``modules`` element in configuration. Inside that is an array of the modules you want to register.

This example shows one module that has *all of the options* on it, just for syntax illustration purposes. You wouldn't actually use every one of these in every module registration.

.. sourcecode:: json

    {
      "modules": [{
        "type": "Autofac.Example.Calculator.OperationModule, Autofac.Example.Calculator",
        "parameters": {
          "places": 4
        },
        "properties": {
          "DictionaryProp": {
            "key": "value"
          },
          "ListProp": [1, 2, 3, 4, 5]
        }
      }]
    }

====================== ======================================================================================================================================================= ===============================================================================================
Element Name           Description                                                                                                                                             Valid Values
====================== ======================================================================================================================================================= ===============================================================================================
``type``               The only required thing. The concrete class of the module (assembly-qualified if in an assembly other than the default).                                Any .NET type name that derives from ``Autofac.Module`` that can be created through reflection.
``parameters``         A name/value dictionary where the name of each element is the name of a constructor parameter and the value is the value to inject.                     Any parameter in the constructor of the module type.
``properties``         A name/value dictionary where the name of each element is the name of a property and the value is the value to inject.                                  Any settable property on the module type.
====================== ======================================================================================================================================================= ===============================================================================================

Note that both ``parameters`` and ``properties`` support dictionary and enumerable values. You can see an example of how to specify those in the JSON structure, above.

You are allowed to register *the same module multiple times using different parameter/property sets* if you so choose.

Type Names
----------
In all cases where you see a type name (component type, service types, module type) it is expected to be `the standard, assembly qualified type name <https://msdn.microsoft.com/en-us/library/yfsftwz6(v=vs.110).aspx>`_ that you would normally be able to pass to ``Type.GetType(string typename)``. If the type is in the ``defaultAssembly`` you can leave the assembly name off, but it doens't hurt to put it there regardless.

Assembly qualified type names have the full type with namespace, a comma, and the name of the assembly, like ``Autofac.Example.Calculator.OperationModule, Autofac.Example.Calculator``. In that case, ``Autofac.Example.Calculator.OperationModule`` is the type and it's in the ``Autofac.Example.Calculator`` assembly.

Generics are a little more complicated. Configuration does not support open generics so you have to specify the fully qualified name of each of the generic parameters, too.

For example, say you have a repository ``IRepository<T>`` in a ``ConfigWithGenericsDemo`` assembly. Let's also say you have a class ``StringRepository`` that implements ``IRepository<string>``. To register that in configuration, it would look like this:

.. sourcecode:: json

    {
      "components": [{
        "type": "ConfigWithGenericsDemo.StringRepository, ConfigWithGenericsDemo",
        "services": [{
          "type": "ConfigWithGenericsDemo.IRepository`1[[System.String, mscorlib]], ConfigWithGenericsDemo"
        }]
      }]
    }

If you're having a difficult time figuring out what your type name is, you can always do something like this in code:


.. sourcecode:: csharp

    // Write the type name to the Debug output window and
    // copy/paste it out of there into your config.
    System.Diagnostics.Debug.WriteLine(typeof(IRepository<string>).AssemblyQualifiedName);

Differences from Legacy Configuration
-------------------------------------
When migrating from the legacy (pre 4.0 version) ``app.config`` based format to the new format, there are some key changes to be aware of:

- **There is no ConfigurationSettingsReader.** ``Microsoft.Extensions.Configuration`` has entirely replaced the old XML format configuration. The legacy configuration documentation does not apply to the 4.0+ series of configuration package.
- **Multiple configuration files handled differently.** The legacy configuration had a ``files`` element that would automatically pull several files together at once for configuration. Use the ``Microsoft.Extensions.Configuration.ConfigurationBuilder`` to accomplish this now.
- **AutoActivate is supported.** You can specify :doc:`components should auto-activate <../lifetime/startup>` now, a feature previously unavailable in configuration.
- **XML uses element children rather than attributes.** This helps keep the XML and JSON parsing the same when using ``Microsoft.Extensions.Configuration`` so you can combine XML and JSON configuration sources correctly.
- **Using XML requires you to name components and services with numbers.** ``Microsoft.Extensions.Configuration`` requires every configuration item to have a name and a value. The way it supports ordinal collections (arrays) is that it implicitly gives unnamed elements in a collection names with numbers ("0", "1", and so on). You can see an example of this in the quick start, above. If you don't go with JSON, you need to watch for this requirement from ``Microsoft.Extensions.Configuration`` or you won't get what you expect.
- **Per-request lifetime scope is supported.** Previously you couldn't configure elements to have :doc:`per-request lifetime scope <../lifetime/instance-scope>`. Now you can.
- **Dashes in names/values are gone.** Names of XML elements used to include dashes like ``inject-properties`` - to work with the JSON configuration format, these are now camel-case, like ``injectProperties``.
- **Services get specified in a child element.** The legacy configuration allowed a service to be declared right at the top of the component. The new system requires all services be in the ``services`` collection.

Additional Tips
---------------
The new ``Microsoft.Extensions.Configuration`` mechanism adds a lot of flexibility. Things you may want to take advantage of:

- **Environment variable support.** You can use ``Microsoft.Extensions.Configuration.EnvironmentVariables`` to enable configuration changes based on the environment. A quick way to debug, patch, or fix something without touching code might be to switch an Autofac registration based on environment.
- **Easy configuration merging.** The ``ConfigurationBuilder`` allows you to create configuration from a lot of sources and merge them into one. If you have a lot of configuration, consider scanning for your configuration files and building the configuration dynamically rather than hardcoding paths.
- **Custom configuration sources.** You can implement ``Microsoft.Extensions.Configuration.ConfigurationProvider`` yourself backed by more than just files. If you want to centralize configuration, consider a database or REST API backed configuration source.

Configuring With Application Configuration (Legacy Pre-4.0)
===========================================================

.. note::

   Legacy application configuration as described below applies to the 3.x and earlier versions of Autofac.Configuration. It does not work with the 4.0+ version of the package.

Prior to the release of `Microsoft.Extensions.Configuration <https://www.nuget.org/packages/Microsoft.Extensions.Configuration>`_ and the updated configuration model, Autofac tied into standard .NET application configuration files. (``app.config`` / ``web.config``). In the 3.x series of the Autofac.Configuration package, this was the way to configure things.

Setup
-----

Using the legacy configuration mechanism, you need to declare a section handler somewhere near the top of your config file::

    <?xml version="1.0" encoding="utf-8" ?>
    <configuration>
        <configSections>
            <section name="autofac" type="Autofac.Configuration.SectionHandler, Autofac.Configuration"/>
        </configSections>

Then, provide a section describing your components::

    <autofac defaultAssembly="Autofac.Example.Calculator.Api">
        <components>
            <component
                type="Autofac.Example.Calculator.Addition.Add, Autofac.Example.Calculator.Addition"
                service="Autofac.Example.Calculator.Api.IOperation" />

            <component
                type="Autofac.Example.Calculator.Division.Divide, Autofac.Example.Calculator.Division"
                service="Autofac.Example.Calculator.Api.IOperation" >
                <parameters>
                    <parameter name="places" value="4" />
                </parameters>
            </component>

The ``defaultAssembly`` attribute is optional, allowing namespace-qualified rather than fully-qualified type names to be used. This can save some clutter and typing, especially if you use one configuration file per assembly (see Additional Config Files below.)

Components
----------
Components are the most common thing that you'll register. You can specify several things on each component from lifetime scope to parameters.

Component Attributes
~~~~~~~~~~~~~~~~~~~~

The following can be used as attributes on the ``component`` element (defaults are the same as for the programmatic API):

====================== =============================================================================================================================== =================================================================
Attribute Name         Description                                                                                                                     Valid Values
====================== =============================================================================================================================== =================================================================
``type``               The only required attribute. The concrete class of the component (assembly-qualified if in an assembly other than the default.) Any .NET type name that can be created through reflection.
``service``            A service exposed by the component. For more than one service, use the nested ``services`` element.                             As for ``type``.
``instance-scope``     Instance scope - see :doc:`Instance Scope<../lifetime/instance-scope>`.                                                         ``per-dependency``, ``single-instance`` or ``per-lifetime-scope``
``instance-ownership`` Container's ownership over the instances - see the ``InstanceOwnership`` enumeration.                                           ``lifetime-scope`` or ``external``
``name``               A string name for the component.                                                                                                Any non-empty string value.
``inject-properties``  Enable property (setter) injection for the component.                                                                           ``yes``, ``no``.
====================== =============================================================================================================================== =================================================================

Component Child Elements
~~~~~~~~~~~~~~~~~~~~~~~~

============== =======================================================================================================================================================
Element        Description
============== =======================================================================================================================================================
``services``   A list of ``service`` elements, whose element content contains the names of types exposed as services by the component (see the ``service`` attribute.)
``parameters`` A list of explicit constructor parameters to set on the instances (see example above.)
``properties`` A list of explicit property values to set (syntax as for ``parameters``.)
``metadata``   A list of ``item`` nodes with ``name``, ``value`` and ``type`` attributes.
============== =======================================================================================================================================================

There are some features missing from the XML configuration syntax that are available through the programmatic API - for example registration of generics. Using modules is recommended in these cases.

Modules
-------

Configuring the container using components is very fine-grained and can get verbose quickly. Autofac has support for packaging components into :doc:`Modules<./modules>` in order to encapsulate implementation while providing flexible configuration.

Modules are registered by type::

    <modules>
        <module type="MyModule" />

You can add nested ``parameters`` and ``properties`` to a module registration in the same manner as for components above.

Additional Config Files
-----------------------

You can include additional config files using::

    <files>
        <file name="Controllers.config" section="controllers" />

Configuring the Container
-------------------------

First, you must **reference Autofac.Configuration.dll in from your project**.

To configure the container use a ``ConfigurationSettingsReader`` initialised with the name you gave to your XML configuration section:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterModule(new ConfigurationSettingsReader("mycomponents"));
    // Register other components and call Build() to create the container.

The container settings reader will override default components already registered; you can write your application so that it will run with sensible defaults and then override only those component registrations necessary for a particular deployment.

Multiple Files or Sections
--------------------------

You can use multiple settings readers in the same container, to read different sections or even different config files if the filename is supplied to the ``ConfigurationSettingsReader`` constructor.
