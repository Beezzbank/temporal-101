import express from 'express';

const app = express();
app.use(express.json());

//app.post('/charge', (req, res) => {
app.post('/payments', (req, res) => {
  const { orderId, amount } = req.body;
  console.log(`[Payment Service] Processing payment for Order: ${orderId}, Amount: $${amount}`);

  setTimeout(() => {
    // จำลองตัดเงินสำเร็จ
    res.json({ status: 'SUCCESS', transactionId: `TX-${Date.now()}` });
  }, 1000);
});

app.listen(4000, () => console.log('💳 Payment Integration Service running on port 4000'));
