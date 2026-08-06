# Sample Network Data

These CSVs match the schemas in `02-data-and-systems.md` and can be uploaded
through the dashboard's **Import Network** button.

- `transformers.csv` — distribution transformer registry
- `poles.csv` — pole registry (with official topology for one transformer)

**Note:** the application is already **seeded on startup** with a much larger
synthetic network (≈900 poles across 16 transformers, ~60% of transformers
with missing official pole ordering, ~9% of poles without devices). You only
need these files if you want to re-import the small demonstration network
after clearing the database.
