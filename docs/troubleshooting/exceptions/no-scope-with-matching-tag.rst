============================
No scope with a matching tag
============================

Example Message
===============

::

    No scope with a tag matching 'AutofacWebRequest' is visible from the scope
    in which the instance was requested.

    If you see this during execution of a web application, it generally
    indicates that a component registered as per-HTTP request is being
    requested by a SingleInstance() component (or a similar scenario). Under
    the web integration always request dependencies from the dependency
    resolver or the request lifetime scope, never from the container itself.

This error means that Autofac tried to resolve a service that was registered as ``InstancePerMatchingLifetimeScope`` and there was no matching lifetime scope.

Troubleshooting
===============

- **In an ASP.NET Classic web application** (ASP.NET MVC, web forms, etc.) chances are this is due to a missing :doc:`per-request lifetime scope <../../faq/per-request-scope>`. For example, code that tries to run at application startup but use services registered as per-request will fail. :doc:`Check out the FAQ on working with per-request scope <../../faq/per-request-scope>` for more info on how to troubleshoot that.
- **In an ASP.NET Core application**, it may be that you've registered things as ``InstancePerRequest``. ASP.NET Core doesn't have a named request lifetime scope - use ``InstancePerLifetimeScope`` instead. :doc:`See the ASP.NET Core integration docs <../../integration/aspnetcore>` for more information.
- **If you've created custom per-request semantics** in your own application, perhaps creating something similar to ``InstancePerRequest``, likely there is some code registering something as ``InstancePerRequest`` but the service is being resolved outside a request lifetime scope. This can happen if you try to share a registration module between something that has per-request lifetime scopes and something that doesn't, like a web app and a background processing job; or if code runs at application startup before there are requests and tries to use per-request objects.
- **If you register some components with a matching lifetime scope and some without** it can be problems. For example, say you register one ``IMyService`` as a singleton and then register a second ``IMyService`` as ``InstancePerMatchingLifetimeScope``. If you try to resolve ``IEnumerable<IMyService>`` outside a matching lifetime scope, you'll get an error. Even though one of the ``IMyService`` could be resolved, *not all* of them can. ``InstancePerMatchingLifetimeScope`` is not a *filter* to allow an instance to *sometimes* be resolved.
