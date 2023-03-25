terraform {
  required_providers {
    yandex = {
      source  = "yandex-cloud/yandex"
      version = "0.86.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "2.3.0"
    }
  }
  required_version = ">= 0.13"
}

provider "yandex" {
  token     = var.yc_token
  cloud_id  = var.yc_cloud_id
  folder_id = var.yc_folder_id
  zone      = var.yc_zone
}

### IAM
resource "yandex_iam_service_account" "this" {
  name        = var.yc_service_account_name
  description = "Service account to manage Functions"
}
resource "yandex_resourcemanager_folder_iam_member" "this" {
  for_each  = toset(["admin"])
  folder_id = var.yc_folder_id
  member    = "serviceAccount:${yandex_iam_service_account.this.id}"
  role      = each.value
}
resource "yandex_iam_service_account_static_access_key" "sa-static-key" {
  service_account_id = yandex_iam_service_account.this.id
  description        = "static access key for YMQ"
}

### Yandex Database
resource "yandex_ydb_database_serverless" "db" {
  name      = "db"
  folder_id = var.yc_folder_id
  provisioner "local-exec" {
    environment = {
      AWS_ACCESS_KEY_ID     = yandex_iam_service_account_static_access_key.sa-static-key.access_key
      AWS_SECRET_ACCESS_KEY = nonsensitive(yandex_iam_service_account_static_access_key.sa-static-key.secret_key)
      DOCAPI_ENDPOINT       = yandex_ydb_database_serverless.db.document_api_endpoint
    }
    command = "npm run create-tasks-table"
  }
}

### Message Queue
resource "yandex_message_queue" "ymq" {
  name                       = "ymq"
  visibility_timeout_seconds = 600
  receive_wait_time_seconds  = 20
  message_retention_seconds  = 86400
  access_key                 = yandex_iam_service_account_static_access_key.sa-static-key.access_key
  secret_key                 = yandex_iam_service_account_static_access_key.sa-static-key.secret_key
}

data "archive_file" "build" {
  type        = "zip"
  source_dir  = "${path.module}/dist"
  output_path = "${path.module}/dist/build.zip"
}

### Functions
resource "yandex_function" "handle-vk-cb" {
  name               = "handle-vk-cb"
  description        = "VK callback handler"
  user_hash          = data.archive_file.build.output_base64sha256
  runtime            = "nodejs16"
  entrypoint         = "index.handle_vk_cb"
  memory             = "512"
  execution_timeout  = "300"
  service_account_id = yandex_iam_service_account.this.id
  content {
    zip_filename = "${path.module}/dist/build.zip"
  }
  environment = {
    "AWS_ACCESS_KEY_ID"     = yandex_iam_service_account_static_access_key.sa-static-key.access_key
    "AWS_SECRET_ACCESS_KEY" = nonsensitive(yandex_iam_service_account_static_access_key.sa-static-key.secret_key)
    "DOCAPI_ENDPOINT"       = yandex_ydb_database_serverless.db.document_api_endpoint
    "YMQ_QUEUE_URL"         = yandex_message_queue.ymq.id,
    "VK_CALLBACK"           = var.vk_callback
    "VK_GROUP_ID"           = var.vk_group_id
    "TG_TOKEN"              = var.tg_token
    "TG_CHANNEL_ID"         = var.tg_channel_id
  }
}

resource "yandex_function" "handle-wall-post-new" {
  name               = "handle-wall-post-new"
  description        = "VK event 'wall_post_new' handler"
  user_hash          = data.archive_file.build.output_base64sha256
  runtime            = "nodejs16"
  entrypoint         = "index.handle_wall_post_new"
  memory             = "512"
  execution_timeout  = "300"
  service_account_id = yandex_iam_service_account.this.id
  content {
    zip_filename = "${path.module}/dist/build.zip"
  }
  environment = {
    "AWS_ACCESS_KEY_ID"     = yandex_iam_service_account_static_access_key.sa-static-key.access_key
    "AWS_SECRET_ACCESS_KEY" = nonsensitive(yandex_iam_service_account_static_access_key.sa-static-key.secret_key)
    "DOCAPI_ENDPOINT"       = yandex_ydb_database_serverless.db.document_api_endpoint
    "YMQ_QUEUE_URL"         = yandex_message_queue.ymq.id,
    "VK_CALLBACK"           = var.vk_callback
    "VK_GROUP_ID"           = var.vk_group_id
    "TG_TOKEN"              = var.tg_token
    "TG_CHANNEL_ID"         = var.tg_channel_id
  }
  depends_on = [yandex_message_queue.ymq]
}

resource "yandex_function" "clear-tasks" {
  name               = "clear-tasks"
  description        = "Clear Tasks table in YDB function"
  user_hash          = data.archive_file.build.output_base64sha256
  runtime            = "nodejs16"
  entrypoint         = "index.clear_tasks"
  memory             = "512"
  execution_timeout  = "300"
  service_account_id = yandex_iam_service_account.this.id
  content {
    zip_filename = "${path.module}/dist/build.zip"
  }
  environment = {
    "AWS_ACCESS_KEY_ID"     = yandex_iam_service_account_static_access_key.sa-static-key.access_key
    "AWS_SECRET_ACCESS_KEY" = nonsensitive(yandex_iam_service_account_static_access_key.sa-static-key.secret_key)
    "DOCAPI_ENDPOINT"       = yandex_ydb_database_serverless.db.document_api_endpoint
    "YMQ_QUEUE_URL"         = yandex_message_queue.ymq.id,
    "VK_CALLBACK"           = var.vk_callback
    "VK_GROUP_ID"           = var.vk_group_id
    "TG_TOKEN"              = var.tg_token
    "TG_CHANNEL_ID"         = var.tg_channel_id
  }
}

### Triggers
resource "yandex_function_trigger" "handle-wall-post-new-ymq-trigger" {
  name        = "handle-wall-post-new-ymq-trigger"
  description = "YMQ trigger for handle-wall-post-new"
  folder_id   = var.yc_folder_id
  message_queue {
    queue_id           = yandex_message_queue.ymq.arn
    service_account_id = yandex_iam_service_account.this.id
    batch_cutoff       = 1
    batch_size         = 1
  }
  function {
    id                 = yandex_function.handle-wall-post-new.id
    tag                = "$latest"
    service_account_id = yandex_iam_service_account.this.id
  }
}

resource "yandex_function_trigger" "clear-tasks-trigger" {
  name        = "clear-tasks-function-trigger"
  description = "clear tasks function trigger"
  timer {
    cron_expression = "0 4 ? * * *"
  }
  function {
    id                 = yandex_function.clear-tasks.id
    tag                = "$latest"
    service_account_id = yandex_iam_service_account.this.id
  }
}

### API Gateway
resource "yandex_api_gateway" "bot-gateway" {
  name        = "bot-gateway"
  description = "Redirects / POST to handle-vk-cb function"
  spec        = <<-EOT
openapi: 3.0.0
info:
  title: Bot API
  version: 1.0.0
paths:
  /:
    post:
      x-yc-apigateway-integration:
        type: cloud-functions
        function_id: ${yandex_function.handle-vk-cb.id}
        service_account_id: ${yandex_iam_service_account.this.id}
      operationId: handle-vk-cb
EOT
}

### Outputs
output "DOCAPI_ENDPOINT" {
  value = yandex_ydb_database_serverless.db.document_api_endpoint
}
output "YMQ_QUEUE_URL" {
  value = yandex_message_queue.ymq.id
}
output "AWS_ACCESS_KEY_ID" {
  value = yandex_iam_service_account_static_access_key.sa-static-key.access_key
}
output "AWS_SECRET_ACCESS_KEY" {
  value = nonsensitive(yandex_iam_service_account_static_access_key.sa-static-key.secret_key)
}

output "entry_url" {
  value = "https://${yandex_api_gateway.bot-gateway.domain}"
}