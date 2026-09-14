import React, { useMemo } from "react";
import { Controls, MultiSelect, Search, Select, TimeRange, VegaChart, useQuery } from "@malloyyo/dashboard";

// ---------------------------------------------------------------------------
// Brand Trends — custom React dashboard, styled to the Maison Baungarten
// identity guidelines (Edition Two, Sept 2026).
//
// Rules pulled straight from the brand book's own "Dashboards" section:
//   • Lead with the decision, not the data — one hero figure up top.
//   • One dominant brand color (oxblood), spent on the ONE thing that needs
//     it; everywhere else stays paper / ink / stone.
//   • Semantic color (sage / ochre / rust) never doubles as brand color.
//   • A trend chart is ONE hue — never a legend of brand colors on one chart.
//     Comparing brands is a SORTED BAR (one hue family, tinted by value) or a
//     TABLE with a status pill, never a multi-series line.
//   • Density before decoration: hairline rules, no card shadows, tight
//     spacing. Corner radii are tokenized: controls 2px, cards 6px, hero 12px.
// ---------------------------------------------------------------------------

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Archivo", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// Fixed house palette — not theme-switched. The brand book pins exact hex
// values for both paper (light) and burgundy (dark) surfaces, so this reads
// the same regardless of the viewer's OS color scheme.
const C = {
  oxblood: "#6E0F26",
  burgundyDeep: "#3C0715",
  burgundyTint: "#C98A98",
  paper: "#F1E9E6",
  card: "#FBF6F4",
  ink: "#2B1216",
  ink2: "#7A5C63",
  muted: "#9C8288",
  brass: "#9C7B3F",
  sage: "#5C6E48",
  ochre: "#A67A2C",
  rust: "#A8461F",
  line: "#E1CDC9",
};

// ── formatting ─────────────────────────────────────────────────────────────
const abs = Math.abs;
const usd = (n) => {
  if (n == null || !isFinite(n)) return "—";
  if (abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs(n) >= 1e4) return `$${Math.round(n / 1e3)}K`;
  if (abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};
const usd2 = (n) => (n == null || !isFinite(n) ? "—" : `$${n.toFixed(2)}`);
const num = (n) => (n == null || !isFinite(n) ? "—" : Math.round(n).toLocaleString());
const pct = (n, d = 1) => (n == null || !isFinite(n) ? "—" : `${(n * 100).toFixed(d)}%`);
const signedPct = (n) => (n == null ? "" : `${n >= 0 ? "+" : "−"}${(abs(n) * 100).toFixed(1)}%`);

// ── trend helpers ──────────────────────────────────────────────────────────

/** Drop a trailing in-progress month — otherwise every trend ends in a cliff
    that reads as collapse rather than an unfinished month. */
function completeMonths(rows) {
  if (!rows || rows.length < 2) return rows ?? [];
  const last = new Date(rows[rows.length - 1].order_month);
  const now = new Date();
  const partial = last.getUTCFullYear() === now.getUTCFullYear() && last.getUTCMonth() === now.getUTCMonth();
  return partial ? rows.slice(0, -1) : rows;
}

/** Trailing 3 months vs the 3 before — the momentum signal behind both the
    hero delta and each brand's status pill. */
function trailingDelta(rows, field) {
  const r = rows ?? [];
  if (r.length < 6) return null;
  const sum = (a) => a.reduce((s, x) => s + (x[field] || 0), 0);
  const n = r.length;
  const prev = sum(r.slice(n - 6, n - 3));
  if (!prev) return null;
  return sum(r.slice(n - 3)) / prev - 1;
}

const sparkValues = (rows, field) => (rows ?? []).slice(-12).map((r) => r[field] || 0);

/** Growing / Steady / Declining, from the trailing delta — semantic color,
    never brand color, and always labelled (a pill alone is never the only
    way to read the signal). */
function momentum(rows) {
  const delta = trailingDelta(completeMonths(rows), "month_sales");
  if (delta == null) return { label: "New", color: C.muted, bg: `${C.muted}1a` };
  if (delta > 0.05) return { label: "Growing", color: C.sage, bg: `${C.sage}1a`, delta };
  if (delta < -0.05) return { label: "Declining", color: C.rust, bg: `${C.rust}1a`, delta };
  return { label: "Steady", color: C.ochre, bg: `${C.ochre}1a`, delta };
}

// ── Vega specs (single-hue, per the brand book's chart rules) ──────────────

const FONT_STACK = SANS;

const cfg = {
  background: null,
  font: FONT_STACK,
  padding: 0,
  view: { stroke: null },
  axis: {
    labelColor: C.muted,
    titleColor: C.muted,
    domainColor: C.line,
    tickColor: C.line,
    gridColor: C.line,
    gridWidth: 1,
    labelFontSize: 11,
    labelFont: FONT_STACK,
    titleFont: FONT_STACK,
    titleFontSize: 11,
    titleFontWeight: 500,
    titlePadding: 10,
    labelPadding: 4,
    tickSize: 4,
  },
  text: { font: FONT_STACK },
};

/** The one trend chart on the page: single-hue bars, oxblood, no legend. */
const trendSpec = {
  height: 220,
  config: cfg,
  encoding: {
    x: {
      field: "order_month",
      type: "temporal",
      title: null,
      axis: { format: "%b ’%y", labelAngle: 0, tickCount: 7, grid: false },
    },
  },
  layer: [
    {
      mark: { type: "bar", width: { band: 0.6 }, color: C.oxblood, cornerRadiusTopLeft: 2, cornerRadiusTopRight: 2 },
      encoding: {
        y: { field: "sales", type: "quantitative", title: null, axis: { format: "$~s", grid: true, domain: false, ticks: false, tickCount: 5 } },
      },
    },
    {
      // Crosshair readout — a soft column, not a second color.
      params: [{ name: "hov", select: { type: "point", encodings: ["x"], on: "pointerover", nearest: true, clear: "pointerout" } }],
      mark: { type: "rule", strokeWidth: 18, stroke: C.ink },
      encoding: {
        opacity: { condition: { param: "hov", empty: false, value: 0.08 }, value: 0 },
        tooltip: [
          { field: "order_month", type: "temporal", title: "Month", format: "%B %Y" },
          { field: "sales", type: "quantitative", title: "Sales", format: "$,.0f" },
        ],
      },
    },
  ],
};

/** Ranked horizontal bars, ONE hue family — tint scales from burgundy-tint
    (lowest) to oxblood (highest), never a different hue per brand. Value is
    direct-labelled at the tip, so there's no x-axis to draw at all. */
function rankingSpec(rows) {
  const max = Math.max(...rows.map((r) => r.sales || 0), 1) * 1.2;
  return {
    height: { step: 30 },
    config: cfg,
    transform: [{ calculate: "format(datum.sales, '$,.3s')", as: "vlabel" }],
    encoding: {
      y: {
        field: "brand",
        type: "nominal",
        title: null,
        sort: { field: "sales", op: "max", order: "descending" },
        axis: { labelLimit: 140, labelFontSize: 12, labelColor: C.ink2, labelPadding: 8, domain: false, ticks: false },
      },
      x: { field: "sales", type: "quantitative", title: null, axis: null, scale: { domain: [0, max], nice: false } },
    },
    layer: [
      {
        mark: { type: "bar", height: { band: 0.6 }, cornerRadiusTopRight: 3, cornerRadiusBottomRight: 3 },
        encoding: {
          color: {
            field: "sales",
            type: "quantitative",
            legend: null,
            scale: { range: [C.burgundyTint, C.oxblood] },
          },
          tooltip: [
            { field: "brand", title: "Brand" },
            { field: "sales", type: "quantitative", title: "Sales", format: "$,.0f" },
            { field: "margin_rate", type: "quantitative", title: "Margin rate", format: ".1%" },
            { field: "orders", type: "quantitative", title: "Orders", format: "," },
          ],
        },
      },
      {
        mark: { type: "text", align: "left", dx: 8, fontSize: 11, color: C.ink2, font: FONT_STACK },
        encoding: { text: { field: "vlabel" } },
      },
    ],
  };
}

// ── small pieces ───────────────────────────────────────────────────────────

/** 12-point sparkline in a single ink tint, with the latest point picked out
    in oxblood — decoration for spotting a shape, never the only readout. */
function Sparkline({ values, w = 92, h = 26 }) {
  if (!values || values.length < 2) return <div style={{ height: h, width: w }} />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const x = (i) => (i / (values.length - 1)) * (w - 6) + 3;
  const y = (v) => h - 4 - ((v - lo) / span) * (h - 8);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <path d={d} fill="none" stroke={C.burgundyTint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(values[last])} r="2.75" fill={C.oxblood} />
    </svg>
  );
}

function Delta({ value }) {
  if (value == null) return <span style={{ color: C.muted, fontSize: 12 }}>—</span>;
  const good = value >= 0;
  const color = good ? C.sage : C.rust;
  return (
    <span style={{ color, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>
      {good ? "↑" : "↓"} {signedPct(value)}
      <span style={{ color: C.muted, fontWeight: 400 }}> vs prior 3 mo</span>
    </span>
  );
}

function Pill({ label, color, bg }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px 3px 7px",
        borderRadius: 20,
        fontSize: 11.5,
        fontWeight: 600,
        color,
        background: bg,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flex: "none" }} />
      {label}
    </span>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="bt-stat">
      <div className="bt-stat-label">{label}</div>
      <div className="bt-stat-value">{value}</div>
      {hint ? <div className="bt-stat-hint">{hint}</div> : null}
    </div>
  );
}

function Card({ title, subtitle, children, className, wide }) {
  return (
    <section className={`bt-card${wide ? " bt-card-wide" : ""}${className ? " " + className : ""}`}>
      <header className="bt-card-head">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

function EmptyState({ children }) {
  return <p className="bt-empty">{children}</p>;
}

// ── the dashboard ──────────────────────────────────────────────────────────

export default function Dashboard({ givens }) {
  const kpi = useQuery({ query: "brand_trends_dashboard", givens });
  const trend = useQuery({ query: "brand_trend", givens });
  const ranking = useQuery({ query: "brand_ranking", givens });

  const k = kpi.rows?.[0] ?? {};
  const months = useMemo(() => completeMonths(trend.rows ?? []), [trend.rows]);
  const brands = ranking.rows ?? [];

  const heroDelta = trailingDelta(months, "sales");
  const anyError = [kpi, trend, ranking].find((q) => q.error);
  const busy = [kpi, trend, ranking].some((q) => q.loading);
  const noData = !busy && !anyError && !months.length && !brands.length;

  return (
    <div className="bt">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Archivo:wght@400;500;600;700&display=swap"
      />
      <style>{css}</style>

      <header className="bt-appbar">
        <div className="bt-badge">MB</div>
        <div className="bt-wordmark">Maison Baungarten</div>
        <nav className="bt-tabs" aria-hidden="true">
          <span className="bt-tab">Overview</span>
          <span className="bt-tab bt-tab-active">Brand Trends</span>
          <span className="bt-tab">Catalog</span>
          <span className="bt-tab">Customers</span>
        </nav>
      </header>

      <div className="bt-body">
        <div className="bt-eyebrow">Purchasing · Brand performance</div>
        <h1 className="bt-title">Brand Trends</h1>
        <p className="bt-subtitle">
          How each label in the edit is selling — one trend to watch, a ranking of the house, and the brands worth a
          call this week.
        </p>

        <Controls className="bt-controls">
          <TimeRange given="PERIOD" />
          <Select given="DEPARTMENT" />
          <MultiSelect given="CATEGORY" />
          <Search given="BRAND" />
          <Search given="PRODUCT" />
        </Controls>

        {anyError ? <pre className="bt-error">{String(anyError.error)}</pre> : null}

        <div className="bt-grid" style={{ opacity: busy ? 0.55 : 1 }}>
          {/* Lead with the decision, not the data: one hero figure. */}
          <section className="bt-hero">
            <div className="bt-stat-label">Total sales</div>
            <div className="bt-hero-value">{usd(k.sales)}</div>
            <div className="bt-hero-foot">
              <Delta value={heroDelta} />
              <Sparkline values={sparkValues(months, "sales")} w={130} h={32} />
            </div>
          </section>

          <div className="bt-stats">
            <Stat label="Gross margin" value={usd(k.margin)} hint={pct(k.margin_rate) + " margin rate"} />
            <Stat label="Orders" value={num(k.orders)} hint={usd2(k.avg_order_value) + " avg order"} />
            <Stat label="Brands carried" value={num(k.brands)} hint="in the current filter" />
          </div>

          <Card title="Sales trend" subtitle="Monthly, filtered mix. In-progress months are excluded." wide>
            {months.length ? <VegaChart spec={trendSpec} data={months} /> : <EmptyState>No sales in this window yet — try widening the filters.</EmptyState>}
          </Card>

          <Card title="Sales by brand" subtitle="Ranked by total sales; darker means higher." className="bt-span-6">
            {brands.length ? (
              <VegaChart spec={rankingSpec(brands)} data={brands} />
            ) : (
              <EmptyState>No brands in this window yet.</EmptyState>
            )}
          </Card>

          <Card title="Brand leaderboard" subtitle="Sales, margin, and momentum for the top brands." className="bt-span-6">
            {brands.length ? (
              <table className="bt-table">
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th className="bt-num">Sales</th>
                    <th className="bt-num">Margin</th>
                    <th>Trend</th>
                    <th>Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((b) => {
                    const m = momentum(b.trend);
                    return (
                      <tr key={b.brand}>
                        <td className="bt-brand-name">{b.brand}</td>
                        <td className="bt-num">{usd(b.sales)}</td>
                        <td className="bt-num">{pct(b.margin_rate, 0)}</td>
                        <td>
                          <Sparkline values={sparkValues(b.trend, "month_sales")} />
                        </td>
                        <td>
                          <Pill label={m.label} color={m.color} bg={m.bg} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyState>No brands to rank in this window yet — check back once the filters clear.</EmptyState>
            )}
          </Card>
        </div>

        {noData ? <EmptyState>No sales in this window yet — check back once the week closes.</EmptyState> : null}
      </div>
    </div>
  );
}

// ── styles ─────────────────────────────────────────────────────────────────
// Corner-radius tokens straight from the brand book: controls 2px, cards 6px,
// hero 12px. No card shadows — a hairline (Line, #E1CDC9) does the separating.
const css = `
.bt {
  --dash-fg: ${C.ink};
  --dash-muted: ${C.ink2};
  --dash-border: ${C.line};
  --dash-accent: ${C.oxblood};
  --dash-accent-fg: ${C.paper};
  --dash-control-bg: #ffffff;
  --dash-controls-bg: transparent;
  --dash-chip-bg: ${C.oxblood}14;
  --dash-chip-fg: ${C.ink};
  --dash-radius: 2px;
  font-family: ${SANS};
  color: ${C.ink};
  background: ${C.paper};
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
.bt * { box-sizing: border-box; }

.bt-appbar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 24px;
  background: ${C.burgundyDeep};
  color: ${C.paper};
}
.bt-badge {
  width: 28px; height: 28px; flex: none;
  display: flex; align-items: center; justify-content: center;
  border-radius: 6px;
  background: ${C.oxblood};
  color: ${C.paper};
  font-family: ${SERIF};
  font-weight: 600;
  font-size: 13px;
}
.bt-wordmark { font-family: ${SERIF}; font-size: 15px; font-weight: 500; letter-spacing: 0.01em; margin-right: 10px; }
.bt-tabs { display: flex; gap: 4px; margin-left: 6px; }
.bt-tab {
  font-size: 12.5px; font-weight: 500; padding: 5px 11px; border-radius: 20px;
  color: ${C.burgundyTint};
}
.bt-tab-active { color: ${C.paper}; background: rgba(241,233,230,0.12); }

.bt-body { max-width: 1180px; margin: 0 auto; padding: 28px 24px 56px; }

.bt-eyebrow {
  font-size: 11px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase;
  color: ${C.brass};
}
.bt-title {
  font-family: ${SERIF}; font-weight: 500; letter-spacing: -0.01em;
  font-size: 34px; margin: 6px 0 8px; color: ${C.ink};
}
.bt-subtitle { font-size: 14px; line-height: 1.55; color: ${C.ink2}; max-width: 62ch; margin: 0 0 20px; }

.bt-controls {
  display: flex; flex-wrap: wrap; gap: 8px;
  padding: 10px 0 18px;
  border-bottom: 1px solid ${C.line};
  margin-bottom: 20px;
}

.bt-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 14px;
  transition: opacity .18s ease;
}

.bt-hero {
  grid-column: span 4;
  background: ${C.card};
  border: 1px solid ${C.line};
  border-radius: 12px;
  padding: 18px 20px 16px;
  display: flex; flex-direction: column; gap: 6px;
}
.bt-hero-value {
  font-family: ${SANS}; font-weight: 700; letter-spacing: -0.02em;
  font-size: 42px; line-height: 1.05; color: ${C.ink};
  font-variant-numeric: tabular-nums;
}
.bt-hero-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 6px; }

.bt-stats { grid-column: span 8; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.bt-stat {
  background: ${C.card};
  border: 1px solid ${C.line};
  border-radius: 6px;
  padding: 14px 16px 12px;
  display: flex; flex-direction: column; gap: 4px;
}
.bt-stat-label { font-size: 10.5px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: ${C.muted}; }
.bt-stat-value { font-size: 22px; font-weight: 650; letter-spacing: -0.015em; color: ${C.ink}; font-variant-numeric: tabular-nums; }
.bt-stat-hint { font-size: 11.5px; color: ${C.muted}; }

.bt-card {
  grid-column: span 12;
  background: ${C.card};
  border: 1px solid ${C.line};
  border-radius: 6px;
  padding: 16px 18px 14px;
  min-width: 0;
}
.bt-span-6 { grid-column: span 6; }
.bt-card-head { margin-bottom: 12px; }
.bt-card-head h2 { margin: 0; font-size: 13.5px; font-weight: 600; color: ${C.ink}; }
.bt-card-head p { margin: 3px 0 0; font-size: 11.5px; line-height: 1.45; color: ${C.muted}; }

.bt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bt-table th {
  text-align: left; font-size: 10.5px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
  color: ${C.muted}; padding: 0 8px 8px 0; border-bottom: 1px solid ${C.line};
}
.bt-table td { padding: 9px 8px 9px 0; border-bottom: 1px solid ${C.line}; vertical-align: middle; }
.bt-table tr:last-child td { border-bottom: none; }
.bt-brand-name { font-weight: 600; color: ${C.ink}; }
.bt-num { text-align: right; font-variant-numeric: tabular-nums; color: ${C.ink}; }
th.bt-num { text-align: right; }

.bt-empty {
  margin: 0; padding: 22px 0; text-align: center;
  font-family: ${SERIF}; font-style: italic; font-size: 13.5px; color: ${C.muted};
}
.bt-error {
  white-space: pre-wrap; color: ${C.rust};
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
  background: ${C.card}; border: 1px solid ${C.line}; border-radius: 6px; padding: 12px 14px;
  margin-bottom: 16px;
}

@media (max-width: 980px) {
  .bt-hero, .bt-stats, .bt-span-6 { grid-column: span 12; }
  .bt-stats { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 620px) {
  .bt-body { padding: 20px 14px 40px; }
  .bt-appbar { padding: 10px 14px; flex-wrap: wrap; }
  .bt-tabs { order: 3; width: 100%; margin-left: 0; }
  .bt-title { font-size: 26px; }
  .bt-stats { grid-template-columns: 1fr; }
}
`;
