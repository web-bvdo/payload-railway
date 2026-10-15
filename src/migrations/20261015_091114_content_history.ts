import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Historie (versions) voor de template-pagina `home`. Uitzondering op "nooit home in een
// template-migratie": alles staat achter één guard en gebeurt alleen als `_home_v` nog niet
// bestaat. Een klant-site maakt zijn eigen `_home_v` (eigen velden) met een eigen migratie;
// komt deze er later toch bij, dan slaat hij zichzelf over. Zonder .json-snapshot — zie
// docs/MAINTAINING.md.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
  IF to_regclass('public._home_v') IS NULL THEN
    CREATE TABLE "_home_v" (
      "id" serial PRIMARY KEY NOT NULL,
      "version_hero_title" varchar DEFAULT 'Welkom' NOT NULL,
      "version_hero_subtitle" varchar DEFAULT 'Bewerk deze tekst in /admin — geen developer nodig.',
      "version_hero_image_id" integer,
      "version_intro" jsonb DEFAULT '{"root":{"type":"root","format":"","indent":0,"version":1,"direction":"ltr","children":[{"type":"paragraph","format":"","indent":0,"version":1,"direction":"ltr","textFormat":0,"children":[{"type":"text","text":"Dit is de intro-tekst uit het ontwerp.","format":0,"style":"","mode":"normal","detail":0,"version":1}]}]}}'::jsonb,
      "version_text2" jsonb,
      "version_updated_at" timestamp(3) with time zone,
      "version_created_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX "_home_v_version_version_hero_image_idx" ON "_home_v" USING btree ("version_hero_image_id");
    CREATE INDEX "_home_v_created_at_idx" ON "_home_v" USING btree ("created_at");
    CREATE INDEX "_home_v_updated_at_idx" ON "_home_v" USING btree ("updated_at");
  END IF;
  END $$;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP TABLE IF EXISTS "_home_v" CASCADE;`)
}
