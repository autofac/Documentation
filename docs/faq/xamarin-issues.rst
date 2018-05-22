=============================================
Why are things in my Xamarin app misbehaving?
=============================================

**Autofac targets .NET Framework and .NET Standard.** `This makes the code fairly portable across platforms. <https://docs.microsoft.com/en-us/dotnet/standard/net-standard>`__ It can be used in, among other things, Mono, Xamarin, and Universal Windows Platform apps.

`Xamarin provides a cross-platform compiler <https://docs.microsoft.com/en-us/xamarin/cross-platform/get-started/introduction-to-mobile-development>`__ that can take C# and .NET code and compile that into native applications. From `the docs <https://docs.microsoft.com/en-us/xamarin/cross-platform/get-started/introduction-to-mobile-development>`__:

  On iOS, Xamarin’s Ahead-of-Time (AOT) Compiler compiles Xamarin.iOS applications directly to native ARM assembly code. On Android, Xamarin’s compiler compiles down to Intermediate Language (IL), which is then Just-in-Time (JIT) compiled to native assembly when the application launches.

One of the challenges is that not all the end platforms (e.g., iOS or Android) have support for all .NET features. For example, the linker may optimize out types that it thinks aren't used but really are as part of reflection and dependency injection. It does this as a way to speed up the app and reduce the overall size - remove types and/or methods that it doesn't think are used. This sort of conversion and optimization can cause apps that run as expected in .NET to behave slightly differently in a native compiled app from Xamarin.

**Autofac is not specifically built or tested for Xamarin or .NET Native apps.** In targeting .NET Standard, it becomes the job of the cross-platform compiler and linker to ensure compatibility with other .NET Standard code.

:doc:`We have some tips that we've gathered from the community on getting Xamarin and .NET Native apps working. <../advanced/cross-platform-apps>` Hopefully these will help. If you have additional tips or articles to contribute that might help others, let us know and we'll be happy to include them. It can sometimes be a challenge to get the right compiler and linker directives correct to get things working in Xamarin with reflection.

**If you are still having trouble after looking at the tips and doing research, ask your question on StackOverflow.** Tag it ``xamarin`` to `make sure people familiar with Xamarin get notified and can help answer it <https://stackoverflow.com/questions/tagged/xamarin>`__.