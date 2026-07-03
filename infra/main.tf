# ============================================================
# main.tf — описание всей инфраструктуры в Google Cloud.
# Terraform читает этот файл и сам создаёт ресурсы.
# ============================================================

terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

# --- Провайдер Google ---
# Если credentials_file пустой, Terraform возьмёт авторизацию
# из gcloud CLI (команда: gcloud auth application-default login).
provider "google" {
  project     = var.project_id
  region      = var.region
  zone        = var.zone
  credentials = var.credentials_file != "" ? file(var.credentials_file) : null
}

# --- Статический внешний IP ---
# Без него GCP выдаёт временный IP, который МЕНЯЕТСЯ при перезапуске
# машины — и тогда сломается и SSH-доступ, и CI/CD.
resource "google_compute_address" "static_ip" {
  name   = "${var.instance_name}-ip"
  region = var.region
}

# --- Firewall: SSH (порт 22) ---
# В GCP по умолчанию весь входящий трафик ЗАКРЫТ.
# Каждый порт открывается отдельным firewall-правилом,
# которое привязывается к машинам через target_tags.
resource "google_compute_firewall" "allow_ssh" {
  name    = "${var.instance_name}-allow-ssh"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"] # доступ с любого IP; можно сузить до своего
  target_tags   = ["doom-server"]
}

# --- Firewall: HTTP (80) и HTTPS (443) ---
resource "google_compute_firewall" "allow_web" {
  name    = "${var.instance_name}-allow-web"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["doom-server"]
}

# --- Сама виртуальная машина ---
resource "google_compute_instance" "server" {
  name         = var.instance_name
  machine_type = var.machine_type
  zone         = var.zone

  # Тег связывает машину с firewall-правилами выше
  tags = ["doom-server"]

  # Диск с Ubuntu 22.04 LTS
  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = 20 # ГБ; хватит для системы + MySQL + приложения
      type  = "pd-balanced"
    }
  }

  network_interface {
    network = "default"

    # Привязываем наш статический IP
    access_config {
      nat_ip = google_compute_address.static_ip.address
    }
  }

  # Пробрасываем публичный SSH-ключ в метаданные —
  # GCP сам создаст пользователя var.ssh_user с этим ключом.
  metadata = {
    ssh-keys = "${var.ssh_user}:${file(var.ssh_public_key_path)}"
  }

  # Разрешаем Terraform останавливать машину для изменения типа
  allow_stopping_for_update = true
}
