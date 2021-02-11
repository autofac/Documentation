====================================================================
How do I create a session-based lifetime scope in a web application?
====================================================================

In ASP.NET the notion of "instance per request" is inherently supported, but you may have a desire to create an "instance per session" for some objects.

**This road is fraught with peril and is totally unsupported.** It's a question asked often enough that we've provided some information about the possible way to get it to work `based on this StackOverflow answer <https://stackoverflow.com/questions/11721919/managing-autofac-lifetime-scopes-per-session-and-request-in-asp-net-mvc-3/11726210#11726210>`_ but if it's not working for you or you need additional support to get it to happen, **you're on your own**.

Also, **this information is for ASP.NET MVC classic, not ASP.NET Core** but the same challenges will apply. Most likely this will not be updated for ASP.NET Core. It will probably also not be updated for Web API, web forms, or any other integration. You will need to take the ideas here and adapt them as needed.

.. contents::
  :local:

Why This is a Bad Idea
======================

Before you even begin, here are the challenges you'll run into with a session-scoped lifetime:

Memory Footprint
----------------

You're going to end up with a lifetime scope for every user on your system. While a request lifetime pops up and goes away pretty quickly, these session-level scopes will live potentially a long time. If you have a lot of session-scoped items, you're going to have a pretty good sized memory usage for each user. If people "abandon" their sessions without properly logging out, that's all the longer these things will live.

Not Farm Friendly
-----------------

Lifetime scopes and their contents aren't serializable. `Looking at the code <https://github.com/autofac/Autofac/blob/develop/src/Autofac/Core/Lifetime/LifetimeScope.cs>`_ for ``LifetimeScope``, it's not marked ``[Serializable]``... and even if it was, the resolved objects living in there are not necessarily all marked serializable. This is important because it means your session-level lifetime scope might work on a single box with in-memory session, but **if you deploy to a farm with SQL session or a session service, things will fall apart** because the session can't serialize your stored scope.

If you choose not to serialize the scope, then you have a different scope for each user across machines - also a potential problem.

Session Not Consistently Used
-----------------------------

Session isn't always rehydrated. If the handler being accessed (e.g., the web form) doesn't implement ``IRequiresSessionState``, the session won't be rehydrated (whether it's in-proc or not). Web forms and the ``MvcHandler`` implement that by default so you won't see any issues, but if you have custom handlers that require injection you'll hit some snags since "Session" won't exist for those requests. You'll also have trouble for handlers that have explicitly marked themselves as not needing session (e.g., for performance purposes).

Unreliable Disposal
-------------------

``Session_End`` doesn't always fire. `Per the docs on SessionStateModule.End <https://msdn.microsoft.com/en-us/library/system.web.sessionstate.sessionstatemodule.end.aspx>`_, if you use out-of-proc session state you won't actually get the ``Session_End`` event, so you won't be able to clean up.

How to Do It
============

Let's say you've still read through all that and you want this.

At least in ASP.NET MVC classic, **what you'll do is implement your own Autofac.Integration.Mvc.ILifetimeScopeProvider**. This interface is what governs how/where request lifetime scopes get generated.

**Exactly how to implement it will be up to you.** This is because of all of the challenges above. For example, where will you hold the session-based lifetime scope? Is it attached to the actual session (which is a problem due to serialization)? Is it in a static dictionary somewhere? Is there some other place you want to hold those references? These aren't questions that can be answered here - this is all largely "an exercise for the reader."

The default ``ILifetimeScopeProvider`` implementation, ``Autofac.Integration.Mvc.RequestLifetimeScopeProvider``, handles creation, disposal, and maintenance of lifetime scopes on a per-request basis. You can browse the code for ``RequestLifetimeScopeProvider`` `here <https://github.com/autofac/Autofac.Mvc/blob/develop/src/Autofac.Integration.Mvc/RequestLifetimeScopeProvider.cs>`_, which you should do if you plan on undertaking this. It's the best sample of working code showing the responsibility of one of these providers.

The implementation of ``ILifetimeScopeProvider`` will be where you...

  * Locate (or create) the session lifetime scope for the user
  * Create the request lifetime scope as a child of the session lifetime scope
  * Dispose of the request lifetime scope at the end of the request

This may be also where you want to dispose of the session lifetime scope from a design perspective, but it could be tricky since the provider doesn't automatically get the session end event.

Once you have your ``ILifetimeScopeProvider`` you'll use it when you set up your dependency resolver.

.. sourcecode:: csharp

    var scopeProvider = new MyCustomLifetimeScopeProvider(container, configAction);
    var resolver = new AutofacDependencyResolver(container, scopeProvider);
    DependencyResolver.SetResolver(resolver);

**You will also need to hook into the Session_End event** (e.g., in your ``Global.asax`` or ``MvcApplication`` class) to dispose of the session scope. Again, how you do that exactly is up to you since the ``ILifetimeScopeProvider`` doesn't receive any session-related events.
