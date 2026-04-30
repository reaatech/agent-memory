-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Tenants table for multi-tenancy
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  config JSONB DEFAULT '{}'
);

-- Main memories table
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  owner_id UUID NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  source VARCHAR(50) NOT NULL,
  importance VARCHAR(20) NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.0,
  tags TEXT[] DEFAULT '{}',

  -- Lifecycle
  lifecycle VARCHAR(20) NOT NULL DEFAULT 'active',

  -- Temporal fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- Relationships
  relates_to UUID[],
  contradicts UUID[],
  supersedes UUID[],

  -- Embeddings
  embedding vector NOT NULL,
  embedding_model VARCHAR(100) NOT NULL,
  embedding_dimensions INTEGER NOT NULL,

  -- Versioning
  version INTEGER DEFAULT 1,
  history JSONB DEFAULT '[]'
);

-- Indexes for performance
CREATE INDEX idx_memories_tenant ON memories(tenant_id);
CREATE INDEX idx_memories_owner ON memories(owner_id);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_importance ON memories(importance);
CREATE INDEX idx_memories_lifecycle ON memories(lifecycle);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
CREATE INDEX idx_memories_created ON memories(created_at);
CREATE INDEX idx_memories_embedding ON memories USING hnsw(embedding vector_cosine_ops);

-- Memory version history
CREATE TABLE memory_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  changes JSONB NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by VARCHAR(100),

  UNIQUE(memory_id, version)
);

CREATE INDEX idx_memory_versions_memory_id ON memory_versions(memory_id);

-- Contradiction tracking
CREATE TABLE memory_contradictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  contradicts_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  similarity FLOAT,
  resolution_strategy VARCHAR(50),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(100),

  UNIQUE(memory_id, contradicts_id)
);

CREATE INDEX idx_memory_contradictions_memory_id ON memory_contradictions(memory_id);
CREATE INDEX idx_memory_contradictions_contradicts_id ON memory_contradictions(contradicts_id);
