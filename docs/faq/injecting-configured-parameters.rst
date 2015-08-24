==================================================================
How do I inject configuration, environment, or context parameters?
==================================================================

There are times when you need to resolve a :doc:`service <../glossary>` that consumes a :doc:`component <../glossary>` somewhere down its dependency chain and that component needs :doc:`a parameter passed to it <../resolve/parameters>` from configuration, the environment, or some other runtime context location.

For this question, let's imagine a simple email notification system like this:

.. sourcecode:: csharp

    // This interface lets you send an email notification to someone.
    public interface INotifier
    {
      void Send(string address, string message);
    }

    // This implementation of the notifier uses a backing email
    // repository for doing the heavy lifting.
    public class Notifier : INotifier
    {
      private IEmailServer _server;
      public Notifier(IEmailServer server)
      {
        this._server = server;
      }

      public void Send(string address, string message)
      {
        this._server.SendMessage(address, "from@domain.com", message);
      }
    }

    // This email server interface is what the notifier will use
    // to send the email.
    public interface IEmailServer
    {
      void SendMessage(string toAddress, string fromAddress, message);
    }

    // Notice this implementaton takes a string parameter for the server address -
    // something we won't know until runtime so we can't explicitly register the
    // parameter value.
    public class EmailServer : IEmailServer
    {
      private string _serverAddress;
      public EmailServer(string serverAddress)
      {
        this._serverAddress = serverAddress;
      }

      public void SendMessage(string toAddress, string fromAddress, message)
      {
        // ...send the message through the specified server address.
      }
    }

When you register things in Autofac, you might have registrations that look like this:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<Notifer>().As<INotifer>();
    builder.RegisterType<EmailServer>().As<IEmailServer>();
    var container = builder.Build();

The only time you know the email server address is at runtime - maybe through a context or environment parameter, maybe through configuration.

.. contents:: **How do you get the configured/environment/context parameter to the email server when you resolve the notifier?**
  :local:
  :depth: 1

Option 1: Register Using a Lambda
=================================

In this option, rather than registering the email server type directly, :doc:`register using a lambda expression <../register/registration>`. This allows you to resolve things from the container or use the environment to get the value.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.Register(ctx =>
    {
      var address = Environment.GetEnvironmentVariable("SERVER_ADDRESS");
      return new EmailServer(address);
    }).As<IEmailServer>();

As part of this, you may want to create some sort of abstraction around how you get the server address. For example, it may be something that you got as part of a web request and you've stored it in the ``HttpContext``. You could create an address provider like this:

.. sourcecode:: csharp

    public interface IServerAddressProvider
    {
      string GetServerAddress();
    }

    public class ContextServerAddressProvider : IServerAddressProvider
    {
      private HttpContextBase _context;
      public ContextServerAddressProvider(HttpContextBase context)
      {
        this._context = context;
      }

      public string GetServerAddress()
      {
        return (string)this._context.Items["EMAIL_SERVER_ADDRESS"];
      }
    }

Once you have a provider, you could register that with the container and use it in conjunction with the lambda.

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<ContextServerAddressProvider>()
           .As<IServerAddressProvider>()
           .InstancePerRequest();
    builder.Register(ctx =>
    {
      var address = ctx.Resolve<IServerAddressProvider>().GetServerAddress();
      return new EmailServer(address);
    }).As<IEmailServer>();

**If you need to pass a string parameter or can't modify the code, this is the recommended option.**

Option 2: Use a Provider
========================

Expanding on the provider mechanism described in option 1: Usually the biggest problem is that the parameter you need to pass is a base type like an integer or a string. If you can switch this to use a provider a strongly-typed interface parameter, you can make registration a little easier.

For example, you may be able to get the parameter from a web request context like this.

.. sourcecode:: csharp

    public interface IServerAddressProvider
    {
      string GetServerAddress();
    }

    public class ContextServerAddressProvider : IServerAddressProvider
    {
      private HttpContextBase _context;
      public ContextServerAddressProvider(HttpContextBase context)
      {
        this._context = context;
      }

      public string GetServerAddress()
      {
        return (string)this._context.Items["EMAIL_SERVER_ADDRESS"];
      }
    }

You could then refactor the email server code to take the provider rather than an address string:

.. sourcecode:: csharp

    public class EmailServer : IEmailServer
    {
      private IServerAddressProvider _serverAddressProvider;
      public EmailServer(IServerAddressProvider serverAddressProvider)
      {
        this._serverAddressProvider = serverAddressProvider;
      }

      public void SendMessage(string toAddress, string fromAddress, message)
      {
        var address = this._serverAddressProvider.GetServerAddress();
        // ...send the message through the specified server address.
      }
    }

Now you can just register types:

.. sourcecode:: csharp

    var builder = new ContainerBuilder();
    builder.RegisterType<ContextServerAddressProvider>()
           .As<IServerAddressProvider>()
           .InstancePerRequest();
    builder.RegisterType<EmailServer>().As<IEmailServer>();

**If you can modify the code, this is the recommended option.**
