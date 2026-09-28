// src/activities.ts
import axios from 'axios';

export async function processPayment(orderData: { orderId: string; amount: number }): Promise<string> {
  console.log(`💳 Activity: Requesting payment for Order ${orderData.orderId}...`);
  
  // ยิง HTTP Request ไปหา Payment Service (Port 4000)
  const response = await axios.post('http://localhost:4000/payments', orderData);
  return response.data.status;
}
