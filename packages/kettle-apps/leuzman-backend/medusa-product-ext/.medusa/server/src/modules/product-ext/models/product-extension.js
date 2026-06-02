"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductExtension = void 0;
const utils_1 = require("@medusajs/framework/utils");
/**
 * One extension record per Medusa product (1:1 via product_id).
 * Stores extra attributes that don't exist on Medusa's core product model.
 */
exports.ProductExtension = utils_1.model.define('product_extension', {
    id: utils_1.model.id().primaryKey(),
    product_id: utils_1.model.text().unique(),
    /** Uploaded video items — each has a public S3 URL, original filename, and MIME type. */
    videos: utils_1.model.json(),
    /** Optional short promotional text shown below the product title. */
    tagline: utils_1.model.text().nullable(),
});
exports.default = exports.ProductExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdC1leHRlbnNpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9wcm9kdWN0LWV4dC9tb2RlbHMvcHJvZHVjdC1leHRlbnNpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscURBQWtEO0FBRWxEOzs7R0FHRztBQUNVLFFBQUEsZ0JBQWdCLEdBQUcsYUFBSyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRTtJQUNoRSxFQUFFLEVBQVUsYUFBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLFVBQVUsRUFBRTtJQUNuQyxVQUFVLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRTtJQUVqQyx5RkFBeUY7SUFDekYsTUFBTSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFFcEIscUVBQXFFO0lBQ3JFLE9BQU8sRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0NBQ2pDLENBQUMsQ0FBQztBQUVILGtCQUFlLHdCQUFnQixDQUFDIn0=