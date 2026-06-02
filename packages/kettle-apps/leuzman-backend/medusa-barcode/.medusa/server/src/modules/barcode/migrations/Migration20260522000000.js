"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20260522000000 = void 0;
const migrations_1 = require("@medusajs/framework/mikro-orm/migrations");
class Migration20260522000000 extends migrations_1.Migration {
    async up() {
        // ── barcode_cache ──────────────────────────────────────────────────────
        this.addSql(`
      CREATE TABLE IF NOT EXISTS "barcode_cache" (
        "id"              text          NOT NULL,
        "barcode"         text          NOT NULL,
        "provider"        text          NOT NULL,
        "raw_response"    jsonb         NOT NULL DEFAULT '{}',
        "normalized_data" jsonb         NULL,
        "expires_at"      timestamptz   NULL,
        "created_at"      timestamptz   NOT NULL DEFAULT now(),
        "updated_at"      timestamptz   NOT NULL DEFAULT now(),
        "deleted_at"      timestamptz   NULL,
        CONSTRAINT "PK_barcode_cache" PRIMARY KEY ("id")
      );
    `);
        // Composite index for the primary lookup pattern: barcode + provider
        this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_barcode_cache_barcode"
      ON "barcode_cache" ("barcode")
      WHERE deleted_at IS NULL;
    `);
        this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_barcode_cache_provider"
      ON "barcode_cache" ("provider")
      WHERE deleted_at IS NULL;
    `);
        this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_barcode_cache_barcode_provider"
      ON "barcode_cache" ("barcode", "provider")
      WHERE deleted_at IS NULL;
    `);
        // Partial index for fast "non-expired only" queries
        this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_barcode_cache_expires_at"
      ON "barcode_cache" ("expires_at")
      WHERE deleted_at IS NULL AND expires_at IS NOT NULL;
    `);
        // ── barcode_product ────────────────────────────────────────────────────
        this.addSql(`
      CREATE TABLE IF NOT EXISTS "barcode_product" (
        "id"               text         NOT NULL,
        "barcode"          text         NOT NULL,
        "product_id"       text         NOT NULL,
        "variant_id"       text         NULL,
        "source_provider"  text         NULL,
        "confidence_score" real         NULL,
        "created_at"       timestamptz  NOT NULL DEFAULT now(),
        "updated_at"       timestamptz  NOT NULL DEFAULT now(),
        "deleted_at"       timestamptz  NULL,
        CONSTRAINT "PK_barcode_product" PRIMARY KEY ("id")
      );
    `);
        // One barcode → at most one product record (soft-delete aware)
        this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_barcode_product_barcode_unique"
      ON "barcode_product" ("barcode")
      WHERE deleted_at IS NULL;
    `);
        this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_barcode_product_product_id"
      ON "barcode_product" ("product_id")
      WHERE deleted_at IS NULL;
    `);
        this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_barcode_product_variant_id"
      ON "barcode_product" ("variant_id")
      WHERE deleted_at IS NULL AND variant_id IS NOT NULL;
    `);
    }
    async down() {
        this.addSql(`DROP INDEX IF EXISTS "IDX_barcode_cache_barcode";`);
        this.addSql(`DROP INDEX IF EXISTS "IDX_barcode_cache_provider";`);
        this.addSql(`DROP INDEX IF EXISTS "IDX_barcode_cache_barcode_provider";`);
        this.addSql(`DROP INDEX IF EXISTS "IDX_barcode_cache_expires_at";`);
        this.addSql(`DROP TABLE IF EXISTS "barcode_cache";`);
        this.addSql(`DROP INDEX IF EXISTS "IDX_barcode_product_barcode_unique";`);
        this.addSql(`DROP INDEX IF EXISTS "IDX_barcode_product_product_id";`);
        this.addSql(`DROP INDEX IF EXISTS "IDX_barcode_product_variant_id";`);
        this.addSql(`DROP TABLE IF EXISTS "barcode_product";`);
    }
}
exports.Migration20260522000000 = Migration20260522000000;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNjA1MjIwMDAwMDAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9iYXJjb2RlL21pZ3JhdGlvbnMvTWlncmF0aW9uMjAyNjA1MjIwMDAwMDAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEseUVBQW9FO0FBRXBFLE1BQWEsdUJBQXdCLFNBQVEsc0JBQVM7SUFDM0MsS0FBSyxDQUFDLEVBQUU7UUFDZiwwRUFBMEU7UUFFMUUsSUFBSSxDQUFDLE1BQU0sQ0FBQzs7Ozs7Ozs7Ozs7OztLQWFYLENBQUMsQ0FBQTtRQUVGLHFFQUFxRTtRQUNyRSxJQUFJLENBQUMsTUFBTSxDQUFDOzs7O0tBSVgsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FBQzs7OztLQUlYLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxNQUFNLENBQUM7Ozs7S0FJWCxDQUFDLENBQUE7UUFDRixvREFBb0Q7UUFDcEQsSUFBSSxDQUFDLE1BQU0sQ0FBQzs7OztLQUlYLENBQUMsQ0FBQTtRQUVGLDBFQUEwRTtRQUUxRSxJQUFJLENBQUMsTUFBTSxDQUFDOzs7Ozs7Ozs7Ozs7O0tBYVgsQ0FBQyxDQUFBO1FBRUYsK0RBQStEO1FBQy9ELElBQUksQ0FBQyxNQUFNLENBQUM7Ozs7S0FJWCxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsTUFBTSxDQUFDOzs7O0tBSVgsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FBQzs7OztLQUlYLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFUSxLQUFLLENBQUMsSUFBSTtRQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLG1EQUFtRCxDQUFDLENBQUE7UUFDaEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvREFBb0QsQ0FBQyxDQUFBO1FBQ2pFLElBQUksQ0FBQyxNQUFNLENBQUMsNERBQTRELENBQUMsQ0FBQTtRQUN6RSxJQUFJLENBQUMsTUFBTSxDQUFDLHNEQUFzRCxDQUFDLENBQUE7UUFDbkUsSUFBSSxDQUFDLE1BQU0sQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFBO1FBRXBELElBQUksQ0FBQyxNQUFNLENBQUMsNERBQTRELENBQUMsQ0FBQTtRQUN6RSxJQUFJLENBQUMsTUFBTSxDQUFDLHdEQUF3RCxDQUFDLENBQUE7UUFDckUsSUFBSSxDQUFDLE1BQU0sQ0FBQyx3REFBd0QsQ0FBQyxDQUFBO1FBQ3JFLElBQUksQ0FBQyxNQUFNLENBQUMseUNBQXlDLENBQUMsQ0FBQTtJQUN4RCxDQUFDO0NBQ0Y7QUF6RkQsMERBeUZDIn0=