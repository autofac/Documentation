=================================
Upgrading from Autofac 3.x to 4.x
=================================

The Autofac 4.x release added .NET Core support to core Autofac as well as several of the integration packages.

Generally speaking, the public API held stable during the upgrade but internals changed because reflection and a few other things are done just slightly differently in .NET Core.

The following is a list of known differences between the 3.x and 4.x versions of Autofac including changes to integration/extras packages:

- The following NuGet packages were renamed:

  * Autofac.Extras.Attributed => Autofac.Extras.AttributeMetadata
  * Autofac.Extras.Multitenant => Autofac.Multitenant
  * Autofac.Extras.Multitenant.Wcf => Autofac.Multitenant.Wcf
  * Autofac.Extras.DynamicProxy2 => Autofac.Extras.DynamicProxy
- Minimum target frameworks for all packages has been increased to .NET 4.5 and the .NET 4.5 security model is being used (e.g., no more ``AllowPartiallyTrustedCallersAttribute``).
- The Autofac.Configuration package now uses Microsoft.Extensions.Configuration formatted configuration files instead of the old XML format. :doc:`You can read more about this on the configuration page. <../configuration/xml>`
- The following integration packages have been moved to maintenance mode (fixes only, no new features, no active work):

  * Autofac.Extras.NHibernate
  * Autofac.Extras.EnterpriseLibraryConfigurator
  * Autofac.Integration.DomainServices
