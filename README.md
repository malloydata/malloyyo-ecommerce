# malloyyo-ecommerce

A [Malloy](https://www.malloydata.dev/) semantic model over a fictional
e-commerce dataset (orders, users, products, inventory).

## Contents

- `ecommerce.malloy` — sources for `users`, `product`, `inventory_items`,
  `user_order_facts`, and the top-level `order_items` source, with measures
  (`total_sales`, `total_gross_margin`, …) and a rich set of dashboard views.
- `index.malloy` — entry point that re-exports the `order_items` source.
- `gs.malloy` / `md.malloy` — interchangeable storage layers defining the same
  four table sources. `ecommerce.malloy` imports one of them; that import is the
  only line that changes when you switch storage.

Data source: `https://storage.googleapis.com/malloyyo/ecommerce/*.parquet`

## Running

### In a cloud container (Codespaces)

Open the repo in a Codespace. `.devcontainer/devcontainer.json` installs the
`malloyyo` CLI and Claude Code, and forwards the dashboard ports. Then:

    malloyyo lint            # compile the model, validate ./dashboards
    malloyyo dashboard dev   # serve dashboards on :4173

Codespaces forwards 4173 to an HTTPS URL, so the dashboards are viewable and
fully interactive in your own browser — givens, filters and drill-downs all
work. Port 4174 is forwarded too: `dashboard dev` renders custom (iframe)
dashboards from that separate artifact origin, and without it
`product_explorer_dashboard` and `seasonality` render blank.

Forwarded ports are private to you by default. If the iframe dashboards fail to
load, set port 4174's visibility to match 4173 in the **Ports** panel.

**No credentials are required.** The model reads public Parquet over HTTPS, so a
fresh container can compile and serve every dashboard with nothing configured.

### Locally

Open the folder in VS Code with the
[Malloy extension](https://marketplace.visualstudio.com/items?itemName=malloydata.malloy-vscode),
or use the Malloyyo MCP server configured in `.mcp.json` (it runs `malloyyo mcp
--develop`, so the CLI must be on your PATH).

## Storage

`ecommerce.malloy` imports `gs.malloy` — public Parquet on Google Cloud Storage,
which needs no credentials and is what makes the cloud container work unattended.

To switch to MotherDuck (same data, faster), change that one import to
`md.malloy` and set `MALLOYYO_TOKEN`. Both files define the same source names,
so nothing else in the model changes.
