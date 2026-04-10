=======
Metrics
=======

Autofac 9.1 introduced opt-in performance metrics using `System.Diagnostics.Metrics <https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics>`_, the standard .NET metrics API. These are separate from ``DiagnosticSource`` tracing - they are counters and histograms rather than per-request event traces.

.. warning::

    **Metrics aren't free.** Collecting them will incur a performance hit, so this is **not** something you want to leave on in production. Enable metrics only when you need to measure and tune Autofac's behavior in your application.

If you're interested in tracing to find out why something is wired up how it is, :doc:`Autofac also provides tracing <tracing>`.

Enabling Metrics
----------------

Set the ``AUTOFAC_METRICS`` environment variable to ``true`` or ``1`` before your process starts.

.. code-block:: shell

    # Unix/macOS
    export AUTOFAC_METRICS=true

    # Windows (PowerShell)
    $env:AUTOFAC_METRICS = "true"

    # Windows (cmd)
    set AUTOFAC_METRICS=true

Available Counters
------------------

Metrics are published under the meter name ``autofac`` (version ``1.0.0``). The following instruments are available:

.. list-table::
   :header-rows: 1
   :widths: 40 15 10 35

   * - Name
     - Type
     - Unit
     - Description
   * - ``autofac.middleware.duration``
     - Histogram
     - s
     - Time spent executing resolve pipeline middleware.
   * - ``autofac.middleware.count``
     - Counter
     -
     - Number of resolve pipeline middleware executions.
   * - ``autofac.reflection.activation.duration``
     - Histogram
     - s
     - Time spent activating components via ``ReflectionActivator``.
   * - ``autofac.collection.build.duration``
     - Histogram
     - s
     - Time spent materializing implicit collection services.
   * - ``autofac.collection.build.count``
     - Counter
     -
     - Number of implicit collection builds performed.
   * - ``autofac.collection.build.items``
     - Counter
     -
     - Total elements added to implicit collections.
   * - ``autofac.property.injection.duration``
     - Histogram
     - s
     - Time spent performing property injection.
   * - ``autofac.property.injection.count``
     - Counter
     -
     - Number of instances that had property injection applied.
   * - ``autofac.property.injection.assignments``
     - Counter
     -
     - Number of individual property assignments performed.
   * - ``autofac.lock.contention.duration``
     - Histogram
     - s
     - Time threads waited to acquire Autofac internal locks.
   * - ``autofac.lock.contention.count``
     - Counter
     -
     - Number of lock contention events observed.
   * - ``autofac.lock.contention.total_time``
     - Counter
     - s
     - Cumulative time spent waiting on Autofac locks.

.. note::

    The lock contention metrics include per-service and per-lifetime-scope detail in their tags. This can produce high-cardinality data, so be mindful of the storage implications if you forward these to an external metrics backend.

Collecting Metrics
------------------

Because Autofac uses the standard ``System.Diagnostics.Metrics`` API, you can collect these metrics with any compatible tool.

**Using dotnet-counters (CLI)**

The quickest way to spot-check metrics is `dotnet-counters <https://learn.microsoft.com/en-us/dotnet/core/diagnostics/dotnet-counters>`_:

.. code-block:: shell

    dotnet-counters monitor --counters autofac --process-id <pid>

**Using MeterListener in code**

You can subscribe programmatically to receive measurement callbacks:

.. sourcecode:: csharp

    var listener = new MeterListener();

    listener.InstrumentPublished = (instrument, listener) =>
    {
        if (instrument.Meter.Name == "autofac")
        {
            listener.EnableMeasurementEvents(instrument);
        }
    };

    listener.SetMeasurementEventCallback<double>((instrument, value, tags, state) =>
    {
        Console.WriteLine($"{instrument.Name}: {value:F6}s");
    });

    listener.SetMeasurementEventCallback<long>((instrument, value, tags, state) =>
    {
        Console.WriteLine($"{instrument.Name}: {value}");
    });

    listener.Start();

**Using OpenTelemetry**

If your application already uses `OpenTelemetry <https://opentelemetry.io/docs/languages/dotnet/>`_, add the ``autofac`` meter to your ``MeterProvider``:

.. sourcecode:: csharp

    using var meterProvider = Sdk.CreateMeterProviderBuilder()
        .AddMeter("autofac")
        // Add your exporter of choice:
        .AddConsoleExporter()
        .Build();
