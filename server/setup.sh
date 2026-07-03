#!/usr/bin/env bash
# ============================================================
# setup.sh — первичная настройка сервера. Запускается ОДИН раз.
#
# Как использовать (на сервере, под пользователем deploy):
#   wget https://raw.githubusercontent.com/<ТВОЙ_ЛОГИН>/<РЕПО>/main/server/setup.sh
#   bash setup.sh https://github.com/<ТВОЙ_ЛОГИН>/<РЕПО>.git
#
# Скрипт: ставит Nginx, Node.js, MySQL, git; клонирует репозиторий;
# создаёт базу и .env; настраивает автозапуск через systemd.
# ============================================================
set -e  # остановиться при первой же ошибке

REPO_URL="$1"
APP_DIR="/opt/doomgame"
APP_USER="deploy"

if [ -z "$REPO_URL" ]; then
  echo "Использование: bash setup.sh <URL git-репозитория>"
  exit 1
fi

echo "=== 1/7. Обновляем список пакетов и ставим базовые программы ==="
sudo apt-get update -y
sudo apt-get install -y nginx git mysql-server curl

echo "=== 2/7. Ставим Node.js 20 LTS (из официального репозитория NodeSource) ==="
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node --version

echo "=== 3/7. Клонируем репозиторий в $APP_DIR ==="
if [ ! -d "$APP_DIR" ]; then
  sudo git clone "$REPO_URL" "$APP_DIR"
  # Папка должна принадлежать deploy, чтобы CI/CD мог делать git pull
  sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"
fi

echo "=== 4/7. Настраиваем MySQL: база, таблица, пользователь ==="
# Пароль спрашиваем у тебя прямо сейчас — он НЕ хранится ни в git, ни в скрипте
read -r -s -p "Придумай пароль для пользователя БД doomgame_user: " DB_PASSWORD
echo
# Подставляем пароль в SQL-скрипт и выполняем (через временный файл с правами 600)
TMP_SQL=$(mktemp)
chmod 600 "$TMP_SQL"
sed "s/__DB_PASSWORD__/${DB_PASSWORD//\//\\/}/" "$APP_DIR/server/init_db.sql" > "$TMP_SQL"
sudo mysql < "$TMP_SQL"
rm -f "$TMP_SQL"

echo "=== 5/7. Создаём .env с настройками приложения ==="
cat > "$APP_DIR/backend/.env" <<EOF
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=doomgame
DB_USER=doomgame_user
DB_PASSWORD=$DB_PASSWORD
EOF
chmod 600 "$APP_DIR/backend/.env"   # читать может только владелец

echo "=== 6/7. Устанавливаем зависимости Node и включаем автозапуск ==="
cd "$APP_DIR/backend"
npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# systemd-юнит: автозапуск и перезапуск при падении
sudo cp "$APP_DIR/server/doomgame.service" /etc/systemd/system/doomgame.service
sudo systemctl daemon-reload
sudo systemctl enable --now doomgame

# Разрешаем пользователю deploy перезапускать сервис БЕЗ пароля sudo —
# это нужно GitHub Actions для автодеплоя
echo "$APP_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart doomgame" | \
  sudo tee /etc/sudoers.d/doomgame-restart >/dev/null
sudo chmod 440 /etc/sudoers.d/doomgame-restart

echo "=== 7/7. Настраиваем Nginx (reverse proxy: 80 -> 3000) ==="
sudo cp "$APP_DIR/server/nginx.conf" /etc/nginx/sites-available/doomgame
sudo ln -sf /etc/nginx/sites-available/doomgame /etc/nginx/sites-enabled/doomgame
sudo rm -f /etc/nginx/sites-enabled/default   # убираем страницу-заглушку
sudo nginx -t          # проверка конфига
sudo systemctl restart nginx

echo
echo "================ ГОТОВО! ================"
echo "Проверка: systemctl status doomgame"
echo "Игра доступна по адресу: http://$(curl -s ifconfig.me)/"
