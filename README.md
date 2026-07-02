# malloyyo-ecommerce

A [Malloy](https://www.malloydata.dev/) semantic model over a fictional
e-commerce dataset (orders, users, products, inventory).

## Contents

- `ecommerce.malloy` — sources for `users`, `product`, `inventory_items`,
  `user_order_facts`, and the top-level `order_items` source, with measures
  (`total_sales`, `total_gross_margin`, …) and a rich set of dashboard views.
- `index.malloy` — entry point that re-exports the `order_items` source.

Data source: `https://storage.googleapis.com/malloyyo/ecommerce/*.parquet`

## Running

Open the folder in VS Code with the
[Malloy extension](https://marketplace.visualstudio.com/items?itemName=malloydata.malloy-vscode),
or use the Malloyyo MCP server configured in `.mcp.json`.
