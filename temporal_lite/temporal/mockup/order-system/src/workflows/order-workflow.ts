import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities';

// กำหนดเงื่อนไข Retry และ Timeout สำหรับ Activities
const { processPayment } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1 second',
    maximumAttempts: 3,
  },
});

export async function createOrderWorkflow(orderData: { orderId: string; amount: number }): Promise<string> {
  console.log(`[Workflow] Started order process for ID: ${orderData.orderId}`);

  // เรียกใช้ Payment Activity
  const result = await processPayment(orderData);

  console.log(`[Workflow] Order ${orderData.orderId} completed successfully`);
  return result;
}
