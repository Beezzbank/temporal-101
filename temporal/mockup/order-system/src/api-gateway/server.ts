import express from 'express';
import { Connection, Client } from '@temporalio/client';
import { createOrderWorkflow } from '../temporal/workflows';

const app = express();
app.use(express.json());

app.post('/orders', async (req, res) => {
  const { item, amount } = req.body;
  const orderId = `ORD-${Math.floor(Math.random() * 10000)}`;

  try {
    // เชื่อมต่อ Temporal Dev Server (ที่รันบน port 7233)
    const connection = await Connection.connect({ address: 'localhost:7233' });
    const client = new Client({ connection });

    // Trigger Workflow และรอผลลัพธ์
    const handle = await client.workflow.start(createOrderWorkflow, {
      taskQueue: 'order-processing-queue',
      args: [{ orderId, item, amount }],
      workflowId: `order-workflow-${orderId}`,
    });

    console.log(`[API Gateway] Started Workflow ID: ${handle.workflowId}`);

    // รอรับผลลัพธ์หลังจาก Workflow ทำงานเสร็จ
    const result = await handle.result();
    
    res.status(200).json({
      message: 'Order processed successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('🚀 Order API Gateway running on port 3000'));
