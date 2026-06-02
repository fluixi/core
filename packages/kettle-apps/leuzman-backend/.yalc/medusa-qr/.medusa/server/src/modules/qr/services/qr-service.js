"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
const generate_qr_1 = require("../../../utils/generate-qr");
const sign_payload_1 = require("../../../utils/sign-payload");
// import { nanoid } from "nanoid"
const qr_1 = require("../models/qr");
class QRService extends (0, utils_1.MedusaService)({
    QR: qr_1.QR,
}) {
    async generate({ resource_type, resource_id, action }) {
        const code = await import('nanoid').then((nanoid) => nanoid.nanoid());
        const payload = (0, sign_payload_1.signPayload)({
            resource_type,
            resource_id,
            action,
            code,
        });
        const image = await (0, generate_qr_1.generateQRImage)(payload);
        return await this.createQRs({
            code,
            resource_type,
            resource_id,
            action,
            payload,
            image_url: image,
        });
    }
    // async resolve(code: string) {
    //   const qr = await this.retrieveQR({ code })
    //   if (!qr) throw new Error("QR not found")
    //   await this.updateQRs({
    //     id: qr.id,
    //     scan_count: qr.scan_count + 1,
    //     last_scanned_at: new Date(),
    //   })
    //   return qr
    // }
    async resolve(code) {
        const [qr] = await this.listQRs({
            code,
        });
        if (!qr) {
            throw new Error('QR not found');
        }
        await this.updateQRs({
            id: qr.id,
            scan_count: qr.scan_count + 1,
            last_scanned_at: new Date(),
        });
        return qr;
    }
    async execute(qr) {
        switch (qr.action) {
            case 'view':
                return {
                    type: 'redirect',
                    url: `/products/${qr.resource_id}`,
                };
            case 'add_to_cart':
                return {
                    type: 'cart',
                    variant_id: qr.resource_id,
                };
            case 'verify':
                return {
                    type: 'verify',
                    valid: true,
                };
        }
    }
}
exports.default = QRService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXItc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3FyL3NlcnZpY2VzL3FyLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxREFBeUQ7QUFDekQsNERBQTREO0FBQzVELDhEQUF5RDtBQUN6RCxrQ0FBa0M7QUFDbEMscUNBQWlDO0FBRWpDLE1BQU0sU0FBVSxTQUFRLElBQUEscUJBQWEsRUFBQztJQUNwQyxFQUFFLEVBQUUsT0FBRTtDQUNQLENBQUM7SUFDQSxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUU7UUFDbkQsTUFBTSxJQUFJLEdBQUcsTUFBTSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUV0RSxNQUFNLE9BQU8sR0FBRyxJQUFBLDBCQUFXLEVBQUM7WUFDMUIsYUFBYTtZQUNiLFdBQVc7WUFDWCxNQUFNO1lBQ04sSUFBSTtTQUNMLENBQUMsQ0FBQztRQUVILE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBQSw2QkFBZSxFQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTdDLE9BQU8sTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQzFCLElBQUk7WUFDSixhQUFhO1lBQ2IsV0FBVztZQUNYLE1BQU07WUFDTixPQUFPO1lBQ1AsU0FBUyxFQUFFLEtBQUs7U0FDakIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELGdDQUFnQztJQUNoQywrQ0FBK0M7SUFFL0MsNkNBQTZDO0lBRTdDLDJCQUEyQjtJQUMzQixpQkFBaUI7SUFDakIscUNBQXFDO0lBQ3JDLG1DQUFtQztJQUNuQyxPQUFPO0lBRVAsY0FBYztJQUNkLElBQUk7SUFFSixLQUFLLENBQUMsT0FBTyxDQUFDLElBQVk7UUFDeEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUM5QixJQUFJO1NBQ0wsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ1IsTUFBTSxJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ25CLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtZQUNULFVBQVUsRUFBRSxFQUFFLENBQUMsVUFBVSxHQUFHLENBQUM7WUFDN0IsZUFBZSxFQUFFLElBQUksSUFBSSxFQUFFO1NBQzVCLENBQUMsQ0FBQztRQUVILE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUNkLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLEtBQUssTUFBTTtnQkFDVCxPQUFPO29CQUNMLElBQUksRUFBRSxVQUFVO29CQUNoQixHQUFHLEVBQUUsYUFBYSxFQUFFLENBQUMsV0FBVyxFQUFFO2lCQUNuQyxDQUFDO1lBRUosS0FBSyxhQUFhO2dCQUNoQixPQUFPO29CQUNMLElBQUksRUFBRSxNQUFNO29CQUNaLFVBQVUsRUFBRSxFQUFFLENBQUMsV0FBVztpQkFDM0IsQ0FBQztZQUVKLEtBQUssUUFBUTtnQkFDWCxPQUFPO29CQUNMLElBQUksRUFBRSxRQUFRO29CQUNkLEtBQUssRUFBRSxJQUFJO2lCQUNaLENBQUM7UUFDTixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBRUQsa0JBQWUsU0FBUyxDQUFBIn0=