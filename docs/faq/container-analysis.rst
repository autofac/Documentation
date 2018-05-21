===================================================
Why isn't container registration analysis built in?
===================================================

It is pretty frustrating to get runtime exceptions when resolving things due to an incomplete or incorrect set of registrations in your Autofac container. Why isn't there any sort of analysis built in so you can assert container validity after the container is built?

While this feature does appear in some containers, the flexibility available in Autofac to handle dependency resolution based on runtime parameters and dynamic functionality makes it difficult to offer a useful container validity check.

Consider the following example code:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();

    // ProdConfiguration requires a connectionString parameter
    // because it reads from a database.
    builder.RegisterType<ProdConfiguration>().AsSelf();

    // Lambda reads the environment and returns the correct
    // configuration based on that.
    builder.Register(ctx => {
      var env = Environment.GetEnvironmentVariable("ENVIRONMENT");
      switch(env)
      {
        case "Development":
          return new TestConfiguration();
        case "Production":
          return ctx.Resolve<ProdConfiguration>(new NamedParameter("connStr", connectionString));
        default:
          throw new NotSupportedException("Unknown environment name.");
      }
    }).As<IConfiguration>();

Container configuration like this is perfectly valid but it raises questions:

- If ``ProdConfiguration`` requires a connection string parameter that isn't registered in the container, is your container valid? What if you use service location and pass in the string as :doc:`a parameter during resolution <../resolve/parameters>`? How would the container know that?
- If ``IConfiguration`` relies on a particular environment parameter being present and it's there during deployment but not during unit tests, is your container valid?

These are somewhat simple cases. Consider the additional cases of things like...

- Modules that can dynamically attach things to all registrations like :doc:`the logging module <../examples/log4net>`
- :doc:`Registration sources <../advanced/registration-sources>`
- :doc:`Registration parameters <../register/parameters>`
- :doc:`Interceptors <../advanced/interceptors>`, :doc:`adapters <../advanced/adapters-decorators>`, and :doc:`decorators <../advanced/adapters-decorators>`
- :doc:`Dynamic assembly scanning <../register/scanning>`

These are not uncommon scenarios and that's not even a complete list of dynamic capabilities supported.

It is possible that at some point a very simplistic analysis mechanism could be added to try catching a minority of issues, but it is likely a more valuable endeavor to enhance Autofac to support better diagnostic and tracing functionality to more quickly target and resolve runtime challenges that are encountered. (If you're interested in helping with that effort, `let us know! <https://github.com/autofac/Autofac/issues>`_)