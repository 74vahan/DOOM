# VIBEDOOM — браузерный DOOM с автодеплоем на Google Cloud

Учебный проект «как в настоящей продакшн-разработке»: инфраструктура описана кодом
(Terraform), приложение живёт на сервере Google Cloud, а каждый `git push` в ветку
`main` **автоматически** выкатывает новую версию на сервер (GitHub Actions).

## Что внутри

```
001/
├── README.md                     ← ты здесь
├── .gitignore                    ← защита: секреты не попадут в git
├── .github/workflows/deploy.yml  ← CI/CD: автодеплой при push в main
├── infra/                        ← Terraform: сервер в Google Cloud
│   ├── main.tf                   ←   виртуальная машина, IP, firewall
│   ├── variables.tf              ←   настраиваемые параметры
│   ├── outputs.tf                ←   что показать после создания (IP)
│   └── terraform.tfvars.example  ←   шаблон твоих значений
├── backend/                      ← Node.js + Express
│   ├── server.js                 ←   отдаёт игру + API рекордов
│   ├── db.js                     ←   подключение к MySQL (из .env)
│   ├── package.json
│   └── .env.example              ←   шаблон настроек окружения
├── server/                       ← файлы для настройки сервера
│   ├── setup.sh                  ←   скрипт первичной настройки (1 раз)
│   ├── nginx.conf                ←   reverse proxy: порт 80 → 3000
│   ├── doomgame.service          ←   автозапуск через systemd
│   └── init_db.sql               ←   создание базы и таблицы рекордов
└── game/                         ← сама игра (HTML5 Canvas, raycasting)
    ├── index.html, styles.css
    └── js/                       ←   13 модулей: движок, враги, оружие…
```

**Как всё связано:** браузер → Nginx (порт 80) → Node.js (порт 3000) → MySQL.
Nginx — «швейцар» на входе: принимает запросы из интернета и передаёт их
приложению. Node.js отдаёт файлы игры и хранит рекорды в MySQL.

---

## Часть 1. Подготовка (один раз)

### 1.1 Установи инструменты на свой компьютер

| Инструмент | Зачем | Откуда |
|---|---|---|
| Terraform | создаёт сервер в GCP командой | https://developer.hashicorp.com/terraform/install |
| Google Cloud CLI (`gcloud`) | авторизация в GCP | https://cloud.google.com/sdk/docs/install |
| Git | версии кода и деплой | https://git-scm.com/downloads |

### 1.2 Создай проект в Google Cloud

1. Зайди на https://console.cloud.google.com и создай проект
   (например `doom-game`). Запиши его **Project ID** — он вида `doom-game-463912`.
2. Привяжи биллинг (банковскую карту) к проекту — без этого VM не создать.
   Новым аккаунтам Google даёт $300 бесплатных кредитов.
3. Включи API Compute Engine (это «рубильник», разрешающий создавать VM):

```bash
gcloud services enable compute.googleapis.com --project=ТВОЙ_PROJECT_ID
```

(или в консоли: APIs & Services → Enable APIs → Compute Engine API)

### 1.3 Авторизация Terraform в GCP — два способа

**Способ A: через gcloud CLI — РЕКОМЕНДУЮ (проще и безопаснее).**
Никаких файлов с ключами, Terraform сам возьмёт твою авторизацию:

```bash
gcloud auth login                        # вход в Google-аккаунт (откроется браузер)
gcloud auth application-default login    # авторизация для Terraform
gcloud config set project ТВОЙ_PROJECT_ID
```

В `terraform.tfvars` оставь `credentials_file = ""`.

**Способ B: через service account с JSON-ключом.**
Нужен для CI-систем и «роботов». Создаёшь сервисный аккаунт
(IAM → Service Accounts → Create), даёшь роль `Compute Admin`, создаёшь
JSON-ключ и скачиваешь его. Путь к файлу указываешь в `credentials_file`.
Минус: файл-ключ = пароль от твоего облака; потеряешь — беда.
Наш `.gitignore` исключает `*.json`, но всё равно храни его вне проекта.

### 1.4 SSH-ключ

По этому ключу на сервер будешь заходить и ты, и GitHub Actions:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/doom_deploy -C "deploy"
```

Появятся два файла: `doom_deploy` (ПРИВАТНЫЙ — никому) и `doom_deploy.pub` (публичный).

---

## Часть 2. Создаём сервер (Terraform)

```bash
cd infra

# 1) Скопируй шаблон и впиши свои значения (project_id, путь к ключу .pub)
copy terraform.tfvars.example terraform.tfvars     # Windows
# cp terraform.tfvars.example terraform.tfvars     # macOS/Linux

# 2) Инициализация (скачивает провайдер Google — один раз)
terraform init

# 3) Посмотреть, ЧТО будет создано (ничего ещё не создаётся)
terraform plan

# 4) Создать! Наберёшь yes — через ~1 минуту сервер готов
terraform apply
```

В конце Terraform напечатает:

```
server_public_ip = "34.159.xx.xx"     ← ЗАПИШИ этот IP
ssh_command      = "ssh deploy@34.159.xx.xx"
```

Создаётся: VM `doom-game-server` (Ubuntu 22.04, e2-small, Франкфурт),
статический IP (не меняется при перезагрузках) и firewall-правила
для портов 22 (SSH), 80 (HTTP), 443 (HTTPS).

> 💰 Примерная цена: e2-small ≈ $13–15/мес. Удалить всё: `terraform destroy`.

---

## Часть 3. GitHub-репозиторий

Автодеплой работает на уровне репозитория, поэтому у проекта должен быть свой репо:

```bash
# из папки проекта (001)
git init
git add .
git commit -m "initial: doom game + terraform + ci/cd"
git branch -M main
# создай ПУСТОЙ репозиторий на github.com, затем:
git remote add origin https://github.com/ТВОЙ_ЛОГИН/vibedoom.git
git push -u origin main
```

Перед первым коммитом проверь, что секретов нет: `git status` не должен
показывать `terraform.tfvars`, `.env` или какие-либо `.json`-ключи.

---

## Часть 4. Настройка сервера (один раз)

Заходим на сервер и запускаем setup-скрипт:

```bash
ssh -i ~/.ssh/doom_deploy deploy@ПУБЛИЧНЫЙ_IP

# на сервере:
wget https://raw.githubusercontent.com/ТВОЙ_ЛОГИН/vibedoom/main/server/setup.sh
bash setup.sh https://github.com/ТВОЙ_ЛОГИН/vibedoom.git
```

Скрипт спросит **пароль для базы данных** (придумай и запомни) и сам:
поставит Nginx, Node.js 20, MySQL и git → склонирует репозиторий в
`/opt/doomgame` → создаст базу и `.env` → включит автозапуск (systemd) →
настроит Nginx. После него открой в браузере `http://ПУБЛИЧНЫЙ_IP` — игра работает!

> Альтернатива для продвинутых: те же шаги можно зашить в `metadata_startup_script`
> инстанса в Terraform — тогда сервер настроит себя сам при первом старте.
> Для обучения ручной запуск нагляднее: видно каждый шаг.

### Почему MySQL прямо на сервере, а не Cloud SQL?

| | MySQL на VM (наш вариант) | Cloud SQL (управляемая БД) |
|---|---|---|
| Цена | входит в цену VM | от ~$10/мес отдельно |
| Настройка | сам ставишь и обновляешь | Google обновляет и бэкапит |
| Надёжность | умерла VM — умерла БД | реплики, автобэкапы |

Для учебного проекта и маленькой игры наш вариант проще и дешевле.
Для «настоящего продакшна» бери Cloud SQL.

---

## Часть 5. Включаем автодеплой (GitHub Secrets)

В репозитории на GitHub: **Settings → Secrets and variables → Actions →
New repository secret**. Создай три секрета:

| Имя секрета | Что положить |
|---|---|
| `SERVER_IP` | публичный IP из `terraform output` |
| `SSH_USER` | `deploy` |
| `SSH_PRIVATE_KEY` | содержимое файла `~/.ssh/doom_deploy` ЦЕЛИКОМ (приватный ключ, включая строки BEGIN/END) |

Пароль базы данных в GitHub НЕ нужен: он лежит только в `.env` на сервере,
а деплой файл `.env` не трогает.

Всё! Теперь при каждом `git push` в `main` GitHub Actions зайдёт на сервер,
сделает `git pull`, обновит зависимости и перезапустит приложение.

---

## ФИНАЛЬНЫЙ ЧЕК-ЛИСТ

Что запустить руками ОДИН раз:

- [ ] Установлены terraform, gcloud, git (Часть 1.1)
- [ ] Создан проект GCP, привязан биллинг, включён Compute Engine API (1.2)
- [ ] `gcloud auth application-default login` (1.3)
- [ ] Сгенерирован SSH-ключ `doom_deploy` (1.4)
- [ ] `infra/terraform.tfvars` заполнен, `terraform init` + `apply`, IP записан (Часть 2)
- [ ] Код запушен в свой GitHub-репозиторий (Часть 3)
- [ ] На сервере выполнен `setup.sh`, игра открывается по `http://IP` (Часть 4)
- [ ] Три секрета добавлены в GitHub Actions (Часть 5)

Проверка автодеплоя (2 минуты):

1. Поменяй что-нибудь заметное, например заголовок в `game/index.html`:
   `<h1 class="logo">VIBE<span>DOOM</span></h1>` → допиши `II`.
2. `git add . && git commit -m "test deploy" && git push`
3. Открой вкладку **Actions** на GitHub — увидишь зелёную галочку у workflow
   «Deploy to GCP» (~30 секунд).
4. Обнови `http://ПУБЛИЧНЫЙ_IP` в браузере — заголовок изменился. 🎉
   Это и есть CI/CD: пуш → продакшн, без единой ручной команды.

### Если что-то не работает

```bash
ssh -i ~/.ssh/doom_deploy deploy@IP     # зайти на сервер
systemctl status doomgame               # жив ли Node (Active: active)
journalctl -u doomgame -n 50            # логи приложения
sudo systemctl status nginx             # жив ли Nginx
curl http://localhost:3000/health       # отвечает ли Node напрямую
sudo mysql -e "SELECT * FROM doomgame.scores;"   # есть ли рекорды в базе
```

### Локальный запуск для разработки (без MySQL игра тоже работает,
рекорды просто не сохранятся):

```bash
cd backend
npm install
npm start          # → http://localhost:3000
```
