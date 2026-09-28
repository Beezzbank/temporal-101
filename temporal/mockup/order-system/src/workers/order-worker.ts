import { Worker } from '@temporalio/worker';
import * as activities from '../activities'; // ฟังก์ชันที่ยิงหา payment-service

async function run() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('../workflows/order-workflow'), // ชี้ไปที่ไฟล์ workflow
    activities,                                                  // โหลด activities เข้ามา
    taskQueue: 'order-processing-queue',                        // ชื่อ Queue
  });

  console.log('⚙️ Order Fulfillment Worker started and listening...');
  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
