======================================
Cross-Platform and Native Applications
======================================

Tools like Xamarin and .NET Native enable .NET code to be compiled to target specific platforms. However, given .NET reflection doesn't necessarily "just work" on all native platforms and auto-wiring of parameters and construction of objects largely relies on reflection, you sometimes have to do some additional work to get Autofac and DI to work.

Xamarin
=======

When using Xamarin to create an iOS or Android app and the linker is enabled, you may need to explicitly describe types requiring reflection. The `Xamarin Custom Linker Configuration <https://developer.xamarin.com/guides/cross-platform/advanced/custom_linking/>`_ documentation explains how you can notify the linker to keep certain types and not strip them from the finished product. This boils down to...

* Mark types you own with a ``[Preserve]`` attribute
* Include a custom XML link description file in your build

A simple link description file looks like this:

.. sourcecode:: xml

    <linker>
      <assembly fullname="mscorlib">
        <type fullname="System.Convert" />
      </assembly>
      <assembly fullname="My.Own.Assembly">
        <type fullname="Foo" preserve="fields">
          <method name=".ctor" />
        </type>
        <namespace fullname="My.Own.Namespace" />
        <type fullname="My.Other*" />
      </assembly>
      <assembly fullname="Autofac" preserve="all"/>
    </linker>

Autofac makes use of the ``System.Convert.ChangeType`` method in lambda expressions to convert types so including it in the linker definition is needed. See `issue #842 <https://github.com/autofac/Autofac/issues/842>`_ for further discussion.

For additional details on how to structure your Xamarin custom linker configuration file and how to include it in your build, `check out the Xamarin documentation <https://developer.xamarin.com/guides/cross-platform/advanced/custom_linking/>`_.

Autofac may not be seen as "linker safe" by the Xamarin linker. If the linker gets too aggressive, you may see an exception like::

    The type 'Autofac.Features.Indexed.KeyedServiceIndex'2' does not implement the interface 'Autofac.Features.Indexed.IIndex'2'

[This StackOverflow answer](https://stackoverflow.com/questions/58114288/autofac-build-throws-exception-on-latest-xamarin-ios-when-linker-configured-to) indicates that you can do one of the following things:

  * Set the linker to ``Don't link`` or ``Link Framework SDKs Only`` (which will increase your application size)
  * Add the ``--linkskip=Autofac`` argument to the ``Additional mtouch arguments in iOS Build`` found in the iOS project properties.
  * Use a linker XML like the one above and make sure the ``Autofac`` line with ``preserve="all"`` is included.

.NET Native
===========

`.NET Native <https://msdn.microsoft.com/en-us/library/dn584397(v=vs.110).aspx>`_ is a way to compile .NET binaries to native code. It's used in Universal Windows Platform (UWP) and Windows Store apps, among others.

When using `.NET Native with reflection <https://msdn.microsoft.com/en-us/library/dn600640(v=vs.110).aspx>`_ you may run into exceptions like ``MissingMetadataException`` when the compiler has removed the reflection metadata for types you need.

You can configure .NET Native compilation using a `Runtime Directives (rd.xml) file <https://msdn.microsoft.com/en-us/library/dn600639(v=vs.110).aspx>`_. A simple directive file looks like this:

.. sourcecode:: xml

    <Directives xmlns="http://schemas.microsoft.com/netfx/2013/01/metadata">
      <Application>
        <Assembly Name="*Application*" Dynamic="Required All" />
      </Application>
    </Directives>

That directive file tells the compiler to keep all the reflection data for everything in the entire application package. That's sort of the "nuclear option" - if you want to make your application package smaller you can be much more specific about what to include. `Refer to the MSDN documentation for more detail. <https://msdn.microsoft.com/en-us/library/dn600639(v=vs.110).aspx>`_