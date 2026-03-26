# Prevntiv PostgreSQL Migrations

## Flyway migration naming strategy

Use incremental semantic versions in this format:

- `V1__initial_schema.sql`
- `V2__rls_policies.sql`
- `V3__indexes.sql`
- `V4__seed_dev.sql`

Rules:

1. Prefix with `V` and a monotonically increasing integer.
2. Use `__` between version and description.
3. Description uses lowercase snake_case and reflects one concern per migration.
4. Do not edit applied migrations; create a new higher version migration for changes.
5. Keep seed data idempotent (`ON CONFLICT DO NOTHING`) for local reproducibility.

## Current migration order

1. Schema objects and enum types
2. RLS helper functions and policies
3. Performance indexes
4. Development seed dataset
