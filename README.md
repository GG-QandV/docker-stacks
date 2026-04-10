# Context Manager API Service

The core orchestration service for managing AI Agent context, providing a bridge between structured PostgreSQL data and high-performance vector search.

## ✨ Features

- **Dual-Database Sync**: Automatic synchronization between PostgreSQL and Weaviate/Qdrant.
- **MCP Integration**: Compatible with Model Context Protocol for seamless integration with AI tools.
- **RESTful API**: Fast and secure endpoints built with Fastify.
- **Semantic Retrieval**: Advanced RAG patterns support out-of-the-box.

## 🛠 Setup & Installation

### Environment Variables
Create a `.env` file in this directory (refer to `.env.example` if available or the internal list):

```ini
PORT=3847
DATABASE_URL=postgresql://user:pass@host:port/db
WEAVIATE_HOST=localhost:8087
# ... see full list in .env
```

### Running Locally
```bash
npm install
npm run dev
```

### Running via Docker
```bash
docker build -t context-manager .
docker run -p 3847:3847 --env-file .env context-manager
```

## 🔌 API Documentation

Detailed endpoint documentation can be found in `docs/` or inferred from the schemas in `src/schemas/`.

### Core Endpoints:
- `POST /v1/context`: Save new context entry.
- `GET /v1/context/search`: Semantic search over stored context.
- `GET /health`: System health status.

## 🏗 Architecture

The service is structured following modular patterns:
- `src/services`: Core logic (Sync, Embeddings, DB access).
- `src/routes`: API route definitions.
- `src/schemas`: Validation schemas (TypeBox).
- `resync_qdrant.py`: Utility script for manual high-volume vector synchronization.

---
**Maintained by:** GG-QandV  
**Part of:** [Context-MCP Infrastructure](../README.md)
