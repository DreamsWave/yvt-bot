#!/bin/bash

cp _env .env
cp _terraform.tfvars terraform.tfvars

sed -i "s/\"yc_token\"/\"$(yc config get token)\"/g" terraform.tfvars
sed -i "s/\"yc_cloud_id\"/\"$(yc config get cloud-id)\"/g" terraform.tfvars
sed -i "s/\"yc_folder_id\"/\"$(yc config get folder-id)\"/g" terraform.tfvars