# PoE Arbitrage Dashboard 0.7.0

Веб-дашборд для поиска арбитражных цепочек Path of Exile 1.

Источники:

- poe.ninja — текущая агрегированная оценка;
- poe.watch — вторая оценка, объём, изменение за 24 часа и история;
- официальный Currency Exchange API GGG — фактические диапазоны курсов и объёмы последнего завершённого часа.

> Currency Exchange API не показывает текущий час и активную книгу заявок. Данные используются для подтверждения ликвидности и исторического диапазона, а не как гарантированная текущая цена у Фаустуса.

## Что добавлено в 0.7.0

- Pages Function `functions/api/currency-exchange.js`;
- OAuth `client_credentials` со scope `service:cxapi`;
- получение последнего завершённого часа с откатом до четырёх часов назад;
- сопоставление официальных market codes с позициями poe.ninja;
- диапазон цены покупки и продажи за прошлый час;
- фактический торговый объём Currency Exchange;
- консервативный и оптимистичный диапазон исторической прибыли;
- дополнительная часть оценки надёжности;
- экспорт официальных показателей в CSV;
- безопасный fallback: без OAuth дашборд продолжает работать на poe.ninja и poe.watch.

## Важное ограничение регистрации GGG

На момент подготовки версии 0.7.0 официальный раздел Getting Started сообщает, что GGG временно не обрабатывает заявки на регистрацию новых приложений.

Поэтому официальную интеграцию можно включить только если:

- у тебя уже есть зарегистрированное Confidential OAuth Application с `service:cxapi`; либо
- GGG снова откроет регистрацию новых приложений.

До этого на сайте будет отображаться `Аукцион GGG: не настроен`. Остальные функции продолжат работать.

## Установка обновления

1. Распакуй архив.
2. Загрузи содержимое папки в корень GitHub-репозитория.
3. Подтверди замену старых файлов.
4. Сделай Commit.
5. Дождись автоматического Deployment в Cloudflare Pages.
6. Открой сайт с `Ctrl + F5`.

Новый обязательный файл:

```text
functions/api/currency-exchange.js
```

## Настройка Currency Exchange API в Cloudflare

Открой:

```text
Cloudflare Dashboard
→ Workers & Pages
→ poe-arbitrage-dashboard
→ Settings
→ Variables and Secrets
```

### Вариант A — Client ID + Client Secret

Добавь секреты:

```text
POE_CLIENT_ID
POE_CLIENT_SECRET
```

И переменную или секрет с контактом владельца приложения:

```text
POE_CONTACT
```

`POE_CONTACT` должен содержать действующий email или адрес сайта для связи. Сервер сам запросит service token через:

```text
POST https://www.pathofexile.com/oauth/token
scope=service:cxapi
grant_type=client_credentials
```

### Вариант B — готовый service token

Добавь:

```text
POE_CLIENT_ID
POE_CX_ACCESS_TOKEN
POE_CONTACT
```

Не добавляй Client Secret или Access Token в GitHub. Они должны храниться только как Cloudflare Secrets.

После изменения переменных запусти новый Deployment.

## Проверка API

Без настроенных секретов:

```text
https://poe-arbitrage-dashboard.pages.dev/api/currency-exchange?league=Standard
```

Ожидаемый ответ:

```json
{
  "configured": false,
  "available": false
}
```

С настроенным OAuth:

```json
{
  "configured": true,
  "available": true,
  "league": "Standard",
  "hour": 1784300400,
  "markets": []
}
```

Поле `hour` — Unix timestamp начала проверенного завершённого часа.

## Демонстрационный режим

```text
https://poe-arbitrage-dashboard.pages.dev/?demo=1
```

В демо присутствуют тестовые данные Currency Exchange, поэтому можно проверить интерфейс без OAuth.

## Локальный запуск

Требуется Node.js 20+.

```bash
npm install
npm run dev
```

Для локальной проверки с секретами создай `.dev.vars` в корне проекта:

```text
POE_CLIENT_ID=your_client_id
POE_CLIENT_SECRET=your_client_secret
POE_CONTACT=your_email@example.com
```

Не загружай `.dev.vars` в GitHub.

## Тесты

```bash
npm test
```

Версия 0.7.0 содержит 24 автоматических теста.

## Интерпретация колонки «Аукцион GGG»

- `вход` — диапазон chaos за единицу сырья в прошлом завершённом часе;
- `выход` — диапазон chaos за единицу результата;
- выделенный диапазон — возможная историческая прибыль с учётом худших и лучших границ;
- `объём` — минимальный фактический объём среди входного и выходного предмета;
- `частично` — официальный рынок найден только для одной стороны;
- `нет рынка` — в проверенном часу не найден подходящий рынок;
- `не настроен` — отсутствуют OAuth credentials.

## Ограничения

- GGG не отдаёт данные текущего часа.
- API не отдаёт активные заявки покупки и продажи.
- Market codes могут не совпасть с идентификаторами poe.ninja; количество совпадений видно в сводке.
- Камни и уникальные предметы обычно не торгуются через Currency Exchange, поэтому для них официальное подтверждение будет отсутствовать или будет только у карточки-входа.
- Финальная проверка актуальной цены выполняется у Фаустуса в игре.

This product isn't affiliated with or endorsed by Grinding Gear Games in any way.
