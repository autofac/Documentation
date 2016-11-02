===========================================
How do I conditionally register components?
===========================================

There are times when you want to pick what gets registered in the container at runtime, maybe based on an environment variable or application parameter. Here are some options...

.. contents::
  :local:

Use Configuration
=================

Autofac provides :doc:`a configuration mechanism <../configuration/xml>` that allows you to specify registrations via a configuration file. You can set up different configuration files to use in different environments and/or with different parameters, then during application startup pick the appropriate configuration file to read and register.

If you choose to use the ``Microsoft.Extensions.Configuration`` abstractions (Autofac 4.0+) you can even represent configuration as environment variables directly. See the docs on ``Microsoft.Extensions.Configuration`` for how to represent configuration in environment variables.

Use Modules
===========

:doc:`Autofac modules <../configuration/modules>` are a programmatic configuration mechanism that bundles registrations together. You can add parameters (e.g., constructor parameters or properties) to your module such that it registers different things or behaves differently based on provided values - values you read from the runtime environment.

There is an example of this :doc:`in the documentation for Autofac modules <../configuration/modules>`.

Lambda Registrations
====================

You can :doc:`register components using lambda expressions <../register/registration>` and make a runtime choice right in the registration for how to handle things. Note this may have an effect on performance depending on the expense of the runtime check and how often it gets executed, but it's an option.

.. sourcecode:: csharp

    builder.Register(c =>
      {
        var environment = Environment.GetEnvironmentVariable("environment_name");
        if(environment == "DEV")
        {
          return new DevelopmentObject();
        }
        else
        {
          return new ProductionObject();
        }
      })
      .As<IMyObject>()
      .SingleInstance();

Avoid Updating the Container
============================

You may be tempted to start the application up and then change the contents of the application container based on some input. **Avoid doing this if possible.** You should :doc:`treat the container as immutable <../best-practices/index>` because once you've resolved things out of it, changing the contents of the container has a high potential to invalidate the previous objects resolved from the container, putting your application in an inconsistent state.