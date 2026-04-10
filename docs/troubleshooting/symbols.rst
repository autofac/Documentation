===================
Symbols and Sources
===================

Autofac packages have been updated `to use Source Link <https://github.com/dotnet/sourcelink>`_ so you can debug right from your code into the Autofac source. Packages may have the symbols right inside or they may be in the `NuGet Symbol Server <https://docs.microsoft.com/en-us/nuget/create-packages/symbol-packages-snupkg#nugetorg-symbol-server>`_.

**In Visual Studio**, there's an option to enable searching the NuGet symbol server. `See the documentation from Microsoft explaining how to configure Visual Studio to make symbol servers work. <https://docs.microsoft.com/en-us/visualstudio/debugger/specify-symbol-dot-pdb-and-source-files-in-the-visual-studio-debugger>`_

**In VS Code**, you may need to set the debugging options up in ``settings.json`` or ``launch.json``.

A ``settings.json`` block to enable symbols during unit test debugging looks like this:

.. sourcecode:: json

    {
      "csharp.unitTestDebuggingOptions": {
        "symbolOptions": {
          "searchMicrosoftSymbolServer": true,
          "searchNuGetOrgSymbolServer": true
        }
      }
    }

To launch your application with symbols enabled, ``launch.json`` might look something like this:

.. sourcecode:: json

    {
      "configurations": [
        {
          "console": "internalConsole",
          "cwd": "${workspaceFolder}/src/MyProject",
          "env": {
            "COMPlus_ReadyToRun": "0",
            "COMPlus_ZapDisable": "1",
            "DOTNET_ENVIRONMENT": "Development",
            "DOTNET_URLS": "https://localhost:5000"
          },
          "justMyCode": false,
          "name": "Launch with SourceLink (Development)",
          "preLaunchTask": "build",
          "program": "${workspaceFolder}/src/MyProject/bin/Debug/net10.0/MyProject.dll",
          "request": "launch",
          "serverReadyAction": {
            "action": "openExternally",
            "pattern": "\\bNow listening on:\\s+(https?://\\S+)",
            "uriFormat": "%s"
          },
          "stopAtEntry": false,
          "suppressJITOptimizations": true,
          "symbolOptions": {
            "searchMicrosoftSymbolServer": true,
            "searchNuGetOrgSymbolServer": true
          },
          "type": "coreclr"
        }
      ],
      "version": "0.2.0"
    }
