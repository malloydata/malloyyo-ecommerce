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
work. Everything is served from that one port, custom (iframe) dashboards
included: the frame is isolated by its opaque sandbox origin rather than by a
second port. (Needs malloyyo 0.2.41+; earlier versions used a second origin on
4174 and could not be reached through a proxy or a forwarded port.)

**Open dashboards through the forwarded URL, not `http://localhost:4173`.** In
the **Ports** panel, right-click 4173 → **Preview in Editor**, or use the
preview that opens on its own — either way VS Code substitutes the forwarded URL
for you. VS Code's Simple Browser does no such rewriting: hand it a `localhost`
address and it resolves that on *your* machine, where nothing is listening, and
the panel just comes up blank.

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
