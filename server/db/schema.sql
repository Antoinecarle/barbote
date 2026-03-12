-- Barbote - Wine Cellar Traceability Platform
-- PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- AUTHENTICATION & USERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS barbote_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'operator' CHECK (role IN ('admin', 'oenologue', 'operator', 'viewer')),
  cellar_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barbote_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES barbote_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- WINE CELLAR TRACEABILITY CORE
-- =============================================================================

-- Containers (cuves, barriques, tanks, etc.)
CREATE TABLE IF NOT EXISTS barbote_containers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL CHECK (type IN ('cuve_inox', 'cuve_beton', 'barrique', 'foudre', 'citerne', 'bouteille', 'autre')),
  capacity_liters DECIMAL(12,2) NOT NULL,
  current_volume_liters DECIMAL(12,2) DEFAULT 0,
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'empty', 'maintenance', 'cleaning')),
  material VARCHAR(100),
  vintage_year INTEGER,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wine lots (batches)
CREATE TABLE IF NOT EXISTS barbote_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_number VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL CHECK (type IN ('rouge', 'blanc', 'rose', 'petillant', 'mousseux', 'muté', 'autre')),
  appellation VARCHAR(255),
  vintage_year INTEGER,
  grape_varieties JSONB DEFAULT '[]', -- [{variety: "Merlot", percentage: 70}]
  initial_volume_liters DECIMAL(12,2) NOT NULL,
  current_volume_liters DECIMAL(12,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'bottled', 'sold', 'archived', 'spoiled')),
  origin_lot_ids UUID[] DEFAULT '{}', -- Parent lots (for traceability)
  parent_lots JSONB DEFAULT '[]', -- [{lot_id, percentage, volume}]
  analysis_matrix JSONB DEFAULT '{}', -- Current analysis values
  quality_score DECIMAL(5,2),
  harvest_date DATE,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES barbote_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lot-Container associations (current locations)
CREATE TABLE IF NOT EXISTS barbote_lot_containers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id UUID REFERENCES barbote_lots(id) ON DELETE CASCADE,
  container_id UUID REFERENCES barbote_containers(id) ON DELETE CASCADE,
  volume_liters DECIMAL(12,2) NOT NULL,
  filling_date TIMESTAMPTZ DEFAULT NOW(),
  emptying_date TIMESTAMPTZ,
  is_current BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MOVEMENTS (MOUVEMENTS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS barbote_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movement_type VARCHAR(100) NOT NULL CHECK (movement_type IN (
    'entree', 'sortie', 'transfert', 'assemblage', 'soutirage',
    'filtration', 'collage', 'centrifugation', 'chaptalisation',
    'acidification', 'sulfitage', 'levurage', 'malo', 'perte', 'bottling'
  )),
  lot_id UUID REFERENCES barbote_lots(id),
  from_container_id UUID REFERENCES barbote_containers(id),
  to_container_id UUID REFERENCES barbote_containers(id),
  volume_liters DECIMAL(12,2) NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  operator_id UUID REFERENCES barbote_users(id),
  -- For assemblages
  source_lots JSONB DEFAULT '[]', -- [{lot_id, volume, percentage}]
  target_lot_id UUID REFERENCES barbote_lots(id),
  -- Analysis impact
  pre_analysis JSONB DEFAULT '{}',
  post_analysis JSONB DEFAULT '{}',
  -- Inputs (intrants)
  inputs JSONB DEFAULT '[]', -- [{product: "SO2", quantity: 5, unit: "g/hL"}]
  volume_loss_liters DECIMAL(12,2) DEFAULT 0,
  reason TEXT,
  notes TEXT,
  validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES barbote_users(id),
  validated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES barbote_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ANALYSES
-- =============================================================================

CREATE TABLE IF NOT EXISTS barbote_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id UUID REFERENCES barbote_lots(id) ON DELETE CASCADE,
  container_id UUID REFERENCES barbote_containers(id),
  analysis_date TIMESTAMPTZ DEFAULT NOW(),
  analysis_type VARCHAR(100) DEFAULT 'standard' CHECK (analysis_type IN ('standard', 'complete', 'quick', 'external_lab')),
  lab_name VARCHAR(255),
  -- Standard wine analysis parameters
  alcohol_percent DECIMAL(5,2),
  residual_sugar_gl DECIMAL(8,3),
  total_acidity_gl DECIMAL(8,3),
  volatile_acidity_gl DECIMAL(8,3),
  ph DECIMAL(4,2),
  free_so2_mgl DECIMAL(8,2),
  total_so2_mgl DECIMAL(8,2),
  malic_acid_gl DECIMAL(8,3),
  lactic_acid_gl DECIMAL(8,3),
  tartaric_acid_gl DECIMAL(8,3),
  citric_acid_gl DECIMAL(8,3),
  glucose_fructose_gl DECIMAL(8,3),
  color_intensity DECIMAL(6,3),
  color_hue DECIMAL(6,3),
  turbidity_ntu DECIMAL(8,3),
  temperature_c DECIMAL(5,2),
  density DECIMAL(8,5),
  -- Extended parameters as JSONB
  extended_params JSONB DEFAULT '{}',
  comments TEXT,
  is_validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES barbote_users(id),
  created_by UUID REFERENCES barbote_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ASSEMBLAGE PLANS (AI ASSISTED)
-- =============================================================================

CREATE TABLE IF NOT EXISTS barbote_assemblage_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  target_volume_liters DECIMAL(12,2) NOT NULL,
  target_appellation VARCHAR(255),
  target_vintage_year INTEGER,
  target_analysis JSONB DEFAULT '{}', -- Target analysis objectives
  constraints JSONB DEFAULT '{}', -- Volume constraints, mandatory varieties, etc.
  -- Source lots candidates
  candidate_lots JSONB DEFAULT '[]',
  -- AI-generated scenarios
  scenarios JSONB DEFAULT '[]', -- [{id, lots: [{lot_id, percentage, volume}], predicted_analysis, score, reasoning}]
  selected_scenario_id VARCHAR(100),
  -- Execution
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_ai', 'scenarios_ready', 'approved', 'executed', 'cancelled')),
  executed_scenario_id VARCHAR(100),
  executed_at TIMESTAMPTZ,
  ai_model_used VARCHAR(100),
  ai_prompt_version VARCHAR(50),
  notes TEXT,
  created_by UUID REFERENCES barbote_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- OPERATIONS (TRAITEMENTS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS barbote_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_type VARCHAR(100) NOT NULL CHECK (operation_type IN (
    'sulfitage', 'levurage', 'collage', 'filtration', 'malo',
    'chaptalisation', 'acidification', 'desacidification', 'flash_pasteurisation',
    'micro_oxygenation', 'batonnage', 'autre'
  )),
  lot_id UUID REFERENCES barbote_lots(id),
  container_id UUID REFERENCES barbote_containers(id),
  date TIMESTAMPTZ DEFAULT NOW(),
  -- Products used
  products_used JSONB DEFAULT '[]', -- [{name, quantity, unit, batch_number}]
  dose_per_hl DECIMAL(10,4),
  volume_treated_liters DECIMAL(12,2),
  temperature_c DECIMAL(5,2),
  purpose TEXT NOT NULL,
  expected_effect TEXT,
  actual_effect TEXT,
  operator_id UUID REFERENCES barbote_users(id),
  status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done', 'cancelled')),
  regulatory_compliant BOOLEAN DEFAULT true,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INPUTS (INTRANTS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS barbote_inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL CHECK (category IN (
    'so2', 'enzyme', 'levure', 'bacterie', 'colle', 'bentonite',
    'charbon', 'filtre', 'acide', 'sucre', 'tannin', 'autre'
  )),
  brand VARCHAR(255),
  batch_number VARCHAR(100),
  quantity DECIMAL(10,3),
  unit VARCHAR(50),
  expiry_date DATE,
  regulatory_authorized BOOLEAN DEFAULT true,
  max_dose_per_hl DECIMAL(10,4),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- AI CONVERSATIONS (CHAT)
-- =============================================================================

CREATE TABLE IF NOT EXISTS barbote_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES barbote_users(id) ON DELETE CASCADE,
  title VARCHAR(500),
  context_type VARCHAR(100) DEFAULT 'general' CHECK (context_type IN (
    'general', 'assemblage', 'traceability', 'analysis', 'compliance'
  )),
  context_ids JSONB DEFAULT '{}', -- Related lot_ids, container_ids, etc.
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barbote_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES barbote_conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  structured_data JSONB, -- For structured responses
  tokens_used INTEGER,
  model VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- AUDIT TRAIL (AUDITABILITÉ)
-- =============================================================================

CREATE TABLE IF NOT EXISTS barbote_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES barbote_users(id),
  user_email VARCHAR(255),
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MAINTENANCE (OPTIONAL MODULE)
-- =============================================================================

CREATE TABLE IF NOT EXISTS barbote_maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  container_id UUID REFERENCES barbote_containers(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(100) NOT NULL CHECK (maintenance_type IN (
    'cleaning', 'repair', 'inspection', 'calibration', 'replacement', 'autre'
  )),
  scheduled_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done', 'cancelled')),
  description TEXT NOT NULL,
  technician VARCHAR(255),
  cost DECIMAL(10,2),
  notes TEXT,
  documents JSONB DEFAULT '[]',
  created_by UUID REFERENCES barbote_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS barbote_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES barbote_users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_lots_status ON barbote_lots(status);
CREATE INDEX IF NOT EXISTS idx_lots_vintage ON barbote_lots(vintage_year);
CREATE INDEX IF NOT EXISTS idx_lots_appellation ON barbote_lots(appellation);
CREATE INDEX IF NOT EXISTS idx_movements_lot ON barbote_movements(lot_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON barbote_movements(date);
CREATE INDEX IF NOT EXISTS idx_movements_type ON barbote_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_validated ON barbote_movements(validated);
CREATE INDEX IF NOT EXISTS idx_analyses_lot ON barbote_analyses(lot_id);
CREATE INDEX IF NOT EXISTS idx_analyses_date ON barbote_analyses(analysis_date);
CREATE INDEX IF NOT EXISTS idx_analyses_free_so2 ON barbote_analyses(free_so2_mgl);
CREATE INDEX IF NOT EXISTS idx_lot_containers_current ON barbote_lot_containers(lot_id, is_current);
CREATE INDEX IF NOT EXISTS idx_audit_table ON barbote_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON barbote_audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_created ON barbote_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON barbote_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_containers_status ON barbote_containers(status);
CREATE INDEX IF NOT EXISTS idx_operations_lot ON barbote_operations(lot_id);
CREATE INDEX IF NOT EXISTS idx_operations_date ON barbote_operations(date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON barbote_notifications(user_id, read);

-- =============================================================================
-- AI METRICS (Latency, Success Rate, Error Tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS barbote_ai_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation VARCHAR(100) NOT NULL,
  success BOOLEAN NOT NULL,
  latency_ms INTEGER NOT NULL,
  attempt INTEGER DEFAULT 1,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_metrics_operation ON barbote_ai_metrics(operation, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_success ON barbote_ai_metrics(success, created_at DESC);

-- =============================================================================
-- AUDIT TRIGGER FUNCTION
-- Automatically logs INSERT/UPDATE/DELETE on critical tables
-- =============================================================================

CREATE OR REPLACE FUNCTION barbote_audit_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO barbote_audit_log (table_name, record_id, action, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO barbote_audit_log (table_name, record_id, action, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO barbote_audit_log (table_name, record_id, action, old_data, new_data)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
DO $$
BEGIN
  -- Lots
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_barbote_lots') THEN
    CREATE TRIGGER audit_barbote_lots
    AFTER INSERT OR UPDATE OR DELETE ON barbote_lots
    FOR EACH ROW EXECUTE FUNCTION barbote_audit_trigger_fn();
  END IF;
  -- Movements (append-only but track deletions in case of admin override)
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_barbote_movements') THEN
    CREATE TRIGGER audit_barbote_movements
    AFTER INSERT OR UPDATE OR DELETE ON barbote_movements
    FOR EACH ROW EXECUTE FUNCTION barbote_audit_trigger_fn();
  END IF;
  -- Analyses
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_barbote_analyses') THEN
    CREATE TRIGGER audit_barbote_analyses
    AFTER INSERT OR UPDATE OR DELETE ON barbote_analyses
    FOR EACH ROW EXECUTE FUNCTION barbote_audit_trigger_fn();
  END IF;
  -- Operations (sulfitage, chaptalisation, etc.)
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_barbote_operations') THEN
    CREATE TRIGGER audit_barbote_operations
    AFTER INSERT OR UPDATE OR DELETE ON barbote_operations
    FOR EACH ROW EXECUTE FUNCTION barbote_audit_trigger_fn();
  END IF;
END;
$$;

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- Automatically updates updated_at on modification
-- =============================================================================

CREATE OR REPLACE FUNCTION barbote_updated_at_fn()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_lots') THEN
    CREATE TRIGGER set_updated_at_lots
    BEFORE UPDATE ON barbote_lots
    FOR EACH ROW EXECUTE FUNCTION barbote_updated_at_fn();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_containers') THEN
    CREATE TRIGGER set_updated_at_containers
    BEFORE UPDATE ON barbote_containers
    FOR EACH ROW EXECUTE FUNCTION barbote_updated_at_fn();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_movements') THEN
    CREATE TRIGGER set_updated_at_movements
    BEFORE UPDATE ON barbote_movements
    FOR EACH ROW EXECUTE FUNCTION barbote_updated_at_fn();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_operations') THEN
    CREATE TRIGGER set_updated_at_operations
    BEFORE UPDATE ON barbote_operations
    FOR EACH ROW EXECUTE FUNCTION barbote_updated_at_fn();
  END IF;
END;
$$;

-- =============================================================================
-- SO2 ALERT VIEW — Lots with low free SO2 (< 20 mg/L)
-- =============================================================================

CREATE OR REPLACE VIEW barbote_so2_alerts AS
SELECT
  l.id as lot_id,
  l.lot_number,
  l.name as lot_name,
  l.type as wine_type,
  l.appellation,
  l.current_volume_liters,
  a.free_so2_mgl,
  a.total_so2_mgl,
  a.analysis_date,
  CASE
    WHEN a.free_so2_mgl < 10 THEN 'critical'
    WHEN a.free_so2_mgl < 20 THEN 'warning'
    ELSE 'ok'
  END as alert_level
FROM barbote_lots l
JOIN LATERAL (
  SELECT free_so2_mgl, total_so2_mgl, analysis_date
  FROM barbote_analyses
  WHERE lot_id = l.id
  ORDER BY analysis_date DESC
  LIMIT 1
) a ON true
WHERE l.status = 'active'
  AND a.free_so2_mgl IS NOT NULL
  AND a.free_so2_mgl < 20;

-- =============================================================================
-- VOLUME BALANCE CHECK FUNCTION
-- Returns discrepancy for a lot (should be 0)
-- =============================================================================

CREATE OR REPLACE FUNCTION barbote_check_volume_balance(p_lot_id UUID)
RETURNS TABLE(
  lot_id UUID,
  lot_number VARCHAR,
  initial_volume DECIMAL,
  current_volume DECIMAL,
  computed_volume DECIMAL,
  discrepancy DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.lot_number,
    l.initial_volume_liters,
    l.current_volume_liters,
    COALESCE(
      l.initial_volume_liters +
      SUM(CASE
        WHEN m.movement_type IN ('entree') THEN m.volume_liters
        WHEN m.movement_type IN ('sortie', 'perte', 'bottling') THEN -m.volume_liters
        WHEN m.movement_type = 'transfert' THEN
          CASE WHEN m.to_container_id IS NOT NULL AND m.from_container_id IS NOT NULL THEN 0
               WHEN m.lot_id = l.id THEN 0
               ELSE 0 END
        ELSE 0
      END),
      l.initial_volume_liters
    ) as computed_volume,
    ABS(l.current_volume_liters - COALESCE(
      l.initial_volume_liters + SUM(CASE
        WHEN m.movement_type = 'entree' THEN m.volume_liters
        WHEN m.movement_type IN ('sortie', 'perte', 'bottling') THEN -m.volume_liters
        ELSE 0
      END),
      l.initial_volume_liters
    )) as discrepancy
  FROM barbote_lots l
  LEFT JOIN barbote_movements m ON m.lot_id = l.id
  WHERE l.id = p_lot_id
  GROUP BY l.id, l.lot_number, l.initial_volume_liters, l.current_volume_liters;
END;
$$ LANGUAGE plpgsql;
