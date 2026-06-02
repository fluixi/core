"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const prom_client_1 = require("prom-client");
const GET = async (_req, res) => {
    res.set('Content-Type', prom_client_1.register.contentType);
    res.send(await prom_client_1.register.metrics());
};
exports.GET = GET;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvYXBpL21ldHJpY3Mvcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBUUEsNkNBQXNDO0FBRS9CLE1BQU0sR0FBRyxHQUFHLEtBQUssRUFBRSxJQUFtQixFQUFFLEdBQW1CLEVBQUUsRUFBRTtJQUNwRSxHQUFHLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxzQkFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzdDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxzQkFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7QUFDcEMsQ0FBQyxDQUFBO0FBSFksUUFBQSxHQUFHLE9BR2YifQ==