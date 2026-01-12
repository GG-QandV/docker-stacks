# Docker Stacks - Документация проекта

## Обзор проекта

Это инфраструктура оркестрации Docker контейнеров для проекта PetSafe Validator, предоставляющая микросервисную архитектуру с управлением контекстом, хранением данных, автоматизацией рабочих процессов и поддержкой AI-возможностей.

### Основная архитектура

Проект использует микросервисную архитектуру, все сервисы взаимодействуют через общую Docker сеть `orchestrator-network`. Context Manager выступает в качестве основного сервиса, отвечающего за синхронизацию данных между PostgreSQL и Weaviate, а также предоставляющий RESTful API интерфейс.

### Основные сервисы

| Сервис              | Порт | Технологический стек           | Назначение                                               |
| ------------------- | ---- | ------------------------------ | -------------------------------------------------------- |
| **context-manager** | 3001 | Node.js + Fastify + TypeScript | API управления контекстом, сервис синхронизации данных   |
| **postgresql**      | 5433 | PostgreSQL 17.6-alpine         | Хранилище структурированных данных, полнотекстовый поиск |
| **weaviate**        | 8087 | Weaviate Latest                | Векторная база данных, семантический поиск               |
| **n8n**             | 5678 | n8n Latest                     | Инструмент автоматизации рабочих процессов               |
| **langflow**        | 8082 | Langflow 1.0.19.post2          | Инструмент создания AI рабочих процессов                 |
| **redis**           | 6379 | Redis 7-alpine                 | Кэширование и очередь сообщений                          |
| **langgraph**       | -    | -                              | Сервис LangGraph                                         |
| **llm-service**     | -    | -                              | Сервис LLM                                               |
| **qdrant**          | -    | -                              | Векторная база данных Qdrant                             |
| **scraper**         | -    | -                              | Сервис веб-скрапинга                                     |
| **telegram-bot**    | -    | -                              | Telegram бот                                             |

## Сборка и запуск

### Предварительные требования

- Docker
- Docker Compose v2

### Запуск всех сервисов

```bash
# Перейти в корневую директорию проекта
cd /home/gg/orchestrator/docker-stacks

# 1. Создать общую сеть (если не существует)
docker network create orchestrator-network

# 2. Запустить PostgreSQL
cd postgresql && docker-compose up -d

# 3. Запустить Weaviate
cd ../weaviate && docker-compose up -d

# 4. Запустить Redis
cd ../redis && docker-compose up -d

# 5. Запустить Context Manager
cd ../context-manager && docker-compose up -d

# 6. Запустить n8n (опционально)
cd ../n8n && docker-compose up -d

# 7. Запустить Langflow (опционально)
cd ../langflow && docker-compose up -d
```

### Разработка Context Manager

```bash
cd context-manager

# Установить зависимости
npm install

# Режим разработки (с горячей перезагрузкой)
npm run dev

# Сборка производственной версии
npm run build

# Запуск производственной версии
npm start
```

### Проверка работоспособности

```bash
# Context Manager
curl http://localhost:3001/health

# PostgreSQL
docker exec postgresql-postgres-main-1 psql -U postgres -c "SELECT 1;"

# Weaviate
curl http://localhost:8087/v1/.well-known/ready

# Redis
docker exec redis redis-cli ping

# n8n
curl http://localhost:5678/healthz
```

### Остановка сервисов

```bash
# Остановить отдельный сервис
cd context-manager && docker-compose down

# Остановить все сервисы (нужно останавливать по одному)
cd postgresql && docker-compose down
cd ../weaviate && docker-compose down
cd ../redis && docker-compose down
cd ../n8n && docker-compose down
cd ../langflow && docker-compose down
```

## Context Manager API

Context Manager предоставляет полный RESTful API для управления контекстом.

### Основные эндпоинты

#### Проверка работоспособности

```bash
GET /health
```

#### Сохранение контекста

```bash
POST /api/context/save
Content-Type: application/json

{
  "sessionId": "session-123",
  "contextType": "conversation",
  "content": "Содержимое сообщения пользователя",
  "summary": "Сводка",
  "tags": ["tag1", "tag2"],
  "metadata": {},
  "projectId": "default",
  "logicalSection": "backend",
  "module": "f1",
  "techTags": ["typescript", "fastify"],
  "phase": "development",
  "priority": "high",
  "deploymentStage": "development",
  "marketPhase": "pre-launch"
}
```

#### Поиск контекста

```bash
POST /api/context/search
Content-Type: application/json

{
  "query": "Ключевые слова для поиска",
  "filters": {
    "sessionId": "session-123",
    "contextType": "conversation",
    "logicalSection": "backend",
    "module": "f1",
    "tags": ["tag1"],
    "techTags": ["typescript"]
  },
  "limit": 10
}
```

#### Получение контекста сессии

```bash
GET /api/context/session/:sessionId
```

#### Получение сегодняшнего контекста

```bash
GET /api/context/today
```

#### Получение вчерашнего контекста

```bash
GET /api/context/yesterday
```

#### Получение по логическому разделу

```bash
GET /api/context/section/:logicalSection
```

#### Получение по модулю

```bash
GET /api/context/module/:moduleId
```

#### Получение по разделу и модулю

```bash
GET /api/context/section/:logicalSection/module/:moduleId
```

#### Получение по приоритету

```bash
GET /api/context/priority/:priority  # high, medium, low
```

#### Получение по этапу развертывания

```bash
GET /api/context/deployment/:stage  # development, staging, production, maintenance
```

#### Получение по фазе рынка

```bash
GET /api/context/market/:phase  # pre-launch, launch, growth, maturity, decline
```

#### Получение по смещению даты

```bash
GET /api/context/day/offset/:offset  # 0=сегодня, 1=вчера, 2=позавчера...
```

#### Маркетинговая сводка

```bash
GET /api/context/marketing/summary
```

#### Дорожная карта продукта

```bash
GET /api/context/product/roadmap
```

#### Анализ конкурентов

```bash
GET /api/context/market/competitors
```

#### Синхронизация ожидающих контекстов

```bash
POST /api/context/sync
```

### Логические разделы

Допустимые логические разделы:

- **Технические**: backend, frontend, database, admin-panel, shared, infrastructure, testing, documentation, deployment, staging, production, monitoring, logging, scaling, backup, disaster-recovery, integrations, partnerships, apis, webhooks
- **Маркетинговые**: marketing, promotion, sales, branding, content, social-media, email-marketing, referral, affiliate, ambassador
- **Продуктовые**: product, features, roadmap, feedback, analytics, growth, retention, churn, optimization, experimentation
- **Рыночные**: customers, users, audience, market, competitors, pricing, monetization, subscription
- **Поддержка**: support, helpdesk, faq, security, compliance, privacy, incident

### Идентификаторы модулей

Допустимые идентификаторы модулей: `f1`, `f2`, `f3`, `f4`, `f5`, `f6`, `shared`, `none`

## Архитектура базы данных

### PostgreSQL

- **Имя базы данных**: `context_db`
- **Пользователь**: `postgres`
- **Пароль**: `Mart436780`
- **Основная таблица**: `development_context`

#### Структура таблицы development_context

| Поле             | Тип          | Описание             |
| ---------------- | ------------ | -------------------- |
| id               | SERIAL       | Первичный ключ       |
| sync_id          | VARCHAR(255) | ID синхронизации     |
| session_id       | VARCHAR(255) | ID сессии            |
| context_type     | VARCHAR(100) | Тип контекста        |
| content          | TEXT         | Содержимое           |
| summary          | TEXT         | Сводка               |
| tags             | TEXT[]       | Массив тегов         |
| metadata         | JSONB        | Метаданные           |
| project_id       | VARCHAR(100) | ID проекта           |
| logical_section  | VARCHAR(100) | Логический раздел    |
| module           | VARCHAR(50)  | Модуль               |
| tech_tags        | TEXT[]       | Технические теги     |
| phase            | VARCHAR(50)  | Фаза                 |
| priority         | VARCHAR(20)  | Приоритет            |
| deployment_stage | VARCHAR(50)  | Этап развертывания   |
| market_phase     | VARCHAR(50)  | Фаза рынка           |
| sync_status      | VARCHAR(20)  | Статус синхронизации |
| synced_at        | TIMESTAMP    | Время синхронизации  |
| created_at       | TIMESTAMP    | Время создания       |
| date             | DATE         | Дата                 |

### Weaviate

- **Имя класса**: `DevelopmentContext`
- **Размерность вектора**: 768
- **Поддерживаемые модули**: text2vec-openai, text2vec-huggingface

## Резервное копирование и восстановление

### Резервное копирование PostgreSQL

```bash
# Создание резервной копии
docker exec postgresql-postgres-main-1 pg_dump -U postgres context_db > backups/postgres-backup-$(date +%Y%m%d).sql

# Восстановление из резервной копии
docker exec -i postgresql-postgres-main-1 psql -U postgres context_db < backups/postgres-backup-20260110.sql
```

### Резервное копирование Weaviate

```bash
# Создание резервной копии
docker exec weaviate_weaviate-new_1 weaviate-cli backup create --backup-id backup-$(date +%Y%m%d)

# Восстановление из резервной копии
docker exec weaviate_weaviate-new_1 weaviate-cli backup restore --backup-id backup-20260110
```

## Соглашения по разработке

### Context Manager

- **Язык**: TypeScript
- **Фреймворк**: Fastify
- **Стиль кода**: Строгий режим TypeScript
- **Обработка ошибок**: Глобальный обработчик ошибок
- **Логирование**: Встроенное логирование Fastify

### Структура проекта

```
context-manager/
├── src/
│   ├── index.ts                 # Файл входа
│   ├── config/
│   │   └── index.ts             # Конфигурация
│   ├── services/
│   │   ├── postgres.service.ts  # Сервис PostgreSQL
│   │   ├── weaviate.service.ts  # Сервис Weaviate
│   │   └── embedding.service.ts # Сервис генерации эмбеддингов
│   ├── routes/
│   │   ├── health.routes.ts     # Маршрут проверки работоспособности
│   │   ├── context.routes.ts    # Маршрут контекста
│   │   ├── search.routes.ts     # Маршрут поиска
│   │   └── sync.routes.ts       # Маршрут синхронизации
│   ├── schemas/
│   │   └── context.schema.ts    # Схемы TypeBox
│   ├── middleware/
│   │   └── error-handler.ts     # Промежуточное ПО обработки ошибок
│   └── types/
│       └── index.ts             # Типы TypeScript
├── package.json
├── tsconfig.json
└── docker-compose.yml
```

### Переменные окружения

Context Manager поддерживает следующие переменные окружения:

- `DATABASE_URL`: Строка подключения PostgreSQL (по умолчанию: `postgresql://postgres:Mart436780@localhost:5433/context_db`)
- `WEAVIATE_URL`: URL Weaviate (по умолчанию: `http://localhost:8087`)
- `NODE_ENV`: Среда Node (по умолчанию: `production`)
- `PORT`: Порт сервиса (по умолчанию: `3001`)

### Конфигурация сети

Все сервисы используют общую сеть `orchestrator-network`, доступ к сервисам хоста осуществляется через `host.docker.internal`.

### Лимиты ресурсов

Лимиты ресурсов для сервисов:

| Сервис          | Лимит памяти | Резерв памяти |
| --------------- | ------------ | ------------- |
| context-manager | 512M         | 256M          |
| postgresql      | 1024M        | 512M          |
| weaviate        | 800M         | 500M          |
| n8n             | 1024M        | 512M          |
| langflow        | 1200M        | 800M          |
| redis           | 256M         | 128M          |

## Сохранение данных

Пути сохранения данных для сервисов:

| Сервис          | Путь на хосте                           | Путь в контейнере          |
| --------------- | --------------------------------------- | -------------------------- |
| context-manager | `~/orchestrator/context-data`           | `/app/data`                |
| postgresql      | `/home/gg/orchestrator/postgresql-data` | `/var/lib/postgresql/data` |
| weaviate        | `~/orchestrator/weaviate-new-data`      | `/var/lib/weaviate`        |
| n8n             | `/home/gg/orchestrator/n8n-data`        | `/home/node/.n8n`          |
| redis           | `~/orchestrator/redis-data`             | `/data`                    |
| langflow        | `~/orchestrator/langflow`               | `/app/langflow-data`       |

## Устранение неполадок

### Context Manager не запускается

1. Проверьте, запущены ли PostgreSQL и Weaviate
2. Проверьте существование сети `orchestrator-network`
3. Просмотрите логи: `docker logs context-manager`

### Сбой подключения к базе данных

1. Проверьте, запущен ли контейнер PostgreSQL
2. Проверьте учетные данные в строке подключения
3. Протестируйте подключение: `docker exec postgresql-postgres-main-1 psql -U postgres context_db`

### Сбой синхронизации Weaviate

1. Проверьте, запущен ли контейнер Weaviate
2. Проверьте конфигурацию URL Weaviate
3. Просмотрите статус синхронизации: `SELECT sync_status FROM development_context WHERE sync_status != 'synced'`

## Связанная документация

- [Руководство по Context Manager](../../projects/nutrition_data/petsafe-validator/docs/КОНТЕКСТ_МЕНЕДЖЕР_РУКОВОДСТВО.md)
- [Руководство по Agent](../../projects/nutrition_data/petsafe-validator/AGENT_CONTEXT_GUIDE.md)

## Информация о версии

- **Дата создания**: 2026-01-10
- **Текущая версия**: 1.0.0
- **Последнее обновление**: 2026-01-11