==========================================================================
How do I pass a parameter to a component in the middle of a resolve chain?
==========================================================================

There are times when you need to resolve a :doc:`service <../glossary>` that consumes a :doc:`component <../glossary>` somewhere down its dependency chain and that component needs :doc:`a parameter passed to it <../resolve/parameters>`.

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

    // Notice this implementation takes a string parameter for the server address -
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
    builder.RegisterType<Notifier>().As<INotifier>();
    builder.RegisterType<EmailServer>().As<IEmailServer>();
    var container = builder.Build();

The only time you know the email server address is at runtime - maybe through a context or environment parameter, maybe through configuration.

**How do you pass a parameter to the email server when you resolve the notifier?**

Why This is a Design Problem
============================
Before answering the question, consider that in many respects that **asking this question indicates a sort of design problem**.

Technically speaking, you're resolving an ``INotifier`` - a component that doesn't need to know about the runtime parameter with the email server address. The implementation of that ``INotifier`` could change. You could register a stub for testing, or switch up how emails get sent so they no longer need to know about the address.

Passing the server address as a parameter to the ``INotifier`` breaks the decoupling that interface-based development and inversion of control gives you by assuming that you "know" how the entire dependency chain is being resolved.

**The key to solving the problem is to break that "knowledge" so you're not passing a parameter.**

Solutions
=========

Instead of trying to pass a parameter, flip the problem around - **figure out how you determine the parameter at runtime and wrap that in a provider or a lambda expression registration.**

This changes the question to a different FAQ where we walk through answers step by step: :doc:`How do I inject configuration, environment, or context parameters? <injecting-configured-parameters>`
