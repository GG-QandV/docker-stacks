import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Pool } from 'pg';
import weaviate from 'weaviate-ts-client';

const fastify = Fastify({ logger: true });

// Register CORS
fastify.register(cors);

// Initialize PostgreSQL
const pg = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mart436780@localhost:5433/context_db'
});

// Initialize Weaviate
const weaviateClient = weaviate.client({
  scheme: 'http',
  host: process.env.WEAVIATE_URL?.replace('http://', '') || 'localhost:8087',
  headers: { 'Content-Type': 'application/json' },
});

// Helper function to generate sync ID
function generateSyncId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to validate logical section
function isValidLogicalSection(section: string): boolean {
  const validSections = [
    'backend', 'frontend', 'database', 'admin-panel', 
    'shared', 'infrastructure', 'testing', 'documentation',
    'deployment', 'staging', 'production', 'monitoring', 
    'logging', 'scaling', 'backup', 'disaster-recovery',
    'marketing', 'promotion', 'sales', 'branding', 
    'content', 'social-media', 'email-marketing', 
    'referral', 'affiliate', 'ambassador',
    'product', 'features', 'roadmap', 'feedback', 
    'analytics', 'growth', 'retention', 'churn', 
    'optimization', 'experimentation',
    'customers', 'users', 'audience', 'market', 
    'competitors', 'pricing', 'monetization', 'subscription',
    'support', 'helpdesk', 'faq', 'security', 
    'compliance', 'privacy', 'incident',
    'integrations', 'partnerships', 'apis', 'webhooks'
  ];
  return validSections.includes(section);
}

// Helper function to validate module
function isValidModule(module: string): boolean {
  const validModules = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'shared', 'none'];
  return validModules.includes(module);
}

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  try {
    const pgResult = await pg.query('SELECT 1');
    const weaviateSchema = await weaviateClient.schema.getter().do();
    
    return {
      status: 'healthy',
      postgresql: pgResult.rows.length > 0 ? 'connected' : 'disconnected',
      weaviate: weaviateSchema ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    reply.code(500);
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Save context endpoint
fastify.post('/api/context/save', async (request, reply) => {
  try {
    const body = request.body as any;
    const {
      sessionId,
      contextType,
      content,
      summary,
      tags,
      metadata,
      projectId,
      logicalSection,
      module,
      techTags,
      phase,
      priority,
      deploymentStage,
      marketPhase
    } = body;

    if (!sessionId || !contextType || !content) {
      reply.code(400);
      return { error: 'Missing required fields: sessionId, contextType, content' };
    }

    if (logicalSection && !isValidLogicalSection(logicalSection)) {
      reply.code(400);
      return { error: `Invalid logical_section. Must be one of: backend, frontend, database, admin-panel, shared, infrastructure, testing, documentation, deployment, staging, production, monitoring, logging, scaling, backup, disaster-recovery, marketing, promotion, sales, branding, content, social-media, email-marketing, referral, affiliate, ambassador, product, features, roadmap, feedback, analytics, growth, retention, churn, optimization, experimentation, customers, users, audience, market, competitors, pricing, monetization, subscription, support, helpdesk, faq, security, compliance, privacy, incident, integrations, partnerships, apis, webhooks` };
    }

    if (module && !isValidModule(module)) {
      reply.code(400);
      return { error: `Invalid module. Must be one of: f1, f2, f3, f4, f5, f6, shared, none` };
    }

    const syncId = generateSyncId();

    const pgResult = await pg.query(
      `INSERT INTO development_context 
       (sync_id, session_id, context_type, content, summary, tags, metadata, project_id, logical_section, module, tech_tags, phase, priority, deployment_stage, market_phase)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id`,
      [
        syncId,
        sessionId,
        contextType,
        content,
        summary || content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        tags || [],
        JSON.stringify(metadata || {}),
        projectId || 'default',
        logicalSection || null,
        module || null,
        techTags || [],
        phase || null,
        priority || null,
        deploymentStage || null,
        marketPhase || null
      ]
    );

    try {
      await weaviateClient.data.creator()
        .withClassName('DevelopmentContext')
        .withProperties({
          sessionId,
          contextType,
          content,
          tags: tags || [],
          timestamp: new Date().toISOString(),
          projectId: projectId || 'default',
          syncId,
          logicalSection: logicalSection || null,
          module: module || null,
          techTags: techTags || [],
          phase: phase || null,
          priority: priority || null,
          deploymentStage: deploymentStage || null,
          marketPhase: marketPhase || null
        })
        .withVector(Array(768).fill(0).map(() => Math.random()))
        .do();

      await pg.query(
        `UPDATE development_context 
         SET sync_status = 'synced', synced_at = NOW()
         WHERE sync_id = $1`,
        [syncId]
      );
    } catch (weaviateError) {
      await pg.query(
        `UPDATE development_context 
         SET sync_status = 'failed'
         WHERE sync_id = $1`,
        [syncId]
      );
      throw weaviateError;
    }

    return {
      success: true,
      syncId,
      id: pgResult.rows[0].id
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Search context endpoint
fastify.post('/api/context/search', async (request, reply) => {
  try {
    const body = request.body as any;
    const { query, filters, limit = 10 } = body;

    if (!query) {
      reply.code(400);
      return { error: 'Missing required field: query' };
    }

    let sql = `
      SELECT *, 
             ts_rank_cd(to_tsvector('english', content), plainto_tsquery('english', $1)) as rank
      FROM development_context
      WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $1)
    `;
    const params: any[] = [query];
    let paramIndex = 2;

    if (filters?.sessionId) {
      sql += ` AND session_id = $${paramIndex++}`;
      params.push(filters.sessionId);
    }
    if (filters?.contextType) {
      sql += ` AND context_type = $${paramIndex++}`;
      params.push(filters.contextType);
    }
    if (filters?.logicalSection) {
      sql += ` AND logical_section = $${paramIndex++}`;
      params.push(filters.logicalSection);
    }
    if (filters?.module) {
      sql += ` AND module = $${paramIndex++}`;
      params.push(filters.module);
    }
    if (filters?.phase) {
      sql += ` AND phase = $${paramIndex++}`;
      params.push(filters.phase);
    }
    if (filters?.priority) {
      sql += ` AND priority = $${paramIndex++}`;
      params.push(filters.priority);
    }
    if (filters?.deploymentStage) {
      sql += ` AND deployment_stage = $${paramIndex++}`;
      params.push(filters.deploymentStage);
    }
    if (filters?.marketPhase) {
      sql += ` AND market_phase = $${paramIndex++}`;
      params.push(filters.marketPhase);
    }
    if (filters?.tags && filters.tags.length > 0) {
      sql += ` AND tags && $${paramIndex++}`;
      params.push(filters.tags);
    }
    if (filters?.techTags && filters.techTags.length > 0) {
      sql += ` AND tech_tags && $${paramIndex++}`;
      params.push(filters.techTags);
    }
    if (filters?.projectId) {
      sql += ` AND project_id = $${paramIndex++}`;
      params.push(filters.projectId);
    }

    sql += ` ORDER BY rank DESC LIMIT $${paramIndex++}`;
    params.push(limit);

    const pgResult = await pg.query(sql, params);

    return {
      success: true,
      results: pgResult.rows,
      count: pgResult.rows.length
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get session context endpoint
fastify.get('/api/context/session/:sessionId', async (request, reply) => {
  try {
    const { sessionId } = request.params as { sessionId: string };

    const result = await pg.query(
      `SELECT * FROM development_context 
       WHERE session_id = $1 
       ORDER BY created_at ASC`,
      [sessionId]
    );

    return {
      success: true,
      results: result.rows,
      count: result.rows.length
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get context by sync ID endpoint
fastify.get('/api/context/sync/:syncId', async (request, reply) => {
  try {
    const { syncId } = request.params as { syncId: string };

    const result = await pg.query(
      'SELECT * FROM development_context WHERE sync_id = $1',
      [syncId]
    );

    if (result.rows.length === 0) {
      reply.code(404);
      return {
        success: false,
        error: 'Context not found'
      };
    }

    return {
      success: true,
      result: result.rows[0]
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get today's contexts
fastify.get('/api/context/today', async (request, reply) => {
  try {
    const result = await pg.query(
      `SELECT * FROM development_context 
       WHERE date = CURRENT_DATE
       ORDER BY created_at ASC`
    );

    return {
      success: true,
      results: result.rows,
      count: result.rows.length
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get yesterday's contexts
fastify.get('/api/context/yesterday', async (request, reply) => {
  try {
    const result = await pg.query(
      `SELECT * FROM development_context 
       WHERE date = CURRENT_DATE - INTERVAL '1 day'
       ORDER BY created_at ASC`
    );

    return {
      success: true,
      results: result.rows,
      count: result.rows.length
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get by logical section
fastify.get('/api/context/section/:logicalSection', async (request, reply) => {
  try {
    const { logicalSection } = request.params as { logicalSection: string };

    if (!isValidLogicalSection(logicalSection)) {
      reply.code(400);
      return { error: 'Invalid logical section' };
    }

    const result = await pg.query(
      `SELECT * FROM development_context 
       WHERE logical_section = $1
       ORDER BY created_at DESC`,
      [logicalSection]
    );

    return {
      success: true,
      results: result.rows,
      count: result.rows.length
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get by module
fastify.get('/api/context/module/:moduleId', async (request, reply) => {
  try {
    const { moduleId } = request.params as { moduleId: string };

    if (!isValidModule(moduleId)) {
      reply.code(400);
      return { error: 'Invalid module' };
    }

    const result = await pg.query(
      `SELECT * FROM development_context 
       WHERE module = $1
       ORDER BY created_at DESC`,
      [moduleId]
    );

    return {
      success: true,
      results: result.rows,
      count: result.rows.length
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get by section and module
fastify.get('/api/context/section/:logicalSection/module/:moduleId', async (request, reply) => {
  try {
    const { logicalSection, moduleId } = request.params as { logicalSection: string, moduleId: string };

    if (!isValidLogicalSection(logicalSection)) {
      reply.code(400);
      return { error: 'Invalid logical section' };
    }

    if (!isValidModule(moduleId)) {
      reply.code(400);
      return { error: 'Invalid module' };
    }

    const result = await pg.query(
      `SELECT * FROM development_context 
       WHERE logical_section = $1 AND module = $2
       ORDER BY created_at DESC`,
      [logicalSection, moduleId]
    );

    return {
      success: true,
      results: result.rows,
      count: result.rows.length
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get by priority
fastify.get('/api/context/priority/:priority', async (request, reply) => {
  try {
    const { priority } = request.params as { priority: string };

    if (!['high', 'medium', 'low'].includes(priority)) {
      reply.code(400);
      return { error: 'Invalid priority' };
    }

    const result = await pg.query(
      `SELECT * FROM development_context 
       WHERE priority = $1
       ORDER BY created_at DESC`,
      [priority]
    );

    return {
      success: true,
      results: result.rows,
      count: result.rows.length
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get by deployment stage
fastify.get('/api/context/deployment/:stage', async (request, reply) => {
  try {
    const { stage } = request.params as { stage: string };

    if (!['development', 'staging', 'production', 'maintenance'].includes(stage)) {
      reply.code(400);
      return { error: 'Invalid deployment stage' };
    }

    const result = await pg.query(
      `SELECT * FROM development_context 
       WHERE deployment_stage = $1
       ORDER BY created_at DESC`,
      [stage]
    );

    return {
      success: true,
      results: result.rows,
      count: result.rows.length
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get by market phase
fastify.get('/api/context/market/:phase', async (request, reply) => {
  try {
    const { phase } = request.params as { phase: string };

    if (!['pre-launch', 'launch', 'growth', 'maturity', 'decline'].includes(phase)) {
      reply.code(400);
      return { error: 'Invalid market phase' };
    }

    const result = await pg.query(
      `SELECT * FROM development_context 
       WHERE market_phase = $1
       ORDER BY created_at DESC`,
      [phase]
    );

    return {
      success: true,
      results: result.rows,
      count: result.rows.length
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get day by offset
fastify.get('/api/context/day/offset/:offset', async (request, reply) => {
  try {
    const { offset } = request.params as { offset: string };
    const offsetNum = parseInt(offset, 10);

    if (isNaN(offsetNum) || offsetNum < 0) {
      reply.code(400);
      return { error: 'Invalid offset' };
    }

    const result = await pg.query(
      `SELECT * FROM development_context 
       WHERE date = CURRENT_DATE - INTERVAL '${offsetNum} days'
       ORDER BY created_at ASC`
    );

    return {
      success: true,
      results: result.rows,
      count: result.rows.length,
      date: new Date(Date.now() - offsetNum * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get marketing summary
fastify.get('/api/context/marketing/summary', async (request, reply) => {
  try {
    const result = await pg.query(
      `SELECT 
        logical_section,
        COUNT(*) as total_contexts,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT topic) as unique_topics
       FROM development_context
       WHERE logical_section IN ('marketing', 'promotion', 'sales', 'branding', 'content', 'social-media', 'email-marketing', 'referral', 'affiliate', 'ambassador')
       GROUP BY logical_section
       ORDER BY total_contexts DESC`
    );

    return {
      success: true,
      results: result.rows,
      summary: {
        totalMarketingContexts: result.rows.reduce((sum, r) => sum + parseInt(r.total_contexts), 0),
        sections: result.rows.length
      }
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get product roadmap
fastify.get('/api/context/product/roadmap', async (request, reply) => {
  try {
    const result = await pg.query(
      `SELECT * FROM development_context 
       WHERE logical_section IN ('product', 'features', 'roadmap')
       ORDER BY created_at DESC`
    );

    return {
      success: true,
      results: result.rows,
      count: result.rows.length
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get competitor analysis
fastify.get('/api/context/market/competitors', async (request, reply) => {
  try {
    const result = await pg.query(
      `SELECT * FROM development_context 
       WHERE logical_section = 'competitors'
       ORDER BY created_at DESC`
    );

    return {
      success: true,
      results: result.rows,
      count: result.rows.length
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Sync pending contexts endpoint
fastify.post('/api/context/sync', async (request, reply) => {
  try {
    const result = await pg.query(
      `SELECT * FROM development_context 
       WHERE sync_status = 'pending' OR sync_status = 'failed'`
    );

    let synced = 0;
    let failed = 0;

    for (const row of result.rows) {
      try {
        await weaviateClient.data.creator()
          .withClassName('DevelopmentContext')
          .withProperties({
            sessionId: row.session_id,
            contextType: row.context_type,
            content: row.content,
            tags: row.tags,
            timestamp: row.created_at,
            projectId: row.project_id,
            syncId: row.sync_id,
            logicalSection: row.logical_section,
            module: row.module,
            techTags: row.tech_tags,
            phase: row.phase,
            priority: row.priority,
            deploymentStage: row.deployment_stage,
            marketPhase: row.market_phase
          })
          .withVector(Array(768).fill(0).map(() => Math.random()))
          .do();

        await pg.query(
          `UPDATE development_context 
           SET sync_status = 'synced', synced_at = NOW()
           WHERE sync_id = $1`,
          [row.sync_id]
        );
        synced++;
      } catch (error) {
        fastify.log.error(error instanceof Error ? error.message : String(error));
        failed++;
      }
    }

    return {
      success: true,
      synced,
      failed,
      total: result.rows.length
    };
  } catch (error) {
    fastify.log.error(error instanceof Error ? error.message : String(error));
    reply.code(500);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Context Manager server running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
