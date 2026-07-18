# PoE Arbitrage Dashboard 0.8.0

Веб-дашборд для поиска арбитражных цепочек Path of Exile 1.

Версия 0.8.0 добавляет:

- серверную историю цен в Cloudflare D1;
- отдельный Cloudflare Worker, который собирает снимки каждые 15 минут;
- использование серверной истории для стабильности и тренда маржи;
- браузерные уведомления о новых выгодных сигналах;
- защиту от повторного спама уведомлениями;
- безопасный откат к локальной истории, если D1 ещё не настроена.

## Важное ограничение уведомлений

Текущая версия отправляет нативные браузерные уведомления, пока страница открыта или оставлена в фоновой вкладке. Если браузер полностью закрыт, уведомления не придут.

Для уведомлений при закрытом браузере потребуется отдельный этап Web Push: service worker, VAPID-ключи и хранение push-подписок.

---

## Архитектура

```text
Cloudflare Pages
├── public/                  интерфейс
├── functions/api/          API poe.ninja, poe.watch и чтение D1
└── D1 binding PRICE_HISTORY

Cloudflare Worker
├── collector-worker/
├── Cron */15 * * * *
└── D1 binding PRICE_HISTORY

Каждые 15 минут:
collector → poe.ninja + poe.watch → готовые цепочки → D1

При открытии сайта:
Pages Function → D1 → история за 24 часа → стабильность/тренд/уведомления
```

Pages и Worker должны быть привязаны к **одной и той же D1-базе** с одинаковым именем binding:

```text
PRICE_HISTORY
```

---

# Обновление основного сайта

1. Распакуйте архив.
2. Загрузите всё содержимое папки в корень существующего GitHub-репозитория.
3. Подтвердите замену старых файлов.
4. Выполните Commit.
5. Дождитесь автоматического Deployment проекта Cloudflare Pages.
6. Откройте сайт с `Ctrl + F5`.

Новая папка `collector-worker` не мешает сборке Pages: каталог публикации по-прежнему `public`.

До настройки D1 сайт продолжает работать на локальной истории браузера.

---

# Настройка серверной истории

## Шаг 1. Создать D1

В панели Cloudflare:

```text
Storage & Databases
→ D1 SQL Database
→ Create database
```

Название:

```text
poe-arbitrage-history
```

## Шаг 2. Создать таблицы

Откройте созданную базу:

```text
Console
```

Скопируйте всё содержимое файла:

```text
schema.sql
```

Вставьте SQL в консоль и выполните его.

Должны появиться таблицы:

```text
opportunity_snapshots
collector_runs
```

## Шаг 3. Привязать D1 к Pages

Откройте:

```text
Workers & Pages
→ poe-arbitrage-dashboard
→ Settings
→ Bindings
→ Add binding
→ D1 database
```

Variable name:

```text
PRICE_HISTORY
```

D1 database:

```text
poe-arbitrage-history
```

Сохраните binding и выполните новый Deployment Pages.

Проверка:

```text
https://poe-arbitrage-dashboard.pages.dev/api/history?league=Standard
```

До запуска коллектора ожидается примерно:

```json
{
  "configured": true,
  "available": false,
  "count": 0
}
```

---

# Создание Worker-сборщика

## Вариант через Cloudflare и GitHub

### Шаг 1. Создать Worker

В Cloudflare:

```text
Workers & Pages
→ Create application
→ Import a repository
```

Выберите тот же GitHub-репозиторий.

Укажите:

```text
Root directory: collector-worker
Deploy command: npx wrangler deploy
```

Файл `collector-worker/wrangler.toml` уже содержит правильный entry point:

```text
src/index.js
```

### Шаг 2. Вписать D1 binding и Cron в `wrangler.toml`

Откройте карточку базы `poe-arbitrage-history` и скопируйте **Database ID**.

Затем откройте в GitHub файл:

```text
collector-worker/wrangler.toml
```

Добавьте в конец:

```toml
[[d1_databases]]
binding = "PRICE_HISTORY"
database_name = "poe-arbitrage-history"
database_id = "ВАШ_DATABASE_ID"

[triggers]
crons = ["*/15 * * * *"]

[vars]
COLLECT_LEAGUES = "auto"
RETENTION_DAYS = "14"
```

Пример уже лежит в:

```text
collector-worker/wrangler.example.toml
```

`auto` означает: текущая challenge-лига и Standard. Можно указать лиги вручную через запятую:

```toml
COLLECT_LEAGUES = "Standard,Название новой лиги"
```

Конфигурацию Worker лучше хранить именно в `wrangler.toml`: последующие `wrangler deploy` используют этот файл как источник истины.

### Шаг 3. Необязательный Secret для ручного запуска

В настройках Worker добавьте Secret:

```text
COLLECTOR_SECRET = длинная случайная строка
```

Он нужен только для ручного запуска `/run`. Секреты не нужно записывать в GitHub.

### Шаг 4. Deployment

После Commit GitHub автоматически выполнит новый Deployment Worker. Cron Trigger может распространяться по сети Cloudflare несколько минут.

Откройте адрес Worker. Он должен показать:

```json
{
  "service": "PoE Arbitrage History Collector",
  "version": "0.8.0",
  "d1Configured": true
}
```

## Ручной запуск коллектора

Только если задан `COLLECTOR_SECRET`:

```bash
curl -X POST \
  -H "Authorization: Bearer ВАШ_SECRET" \
  https://АДРЕС_WORKER/run
```

Без секрета endpoint `/run` намеренно возвращает `401`.

---

# Проверка накопления истории

После первого успешного запуска Worker:

```text
https://poe-arbitrage-dashboard.pages.dev/api/history?league=Standard
```

Ожидается:

```json
{
  "configured": true,
  "available": true,
  "count": 100,
  "latestRun": {
    "status": "success"
  }
}
```

Точное число строк зависит от количества найденных цепочек.

На главной странице карточка **«Серверная история»** должна смениться:

```text
не настроена → пока пусто → N замеров
```

Сервер хранит снимки 14 дней, но интерфейс загружает последние 24 часа для расчёта стабильности. Значение `RETENTION_DAYS` можно изменить.

---

# Настройка браузерных уведомлений

На сайте появится панель **«Браузерные уведомления»**.

1. Нажмите **«Включить уведомления»**.
2. Разрешите уведомления в браузере.
3. Нажмите **«Тест»**.
4. Настройте:
   - минимальную прибыль;
   - минимальный ROI;
   - минимальное количество стабильных замеров;
   - интервал повторного уведомления;
   - требование подтверждения двумя источниками.

Сигнал приходит, когда операция впервые проходит условия.

Повторное уведомление возможно, если:

- прошло заданное время;
- прибыль выросла минимум на 25%;
- либо сигнал исчезал и появился снова.

За одно обновление отправляется не более трёх уведомлений.

Для фоновых уведомлений оставьте сайт открытым. Автообновление теперь продолжает запускаться и в фоновой вкладке, насколько это допускает браузер.

---

# Локальный запуск

Без D1:

```bash
npm install
npm run dev
```

Демо интерфейса:

```text
http://localhost:8788/?demo=1
```

Для локальной D1 требуется создать локальную базу Wrangler и применить `schema.sql`. Самый простой путь проверки D1 — настроить её сразу в Cloudflare.

Локальный collector:

```bash
cd collector-worker
npm install
npm run dev
```

Cron можно симулировать через тестовый scheduled endpoint Wrangler.

---

# Диагностика

## Серверная история: «не настроена»

У Pages отсутствует D1 binding с точным именем:

```text
PRICE_HISTORY
```

Добавьте binding и выполните новый Deployment Pages.

## Серверная история: «пока пусто»

Проверьте:

- создан ли Worker;
- есть ли binding `PRICE_HISTORY` у Worker;
- применён ли `schema.sql`;
- добавлен ли Cron Trigger;
- есть ли успешный `collector_runs`;
- корректно ли указаны лиги.

## Worker показывает `d1Configured: false`

D1 binding добавлен не к тому проекту либо имеет другое имя.

## Уведомления заблокированы

Откройте настройки сайта в браузере и разрешите Notifications. Повторный вызов `Notification.requestPermission()` не может отменить установленный пользователем запрет.

## Уведомления не приходят в фоне

Браузер может замедлять таймеры фоновых вкладок. Полностью закрытый браузер текущая версия не поддерживает. Для этого понадобится Web Push.

---

# Безопасность и нагрузка

- Worker выполняет только чтение публичных агрегированных источников.
- Автоматические сделки не выполняются.
- Интервал сбора — 15 минут.
- В D1 сохраняются только готовые анализируемые цепочки, а не весь рынок.
- Старые записи автоматически удаляются.
- При недоступности poe.watch сбор продолжается по poe.ninja с одним источником.

---

# Тесты

```bash
npm test
```

Версия 0.8.0 сохраняет 24 автоматических теста расчётного ядра. Дополнительно проверяется синтаксис Pages Functions и Worker.
