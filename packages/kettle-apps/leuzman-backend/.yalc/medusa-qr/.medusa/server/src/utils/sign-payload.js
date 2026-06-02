"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signPayload = signPayload;
const crypto_1 = __importDefault(require("crypto"));
const SECRET = process.env.QR_SECRET || "secret";
function signPayload(data) {
    const signature = crypto_1.default
        .createHmac("sha256", SECRET)
        .update(JSON.stringify(data))
        .digest("hex");
    return { ...data, signature };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnbi1wYXlsb2FkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3V0aWxzL3NpZ24tcGF5bG9hZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUlBLGtDQU9DO0FBWEQsb0RBQTJCO0FBRTNCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxJQUFJLFFBQVEsQ0FBQTtBQUVoRCxTQUFnQixXQUFXLENBQUMsSUFBUztJQUNuQyxNQUFNLFNBQVMsR0FBRyxnQkFBTTtTQUNyQixVQUFVLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQztTQUM1QixNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUM1QixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7SUFFaEIsT0FBTyxFQUFFLEdBQUcsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFBO0FBQy9CLENBQUMifQ==