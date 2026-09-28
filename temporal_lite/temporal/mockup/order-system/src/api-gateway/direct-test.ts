import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

// Endpoint สำหรับทดสอบยิงตรงไปยัง External API (ไม่ผ่าน Temporal)
app.post('/orders', async (req, res) => {
  const { item, amount } = req.body;
  const orderId = `ORD-DIRECT-${Math.floor(Math.random() * 10000)}`;

  console.log(`[Direct Test] Received request for item: ${item}, amount: $${amount}`);

  try {
    // ยิงตรงไปหา Payment Integration Service (Port 4000)
    const response = await axios.post('http://localhost:4000/charge', {
      orderId,
      amount,
    });

    console.log('[Direct Test] External API Response:', response.data);

    res.status(200).json({
      message: 'Direct API Call Successful',
      orderId,
      externalResponse: response.data,
    });
  } catch (error: any) {
    console.error('[Direct Test] Error calling External API:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('🚀 Direct Test API Gateway running on port 3000'));
