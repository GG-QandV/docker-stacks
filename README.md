# Docker Stacks - Context Management Infrastructure

Независимый репозиторий для Docker стеков управления контекстом проекта PetSafe Validator.

## 📁 Структура

```
docker-stacks/
├── context-manager/    # Context Manager API (Node.js + Fastify)
├── postgresql/          # PostgreSQL database
├── weaviate/            # Weaviate vector database
├── backups/             # Бэкапы баз данных
├── README.md
└── .gitignore
```

## 🚀 Быстрый старт

### 1. Запуск всех сервисов

```bash
cd /home/gg/orchestrator/docker-stacks

# PostgreSQL
cd postgresql && docker-compose up -d

# Weaviate
cd ../weaviate && docker-compose up -d

# Context Manager
cd ../context-manager && docker-compose up -d
```

### 2. Проверка здоровья

```bash
# Context Manager
curl http://localhost:3001/health

# PostgreSQL
docker exec postgresql-postgres-main-1 psql -U postgres -c "SELECT 1;"

# Weaviate
curl http://localhost:8087/v1/.well-known/ready
```

## 📊 Порты

| Сервис | Порт |
|--------|------|
| Context Manager | 3001 |
| PostgreSQL | 5433 |
| Weaviate | 8087 |

## 💾 Бэкапы

### PostgreSQL

```bash
# Создать бэкап
docker exec postgresql-postgres-main-1 pg_dump -U postgres context_db > backups/postgres-backup-$(date +%Y%m%d).sql

# Восстановить бэкап
docker exec -i postgresql-postgres-main-1 psql -U postgres context_db < backups/postgres-backup-20260110.sql
```

### Weaviate

```bash
# Создать бэкап
docker exec weaviate_weaviate-new_1 weaviate-cli backup create --backup-id backup-$(date +%Y%m%d)

# Восстановить бэкап
docker exec weaviate_weaviate-new_1 weaviate-cli backup restore --backup-id backup-20260110
```

## 📚 Документация

- [Context Manager Руководство](../../projects/nutrition_data/petsafe-validator/docs/КОНТЕКСТ_МЕНЕДЖЕР_РУКОВОДСТВО.md)
- [Agent Guide](../../projects/nutrition_data/petsafe-validator/AGENT_CONTEXT_GUIDE.md)

## 🔧 Технологии

- **Context Manager:** Node.js, Fastify, TypeScript
- **PostgreSQL:** 17.6-alpine
- **Weaviate:** Latest
- **Docker Compose:** v2

## 📝 Заметки

- PostgreSQL хранит структурированные данные и обеспечивает полнотекстовый поиск
- Weaviate обеспечивает векторный поиск для семантического поиска
- Context Manager синхронизирует данные между двумя базами данных

---

**Создано:** 2026-01-10
**Версия:** 1.0.0
