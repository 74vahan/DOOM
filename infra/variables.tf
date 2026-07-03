# ============================================================
# variables.tf — все настраиваемые параметры инфраструктуры.
# Реальные значения задаются в файле terraform.tfvars
# (его НЕТ в git — см. terraform.tfvars.example).
# ============================================================

variable "project_id" {
  description = "ID проекта в Google Cloud (не имя, а именно ID, например my-doom-project-123456)"
  type        = string
}

variable "region" {
  description = "Регион GCP. europe-west3 = Франкфурт, ближайший крупный регион"
  type        = string
  default     = "europe-west3"
}

variable "zone" {
  description = "Зона внутри региона (буква a/b/c в конце)"
  type        = string
  default     = "europe-west3-a"
}

variable "machine_type" {
  description = "Тип виртуальной машины. e2-small (~15$/мес) хватает для Node+MySQL. e2-micro дешевле, но MySQL будет тесно"
  type        = string
  default     = "e2-small"
}

variable "instance_name" {
  description = "Имя виртуальной машины"
  type        = string
  default     = "doom-game-server"
}

variable "ssh_user" {
  description = "Имя пользователя для SSH-доступа (под ним будешь заходить на сервер)"
  type        = string
  default     = "deploy"
}

variable "ssh_public_key_path" {
  description = "Путь к ПУБЛИЧНОМУ ssh-ключу (файл .pub!). Приватный ключ никуда не загружается"
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}

variable "credentials_file" {
  description = "Путь к JSON-ключу service account. Оставь пустым (\"\"), если авторизуешься через gcloud CLI — так проще"
  type        = string
  default     = ""
}
