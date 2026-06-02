"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20260514000000 = void 0;
const migrations_1 = require("@medusajs/framework/mikro-orm/migrations");
class Migration20260514000000 extends migrations_1.Migration {
    async up() {
        this.addSql(`
      CREATE TABLE IF NOT EXISTS "product_extension" (
        "id"         text        NOT NULL,
        "product_id" text        NOT NULL,
        "videos"     jsonb       NOT NULL DEFAULT '[]',
        "tagline"    text        NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_product_extension" PRIMARY KEY ("id")
      );
    `);
        this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_extension_product_id"
      ON "product_extension" ("product_id") WHERE deleted_at IS NULL;
    `);
    }
    async down() {
        this.addSql(`DROP INDEX IF EXISTS "IDX_product_extension_product_id";`);
        this.addSql(`DROP TABLE IF EXISTS "product_extension";`);
    }
}
exports.Migration20260514000000 = Migration20260514000000;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNjA1MTQwMDAwMDAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9wcm9kdWN0LWV4dC9taWdyYXRpb25zL01pZ3JhdGlvbjIwMjYwNTE0MDAwMDAwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHlFQUFxRTtBQUVyRSxNQUFhLHVCQUF3QixTQUFRLHNCQUFTO0lBQzNDLEtBQUssQ0FBQyxFQUFFO1FBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQzs7Ozs7Ozs7Ozs7S0FXWCxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsTUFBTSxDQUFDOzs7S0FHWCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRVEsS0FBSyxDQUFDLElBQUk7UUFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQywwREFBMEQsQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxNQUFNLENBQUMsMkNBQTJDLENBQUMsQ0FBQztJQUMzRCxDQUFDO0NBQ0Y7QUF4QkQsMERBd0JDIn0=