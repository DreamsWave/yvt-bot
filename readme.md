# VK Telegram bot reposter

A bot that reposts VK group posts to Telegram channel. Bot uses serverless components of Yandex Cloud.

# Yandex Services

- [Cloud Functions](https://cloud.yandex.ru/services/functions)
- [Yandex Database](https://cloud.yandex.ru/services/ydb)
- [Message Queue](https://cloud.yandex.ru/services/message-queue)
- [Yandex Lockbox](https://cloud.yandex.ru/docs/lockbox/)
- [Yandex API Gateway](https://cloud.yandex.ru/docs/api-gateway/)

# Tools

- [Yandex Cloud command line tool](https://cloud.yandex.ru/docs/cli/)
- [Terraform v1.4.0](https://registry.terraform.io/) ([Yandex version](https://cloud.yandex.ru/docs/tutorials/infrastructure-management/terraform-quickstart))

# Prerequisites

We assume that you already have [Yandex Cloud](https://console.cloud.yandex.ru) account with created cloud and folder

# Installation

- `npm install`
- `yc init`
- `npm run setup-vars`
- Pass VK and Telegram variables into **terraform.tfvars**
- `terraform init`
- `npm run build`
- `npm run deploy`
- Copy `entry_url` from console output or from Yandex Cloud API Gateway Domain and paste in your VK group `Settings -> API Usage -> Callback API -> URL`. Set ✓ in `Event Types -> Posts -> New`

# HOWTO

### How to get Telegram channel id

- Click on [@jsondumpbot](https://t.me/jsondumpbot) or search for `JSON Dump Bot` on Telegram
- Forward a message from your Telegram channel to the JsonDumpBot telegram bot and you should see something like this:

```
"forward_from_chat": {
    "id": -10012312312313,
    "title": "some_chat_title",
    "username": "some_username",
    "type": "channel"
}
```

### How to create Telegram bot and get token

- [@BotFather](https://t.me/BotFather)

### How to setup local environment

- Edit _.env_ file with your variables
- You can get _AWS_ACCESS_KEY_ID_, _AWS_SECRET_ACCESS_KEY_, _DOCAPI_ENDPOINT_ and _YMQ_QUEUE_URL_ from Outputs after deploy or you can open any of yours functions in Yandex Cloud and them from there
