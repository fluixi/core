"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = barcodeCacheWarmup;
async function barcodeCacheWarmup(container) {
    const queue = container.resolve('barcodeCacheQueue');
    await queue.add('warmAll', { type: 'warmAll' }, {
        jobId: `barcode-warmall-${new Date().toISOString().slice(0, 10)}`,
        removeOnComplete: 10,
        removeOnFail: 20,
    });
    console.log('[barcode-cache-warmup] warmAll job enqueued');
}
exports.config = {
    name: 'barcode-cache-warmup',
    // 02:00 every day
    schedule: '0 2 * * *',
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFyY29kZS1jYWNoZS13YXJtdXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvam9icy9iYXJjb2RlLWNhY2hlLXdhcm11cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFRQSxxQ0FZQztBQVpjLEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxTQUEwQjtJQUN6RSxNQUFNLEtBQUssR0FBVSxTQUFTLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUE7SUFDM0QsTUFBTSxLQUFLLENBQUMsR0FBRyxDQUNiLFNBQVMsRUFDVCxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsRUFDbkI7UUFDRSxLQUFLLEVBQVksbUJBQW1CLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRTtRQUMzRSxnQkFBZ0IsRUFBRSxFQUFFO1FBQ3BCLFlBQVksRUFBTSxFQUFFO0tBQ3JCLENBQ0YsQ0FBQTtJQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsNkNBQTZDLENBQUMsQ0FBQTtBQUM1RCxDQUFDO0FBRVksUUFBQSxNQUFNLEdBQUc7SUFDcEIsSUFBSSxFQUFFLHNCQUFzQjtJQUM1QixrQkFBa0I7SUFDbEIsUUFBUSxFQUFFLFdBQVc7Q0FDdEIsQ0FBQSJ9