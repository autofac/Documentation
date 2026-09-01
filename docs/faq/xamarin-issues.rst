=============================================
Why are things in my Xamarin app misbehaving?
=============================================

**Autofac targets .NET Framework and .NET Standard.** `This makes the code fairly portable across platforms. <https://learn.microsoft.com/en-us/dotnet/standard/net-standard>`__ It can be used in, among other things, Mono, Xamarin, and Universal Windows Platform apps.

`Xamarin provides a cross-platform compiler <https://learn.microsoft.com/en-us/xamarin/cross-platform/get-started/introduction-to-mobile-development>`__ that can take C# and .NET code and compile that into native applications. From `the docs <https://learn.microsoft.com/en-us/xamarin/cross-platform/get-started/introduction-to-mobile-development>`__:

  On iOS, Xamarin’s Ahead-of-Time (AOT) Compiler compiles Xamarin.iOS applications directly to native ARM assembly code. On Android, Xamarin’s compiler compiles down to Intermediate Language (IL), which is then Just-in-Time (JIT) compiled to native assembly when the application launches.

One of the challenges is that not all the end platforms (e.g., iOS or Android) have support for all .NET features. For example, the linker may optimize out types that it thinks aren't used but really are as part of reflection and dependency injection. It does this as a way to speed up the app and reduce the overall size - remove types and/or methods that it doesn't think are used. This sort of conversion and optimization can cause apps that run as expected in .NET to behave slightly differently in a native compiled app from Xamarin.

On modern .NET (8 and later), Autofac core is annotated for trimming and Native AOT and the assembly is marked ``IsAotCompatible``, so the compiler will warn you about the features that aren't safe to trim or compile ahead of time. **The older Xamarin toolchain predates those annotations, so Autofac was not specifically built or tested against it.** There, it becomes the job of the cross-platform compiler and linker to ensure compatibility.

:doc:`See the Native AOT and Trimming page for full guidance, including the legacy Xamarin linker tips. <../advanced/native-aot-trimming>` Getting the right compiler and linker directives in place for reflection can take some trial and error; if you have additional tips or articles to contribute that might help others, let us know and we'll be happy to include them.

**If you are still having trouble after looking at the tips and doing research, ask your question on StackOverflow.** Tag it ``xamarin`` to `make sure people familiar with Xamarin get notified and can help answer it <https://stackoverflow.com/questions/tagged/xamarin>`__.
