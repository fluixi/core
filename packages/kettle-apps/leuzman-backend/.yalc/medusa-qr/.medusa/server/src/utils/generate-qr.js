"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQRImage = generateQRImage;
const qrcode_1 = __importDefault(require("qrcode"));
async function generateQRImage(payload) {
    return await qrcode_1.default.toDataURL(JSON.stringify(payload));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUtcXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvdXRpbHMvZ2VuZXJhdGUtcXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFFQSwwQ0FFQztBQUpELG9EQUEyQjtBQUVwQixLQUFLLFVBQVUsZUFBZSxDQUFDLE9BQVk7SUFDaEQsT0FBTyxNQUFNLGdCQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtBQUN4RCxDQUFDIn0=