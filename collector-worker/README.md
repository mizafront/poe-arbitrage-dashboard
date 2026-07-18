# History Collector Worker

Отдельный Cloudflare Worker для периодического сохранения арбитражных цепочек в D1.

Основная инструкция находится в корневом `README.md`.

Обязательный binding:

```text
PRICE_HISTORY
```

Рекомендуемые переменные:

```text
COLLECT_LEAGUES=auto
RETENTION_DAYS=14
```

Cron:

```text
*/15 * * * *
```
