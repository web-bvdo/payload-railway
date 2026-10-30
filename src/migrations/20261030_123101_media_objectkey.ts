import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Core-migratie: kolommen die de S3-plugin aan media toevoegt (alwaysInsertFields in
// payload.config.ts). Zonder deze kolommen faalt elke media-query in productie ('column
// "_objectkey" does not exist'). Raakt alleen media en is idempotent, want ze landt via
// fleet sync op élke klant-site. Bewust zonder .json-snapshot — zie docs/MAINTAINING.md.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "prefix" varchar DEFAULT '';
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "media" DROP COLUMN IF EXISTS "prefix";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "_objectkey";`)
}
