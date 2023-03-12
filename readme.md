# VK Telegram bot reposter

A bot that reposts VK group posts to Telegram channel. Bot uses serverless components of Yandex Cloud.

# Yandex Services

- [Cloud Functions](https://cloud.yandex.ru/services/functions)
- [Yandex Database](https://cloud.yandex.ru/services/ydb)
- [Message Queue](https://cloud.yandex.ru/services/message-queue)

# Tools

- [Yandex Cloud command line tool](https://cloud.yandex.ru/docs/cli/)

# Prerequisites

We assume that you already have [Yandex Cloud](https://console.cloud.yandex.ru) account with created cloud and folder

# Initialization

## Setting up service account

Create new [service account](https://cloud.yandex.ru/docs/iam/concepts/users/service-accounts). We will use this SA for all interactions between cloud resources.

Grant following roles to this SA:

- ymq.reader
- ymq.writer
- ydb.admin
- serverless.functions.invoker

## Creating Message Queue

Create new [Message Queue](https://cloud.yandex.ru/docs/message-queue/operations/message-queue-new-queue). You can use default settings, the only restriction is that queue must be standard, not FIFO

## Creating Yandex Database and Document API table

1. [Create](https://cloud.yandex.ru/docs/ydb/operations/create_manage_database#create-db) serverless database
2. [Create](https://cloud.yandex.ru/docs/ydb/operations/schema) **document** table named `tasks` with single field `task_id`, set `partitioning key` checkbox

# Deploying handle-vk-cb function

[Create function](https://cloud.yandex.ru/docs/functions/operations/function/function-create).

Start creating new version with nodejs16 runtime:
Set up function service account (the one created on previous step). Add function sources: package.json and index.js files from current example's directory.

Specify entrypoint, which is `index.handle_vk_cb` for API function.

Create [AWS-compatible access key](https://cloud.yandex.ru/docs/iam/concepts/authorization/access-key) for your service account.

Setup environment variables:

- `AWS_ACCESS_KEY_ID` - id of your access key
- `AWS_SECRET_ACCESS_KEY` - secret part of your access key
- `YMQ_QUEUE_URL` - URL of your message queue
- `DOCAPI_ENDPOINT` - Document API endpoint of your serverless database. Note that you should use Document API endpoint, not YDB endpoint

Create function version

# Deploying handle-wall-post-new function

Create new function.

[WIP]

Inside your handle-wall-post-new function create new version using nodejs16 runtime:

1. Choose `ZIP-archive` deploy method instead of code editor
2. Choose your zip archive
3. Entrypoint for converter function is `index.handle_wall_post_new`
4. Tune function resources: it's recommended to set function execution timeout to 300 seconds and select 512MB of memory
5. Select function service account
6. Setup environment variables as for API function
7. Create version
8. Setup environment variables:

- `AWS_ACCESS_KEY_ID` - id of your access key
- `AWS_SECRET_ACCESS_KEY` - secret part of your access key
- `YMQ_QUEUE_URL` - URL of your message queue
- `DOCAPI_ENDPOINT` - Document API endpoint of your serverless database. Note that you should use Document API endpoint, not YDB endpoint

# Setting up trigger

Create [Message Queue trigger](https://cloud.yandex.ru/docs/functions/quickstart/create-trigger/ymq-trigger-quickstart):

- Choose Message Queue you created as events source
- Use your service account for both accessing Message Queue and invoking cloud function
- Set your handle_wall_post_new function as trigger target.

# Creating API Gateway

Create API-gateway with specification like this:

```
openapi: 3.0.0
info:
  title: gateway api
  version: 1.0.0
paths:
  /:
    post:
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: <handle-vk-cb function ID>
      operationId: <handle-vk-cb function ID>
```
