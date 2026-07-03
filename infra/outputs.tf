# ============================================================
# outputs.tf — что Terraform покажет после создания ресурсов.
# ============================================================

output "server_public_ip" {
  description = "Публичный IP сервера. Этот адрес нужен для SSH, для браузера и для GitHub Secrets"
  value       = google_compute_address.static_ip.address
}

output "ssh_command" {
  description = "Готовая команда для подключения к серверу"
  value       = "ssh ${var.ssh_user}@${google_compute_address.static_ip.address}"
}
