"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VariantExtension = void 0;
const utils_1 = require("@medusajs/framework/utils");
/**
 * One extension record per Medusa variant (1:1 via variant_id).
 * Stores extra attributes that don't exist on Medusa's core variant model.
 */
exports.VariantExtension = utils_1.model.define('variant_extension', {
    id: utils_1.model.id().primaryKey(),
    variant_id: utils_1.model.text().unique(),
    /** Uploaded video items — each has a public S3 URL, original filename, and MIME type. */
    videos: utils_1.model.json(),
});
exports.default = exports.VariantExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFyaWFudC1leHRlbnNpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9wcm9kdWN0LWV4dC9tb2RlbHMvdmFyaWFudC1leHRlbnNpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscURBQWtEO0FBRWxEOzs7R0FHRztBQUNVLFFBQUEsZ0JBQWdCLEdBQUcsYUFBSyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRTtJQUNoRSxFQUFFLEVBQVUsYUFBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLFVBQVUsRUFBRTtJQUNuQyxVQUFVLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRTtJQUVqQyx5RkFBeUY7SUFDekYsTUFBTSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUU7Q0FDckIsQ0FBQyxDQUFDO0FBRUgsa0JBQWUsd0JBQWdCLENBQUMifQ==