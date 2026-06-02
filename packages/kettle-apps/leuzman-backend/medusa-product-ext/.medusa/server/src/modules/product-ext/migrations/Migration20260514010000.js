"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20260514010000 = void 0;
const migrations_1 = require("@medusajs/framework/mikro-orm/migrations");
class Migration20260514010000 extends migrations_1.Migration {
    async up() {
        this.addSql(`
      CREATE TABLE IF NOT EXISTS "variant_extension" (
        "id"         text        NOT NULL,
        "variant_id" text        NOT NULL,
        "videos"     jsonb       NOT NULL DEFAULT '[]',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_variant_extension" PRIMARY KEY ("id")
      );
    `);
        this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_variant_extension_variant_id"
      ON "variant_extension" ("variant_id") WHERE deleted_at IS NULL;
    `);
    }
    async down() {
        this.addSql(`DROP INDEX IF EXISTS "IDX_variant_extension_variant_id";`);
        this.addSql(`DROP TABLE IF EXISTS "variant_extension";`);
    }
}
exports.Migration20260514010000 = Migration20260514010000;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNjA1MTQwMTAwMDAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9wcm9kdWN0LWV4dC9taWdyYXRpb25zL01pZ3JhdGlvbjIwMjYwNTE0MDEwMDAwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHlFQUFxRTtBQUVyRSxNQUFhLHVCQUF3QixTQUFRLHNCQUFTO0lBQzNDLEtBQUssQ0FBQyxFQUFFO1FBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQzs7Ozs7Ozs7OztLQVVYLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxNQUFNLENBQUM7OztLQUdYLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFUSxLQUFLLENBQUMsSUFBSTtRQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLDBEQUEwRCxDQUFDLENBQUM7UUFDeEUsSUFBSSxDQUFDLE1BQU0sQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO0lBQzNELENBQUM7Q0FDRjtBQXZCRCwwREF1QkMifQ==