# Temporal Kubernetes Lab Architecture

This lab runs Temporal on Kubernetes with PostgreSQL for durable workflow state, Elasticsearch for visibility, a REST API for workflow submission, and a Python worker for workflow execution. Kafka is not part of the order-processing path.

## Architecture

```mermaid
flowchart LR
    client[REST client / curl]
    api[Webhook API\nPOST /webhooks/orders]
    frontend[Temporal Frontend\ntemporal-frontend:7233]
    server[Temporal Server]
    worker[Temporal Worker\nhello-task-queue]
    ui[Temporal UI]
    admin[Temporal CLI]
    postgres[(PostgreSQL\nworkflow state/history)]
    elastic[(Elasticsearch\nvisibility)]

    client -->|JSON order| api
    api -->|start OrderWorkflow\nID order-{order_id}| frontend
    frontend --> server
    worker -->|poll task queue| frontend
    server --> postgres
    server --> elastic
    admin --> frontend
    ui --> frontend
```

## Request Flow

1. A client sends `POST /webhooks/orders` with `order_id` and `customer`.
2. The API validates the JSON request and calls Temporal directly.
3. Temporal starts `OrderWorkflow` with ID `order-{order_id}` on `hello-task-queue`.
4. The worker executes `process_order` and returns the result.
5. Temporal stores workflow history in PostgreSQL and visibility data in Elasticsearch.
6. The client inspects the workflow through Temporal CLI or UI.

The stable workflow ID makes repeated requests for the same order return the existing workflow instead of starting a second one.

## Kubernetes Resources

| Manifest | Role |
|---|---|
| `00-namespace.yaml` | Shared `temporal` namespace |
| `10-postgres.yaml` | Durable workflow state/history |
| `20-elasticsearch.yaml` | Workflow visibility/search |
| `30-temporal-server.yaml` | Temporal server and frontend service |
| `40-temporal-admin-tools.yaml` | Temporal CLI pod |
| `50-temporal-worker.yaml` | Executes workflows and activities |
| `60-webhook-api.yaml` | REST API that starts Temporal workflows |
| `50-temporal-ui.yaml` | Workflow visibility UI |

## Deploy and Test on Linux

Apply the Temporal dependencies first, then the worker and API:

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

Forward the API in one terminal:

```bash
kubectl -n temporal port-forward svc/temporal-webhook-api 8081:8080
```

Submit and inspect an order from another terminal:

```bash
ORDER_ID="ORD-$(date +%s)"

curl -i -X POST http://localhost:8081/webhooks/orders \
  -H 'Content-Type: application/json' \
  -d "{\"order_id\":\"${ORDER_ID}\",\"customer\":\"Alice\"}"

kubectl -n temporal exec deployment/temporal-admin-tools -- \
  temporal workflow describe --namespace default \
  --workflow-id "order-${ORDER_ID}"
```

The API should return HTTP `202`; the workflow should reach `COMPLETED` while the worker is running.

## Remove Kafka Resources from an Existing Cluster

If the old Kafka demo was already deployed, remove its resources:

```bash
kubectl -n temporal delete deployment/order-event-consumer configmap/order-event-consumer-code \
  job/kafka-create-topics deployment/kafka service/kafka --ignore-not-found
```

Open Temporal UI by forwarding `temporal-ui` to a local port and browsing to <http://localhost:8080>.