# สถาปัตยกรรม Temporal บน Kubernetes สำหรับ Lab

Lab นี้ใช้ REST API เริ่ม Temporal Workflow โดยตรง แล้วให้ Temporal Worker ประมวลผลงาน Kafka ไม่อยู่ในเส้นทางการทำงานของคำสั่งซื้อ

## ภาพรวมสถาปัตยกรรม

```mermaid
flowchart LR
    client[REST client / curl]
    api[Webhook API\nPOST /webhooks/orders]
    frontend[Temporal Frontend\ntemporal-frontend:7233]
    server[Temporal Server]
    worker[Temporal Worker\nhello-task-queue]
    ui[Temporal UI]
    admin[Temporal CLI]
    postgres[(PostgreSQL\nสถานะและประวัติ Workflow)]
    elastic[(Elasticsearch\nข้อมูล Visibility)]

    client -->|ส่ง Order แบบ JSON| api
    api -->|เริ่ม OrderWorkflow\nID order-{order_id}| frontend
    frontend --> server
    worker -->|poll task queue| frontend
    server --> postgres
    server --> elastic
    admin --> frontend
    ui --> frontend
```

## ลำดับการทำงาน

1. Client ส่ง `POST /webhooks/orders` พร้อม `order_id` และ `customer`
2. REST API ตรวจสอบ JSON แล้วเรียก Temporal โดยตรง
3. Temporal เริ่ม `OrderWorkflow` ด้วย ID `order-{order_id}` บน `hello-task-queue`
4. Worker เรียก Activity `process_order` และส่งผลกลับ
5. Temporal เก็บประวัติใน PostgreSQL และข้อมูล Visibility ใน Elasticsearch
6. ตรวจสอบสถานะ Workflow ผ่าน Temporal CLI หรือ UI

Workflow ID ที่อ้างอิงจาก `order_id` ช่วยป้องกันการเริ่ม Workflow ซ้ำเมื่อส่งคำขอเดิมซ้ำ

## Kubernetes Resources

| Manifest | หน้าที่ |
|---|---|
| `00-namespace.yaml` | สร้าง namespace `temporal` |
| `10-postgres.yaml` | เก็บสถานะและประวัติ Workflow |
| `20-elasticsearch.yaml` | เก็บข้อมูล Visibility สำหรับค้นหา |
| `30-temporal-server.yaml` | Temporal Server และ Frontend Service |
| `40-temporal-admin-tools.yaml` | Pod สำหรับใช้ Temporal CLI |
| `50-temporal-worker.yaml` | ประมวลผล Workflow และ Activity |
| `60-webhook-api.yaml` | REST API ที่เริ่ม Workflow ใน Temporal |
| `50-temporal-ui.yaml` | UI สำหรับดูสถานะและประวัติ Workflow |

## Deploy และทดสอบบน Linux

ติดตั้ง Temporal dependencies ก่อน แล้วติดตั้ง Worker และ API:

```bash
kubectl apply -f files/00-namespace.yaml
kubectl apply -f files/10-postgres.yaml
kubectl apply -f files/20-elasticsearch.yaml
kubectl apply -f files/30-temporal-server.yaml
kubectl apply -f files/40-temporal-admin-tools.yaml
kubectl apply -f files/50-temporal-worker.yaml
kubectl apply -f files/60-webhook-api.yaml
kubectl apply -f 50-temporal-ui.yaml
```

เปิด port-forward ใน Terminal แรก:

```bash
kubectl -n temporal port-forward svc/temporal-webhook-api 8081:8080
```

ส่ง Order และตรวจสถานะ Workflow จากอีก Terminal:

```bash
ORDER_ID="ORD-$(date +%s)"

curl -i -X POST http://localhost:8081/webhooks/orders \
  -H 'Content-Type: application/json' \
  -d "{\"order_id\":\"${ORDER_ID}\",\"customer\":\"Alice\"}"

kubectl -n temporal exec deployment/temporal-admin-tools -- \
  temporal workflow describe --namespace default \
  --workflow-id "order-${ORDER_ID}"
```

API ควรตอบ HTTP `202` และ Workflow ควรเป็น `COMPLETED` เมื่อ Worker ทำงานอยู่

## นำ Kafka resources เดิมออกจาก Cluster

หากเคยติดตั้ง Kafka demo ไว้ ให้นำ resources เดิมออก:

```bash
kubectl -n temporal delete deployment/order-event-consumer configmap/order-event-consumer-code \
  job/kafka-create-topics deployment/kafka service/kafka --ignore-not-found
```

เปิด Temporal UI โดยทำ port-forward ไปยัง `temporal-ui` แล้วเข้า <http://localhost:8080>