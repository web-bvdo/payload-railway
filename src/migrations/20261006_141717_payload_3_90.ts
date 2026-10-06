import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Core-migratie (Payload 3.90): raakt alleen core-tabellen en is idempotent, want ze landt
// via de Railway upstream-update op élke klant-site. Bewust zonder .json-snapshot — zie
// docs/MAINTAINING.md.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_password_requested_at" timestamp(3) with time zone;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "users" DROP COLUMN IF EXISTS "reset_password_requested_at";`)
}
