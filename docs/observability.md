# Observability (tracing, metrics, log correlation)

This stack adds **OpenTelemetry tracing**, **Prometheus metrics** (`/metrics`), and **trace identifiers on pino logs** when enabled via environment variables. Everything defaults to **off** so local tests and CI pay no instrumentation cost until you opt in.

---

## Environment variables

| Variable                             | Default    | Purpose                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OBSERVABILITY_TRACING_ENABLED`      | `false`    | When `true`, registers the OpenTelemetry `NodeSDK` with HTTP, Express, and MongoDB driver instrumentations.                                                                                                                                                                                                                                                                             |
| `OBSERVABILITY_METRICS_ENABLED`      | `false`    | When `true`, exposes **`GET /metrics`** (Prometheus text) and records per-request HTTP metrics.                                                                                                                                                                                                                                                                                         |
| `OBSERVABILITY_TRACING_EXPORTER`     | `console`  | `console` → `ConsoleSpanExporter` (JSON-ish span output on stdout). `otlp` → OTLP/HTTP exporter (see below).                                                                                                                                                                                                                                                                            |
| `OBSERVABILITY_OTLP_TRACES_ENDPOINT` | —          | **Required** when exporter is `otlp` and tracing is enabled. Example: `http://127.0.0.1:4318/v1/traces` (Jaeger OTLP HTTP, Grafana Agent, OpenTelemetry Collector, etc.).                                                                                                                                                                                                               |
| `OBSERVABILITY_SERVICE_NAME`         | `http-api` | `service.name` on the tracer resource (shown in trace backends).                                                                                                                                                                                                                                                                                                                        |
| `OBSERVABILITY_TRACE_SAMPLING_RATIO` | `0.1`      | Root **head-based** sampling `0–1` (`ParentBasedSampler` + `TraceIdRatioBasedSampler`). Subsamples whole traces at span start; **does not** know future 5xx/aborts. To retain all failures while keeping low volume, add **tail sampling** on the OTLP path (Collector / Grafana Agent) using span attributes such as `error`, `app.http.status_type`, and `http.response.status_code`. |
| `OBSERVABILITY_ANONYMIZE_IP`         | `false`    | When `true`, **`net.peer.ip`** on HTTP spans is masked (IPv4 last octet → `0`, long IPv6 truncated with `...`).                                                                                                                                                                                                                                                                         |

Validation lives in **`src/config/env.ts`**: OTLP mode without a valid absolute URL fails fast at boot.

---

## Tracing

### How it works

1. **`src/server.ts`** imports **`./observability/tracing.js` as its first import** so instrumentation is registered **before** `express` and `mongoose` load (`import` order is intentional).
2. When `OBSERVABILITY_TRACING_ENABLED=true`, **`src/observability/tracing.ts`** constructs a **`NodeSDK`** with:
   - **`ParentBasedSampler`** whose root delegate is **`TraceIdRatioBasedSampler`** driven by **`OBSERVABILITY_TRACE_SAMPLING_RATIO`** (default **0.1**): child spans follow the parent’s sampled flag; new roots are probabilistic.
   - **`@opentelemetry/instrumentation-http`** — incoming/outgoing HTTP (skips **`GET /metrics`**). **`applyCustomAttributesOnSpan`** runs when the HTTP instrumentation ends the server span on **`response.close`** (after default response attributes), so **`http.response.status_code`** and outcome fields are not stale. It sets **`http.route`** (same label as Prometheus `route`), **`http.target`** (normalized path, no query), **`http.request.method`**, **`http.user_agent`** (browser + major version, or `other` — not the raw header), **`net.peer.ip`** (leftmost `X-Forwarded-For` when `TRUST_PROXY` is on, else socket; optional **`OBSERVABILITY_ANONYMIZE_IP`**), **`app.request_id`**, optional **`app.user_id`**, **`app.http.status_type`** (`completed` \| `aborted`, aligned with metrics `status_type`), and error semantics (see below).
   - **`@opentelemetry/instrumentation-express`** — Express middleware/router layers.
   - **`@opentelemetry/instrumentation-mongodb`** — MongoDB wire protocol (covers **Mongoose** because it uses the official driver under the hood).
3. **Outcome / errors on the HTTP span:** **`app.http.status_type=aborted`** when **`!response.writableEnded`** (same rule as metrics). **`http.response.status_code`** is **`0`** when aborted (metrics `status_code` label). Then **`error.type=aborted`**, **`error=true`**, span status **ERROR**. For **`completed`** responses with status **≥ 500**: **`error=true`**, span status **ERROR**.
4. **`ConsoleSpanExporter`** is the default exporter. Switch to OTLP by setting `OBSERVABILITY_TRACING_EXPORTER=otlp` and **`OBSERVABILITY_OTLP_TRACES_ENDPOINT`** to your collector’s traces URL.
5. On graceful shutdown, **`shutdownTracing()`** runs after **`server.close`** resolves so in-flight spans can finish.

### Local verification (console exporter)

```bash
# .env
OBSERVABILITY_TRACING_ENABLED=true
OBSERVABILITY_TRACING_EXPORTER=console
```

Start the API (`npm run dev`), hit any route, and watch the terminal for span objects printed by the console exporter.

### OTLP / Jaeger-style collector

```bash
OBSERVABILITY_TRACING_ENABLED=true
OBSERVABILITY_TRACING_EXPORTER=otlp
OBSERVABILITY_OTLP_TRACES_ENDPOINT=http://127.0.0.1:4318/v1/traces
OBSERVABILITY_SERVICE_NAME=e-commerce-api
```

Point the URL at an [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/) or any OTLP/HTTP-compatible receiver (Jaeger 1.35+ OTLP, Grafana Tempo, etc.).

---

## Prometheus metrics

### How it works

1. When `OBSERVABILITY_METRICS_ENABLED=true`, **`src/observability/metrics.ts`** registers **default process metrics** (`collectDefaultMetrics` on a dedicated **`Registry`**) plus:
   - **`http_requests_total`** — counter, labels `method`, `route`, `status_code`, `status_type`, `error_type`, `is_error`.
   - **`http_request_duration_seconds`** — histogram (seconds), same labels; buckets **`0.005 … 5s`** (see comment in `metrics.ts` for rationale).
   - **`http_requests_in_flight`** — gauge, label **`method` only**: **`inc`** when the metrics middleware runs (after **`/metrics`** skip), **`dec`** on the first **`response.finish`** or **`response.close`** (paired with that **`inc`**).
2. **`status_code`:** for **`status_type=aborted`**, the label is **`0`** (Express may still default `res.statusCode` to 200 before headers are finalized — we avoid counting that as success).
3. **`error_type`:** **`aborted`** when the client dropped before **`finish`**; otherwise **`none`**.
4. **`is_error`:** **`true`** if **`status_type=aborted`** **or** HTTP status ≥ **500**; else **`false`** (4xx client errors are not “error” for this signal).
5. **`src/common/http/middleware/metrics.middleware.ts`:** lifecycle is **request start → first `finish` or `close` → record once**. A **high-resolution** timer (`process.hrtime.bigint()`), one **`recordOnce`** guard, **`resolveHttpRoute(req)`** for counter/histogram **`route`**, and **`httpOutcomeAtResponseClose`** for **`status_type`**. **`GET /metrics` is excluded** at the top of the middleware so scrapes do not skew latency histograms.
6. **`GET /metrics`** is registered **early** in **`createApp`**, is **not** behind JWT or any module auth, and is **skipped** by the global rate limiter (same class of endpoint as `/health` and `/docs`).

### Local verification

```bash
OBSERVABILITY_METRICS_ENABLED=true
```

```bash
curl -sS http://localhost:3000/metrics | head
```

You should see default `process_*` lines plus `http_requests_total`, `http_request_duration_seconds_bucket`, and **`http_requests_in_flight`** (after generating some traffic).

**Saturation dashboards:** plot **`http_requests_in_flight`** (sum across methods or by `method`) with **`http_request_duration_seconds`** (e.g. p95 by `route`) to see latency rise as concurrency grows.

### Example Prometheus scrape config

```yaml
scrape_configs:
  - job_name: e-commerce-api
    metrics_path: /metrics
    static_configs:
      - targets: ["host.docker.internal:3000"]
```

In Kubernetes, point `targets` at your Service DNS name and port. **Protect `/metrics` at the network or gateway layer** in production if the scrape network is not isolated (the app intentionally does not require auth on this path so Prometheus can scrape without tokens).

---

## Log correlation (`requestId` + `traceId` + `spanId`)

When **`OBSERVABILITY_TRACING_ENABLED=true`**, **`getLogger()`** in **`src/common/logger.ts`** **always** adds:

- **`traceId`** / **`spanId`** from the active span when one exists, plus **`otelSpan: "ok"`**, or
- **`traceId` / `spanId` = `"missing"`** with **`otelSpan: "no_active_span"`** when tracing is on but there is no recording span (e.g. unsampled root) — **never silent**. The root logger emits **one** **`warn`** per process the first time this happens (`tracing_enabled_but_no_active_span_context`) so silent confusion is avoided without log spam.

**`requestId`** still comes from **`AsyncLocalStorage`** after **`bindRequestContext`**.

---

## Performance notes

- **Disabled (default):** no SDK, no prom-client collectors beyond module load; overhead is effectively zero.
- **Tracing enabled:** one-time instrumentation patch cost at startup; per-request cost is mostly span attribute capture and exporter I/O. **Console** exporter can be noisy and slower than OTLP to a local collector—prefer OTLP in shared environments.
- **Metrics enabled:** per-request work is a counter increment + histogram observe plus **`finish`** / **`close`** listeners sharing one **`recordOnce`** guard; **`/metrics`** scrape walks the registry (async string build).

---

## Limitations

- **Cardinality:** **`resolveHttpRoute`** uses **`req.baseUrl` + `req.route.path`** when that path is a non-empty string; otherwise **`req.baseUrl` + `req.path`**. Query strings are never included. Normalization: UUID → **`/:id`**, 24-hex Mongo id → **`/:id`**, numeric segments **>6** digits → **`/:id`** (**`/2024`**-style short numbers stay). Empty combined path → **`unmatched`**.
- **Double timing:** OpenTelemetry already records HTTP span duration; **`http_request_duration_seconds`** measures from this middleware onward (after `bindRequestContext`), not TCP accept time. That is intentional for alignment with app-level logs.
- **Process metrics:** `collectDefaultMetrics` is process-wide; if you run multiple unrelated apps in one Node process (unusual), isolate registries per app yourself.
- **Tests / Vitest:** integration tests import **`createApp`** only; they do **not** load **`server.ts`**, so tracing auto-init does not run in the test runner unless you import the tracing module yourself.

---

## Related code

| Area                              | File                                               |
| --------------------------------- | -------------------------------------------------- |
| Env parsing                       | `src/config/env.ts`                                |
| Tracing bootstrap + shutdown      | `src/observability/tracing.ts`                     |
| Prometheus registry + route       | `src/observability/metrics.ts`                     |
| HTTP metrics middleware           | `src/common/http/middleware/metrics.middleware.ts` |
| Route label + `http.target`       | `src/common/http/http-route-label.ts`              |
| Completed vs aborted (shared)     | `src/common/http/http-request-outcome.ts`          |
| Logger correlation                | `src/common/logger.ts`                             |
| Early import + shutdown flush     | `src/server.ts`                                    |
| Metrics route + middleware wiring | `src/app.ts`                                       |
| Rate limit skip for `/metrics`    | `src/common/middlewares/http-rate-limit.ts`        |
