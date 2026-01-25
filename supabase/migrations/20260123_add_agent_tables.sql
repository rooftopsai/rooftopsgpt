-- Migration: Add AI Agent tables for Rooftops AI Agent feature
-- This creates the infrastructure for tracking agent sessions, tasks, tool calls, and activity

-- Create agent_sessions table - tracks individual agent conversation sessions
CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'New Agent Session',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  model TEXT NOT NULL DEFAULT 'gpt-4o',
  system_prompt TEXT,
  total_tokens_used INTEGER NOT NULL DEFAULT 0,
  total_tasks_completed INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for agent_sessions
CREATE INDEX agent_sessions_user_id_idx ON agent_sessions (user_id);
CREATE INDEX agent_sessions_workspace_id_idx ON agent_sessions (workspace_id);
CREATE INDEX agent_sessions_status_idx ON agent_sessions (status);
CREATE INDEX agent_sessions_created_at_idx ON agent_sessions (created_at DESC);

-- Create trigger to update updated_at
CREATE TRIGGER update_agent_sessions_updated_at
  BEFORE UPDATE ON agent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for agent_sessions
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_sessions
CREATE POLICY "Users can view their own agent sessions" ON agent_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent sessions" ON agent_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent sessions" ON agent_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent sessions" ON agent_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all agent sessions" ON agent_sessions
  FOR ALL USING (auth.role() = 'service_role');


-- Create agent_messages table - stores all messages in agent conversations
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  tool_calls JSONB,
  tool_call_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for agent_messages
CREATE INDEX agent_messages_session_id_idx ON agent_messages (session_id);
CREATE INDEX agent_messages_user_id_idx ON agent_messages (user_id);
CREATE INDEX agent_messages_role_idx ON agent_messages (role);
CREATE INDEX agent_messages_created_at_idx ON agent_messages (created_at);

-- Enable RLS for agent_messages
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_messages
CREATE POLICY "Users can view their own agent messages" ON agent_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent messages" ON agent_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent messages" ON agent_messages
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all agent messages" ON agent_messages
  FOR ALL USING (auth.role() = 'service_role');


-- Create agent_tasks table - tracks goals/tasks assigned to the agent
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 0,
  result TEXT,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for agent_tasks
CREATE INDEX agent_tasks_session_id_idx ON agent_tasks (session_id);
CREATE INDEX agent_tasks_user_id_idx ON agent_tasks (user_id);
CREATE INDEX agent_tasks_status_idx ON agent_tasks (status);
CREATE INDEX agent_tasks_created_at_idx ON agent_tasks (created_at DESC);

-- Create trigger to update updated_at
CREATE TRIGGER update_agent_tasks_updated_at
  BEFORE UPDATE ON agent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for agent_tasks
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_tasks
CREATE POLICY "Users can view their own agent tasks" ON agent_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent tasks" ON agent_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent tasks" ON agent_tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent tasks" ON agent_tasks
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all agent tasks" ON agent_tasks
  FOR ALL USING (auth.role() = 'service_role');


-- Create agent_tool_executions table - logs all tool/action invocations
CREATE TABLE IF NOT EXISTS agent_tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  tool_input JSONB NOT NULL DEFAULT '{}',
  tool_output JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  execution_time_ms INTEGER,
  requires_confirmation BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for agent_tool_executions
CREATE INDEX agent_tool_executions_session_id_idx ON agent_tool_executions (session_id);
CREATE INDEX agent_tool_executions_task_id_idx ON agent_tool_executions (task_id);
CREATE INDEX agent_tool_executions_user_id_idx ON agent_tool_executions (user_id);
CREATE INDEX agent_tool_executions_tool_name_idx ON agent_tool_executions (tool_name);
CREATE INDEX agent_tool_executions_status_idx ON agent_tool_executions (status);
CREATE INDEX agent_tool_executions_created_at_idx ON agent_tool_executions (created_at DESC);

-- Enable RLS for agent_tool_executions
ALTER TABLE agent_tool_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_tool_executions
CREATE POLICY "Users can view their own tool executions" ON agent_tool_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tool executions" ON agent_tool_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tool executions" ON agent_tool_executions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all tool executions" ON agent_tool_executions
  FOR ALL USING (auth.role() = 'service_role');


-- Create agent_activity_log table - audit trail of all agent actions
CREATE TABLE IF NOT EXISTS agent_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'session_created', 'session_resumed', 'session_paused', 'session_completed',
    'message_sent', 'message_received',
    'task_created', 'task_started', 'task_completed', 'task_failed', 'task_cancelled',
    'tool_called', 'tool_completed', 'tool_failed', 'tool_confirmed',
    'error', 'warning', 'info'
  )),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for agent_activity_log
CREATE INDEX agent_activity_log_session_id_idx ON agent_activity_log (session_id);
CREATE INDEX agent_activity_log_user_id_idx ON agent_activity_log (user_id);
CREATE INDEX agent_activity_log_action_type_idx ON agent_activity_log (action_type);
CREATE INDEX agent_activity_log_created_at_idx ON agent_activity_log (created_at DESC);

-- Enable RLS for agent_activity_log
ALTER TABLE agent_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_activity_log
CREATE POLICY "Users can view their own activity log" ON agent_activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity log" ON agent_activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all activity logs" ON agent_activity_log
  FOR ALL USING (auth.role() = 'service_role');


-- Create agent_usage table - tracks token/task usage for billing
CREATE TABLE IF NOT EXISTS agent_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: YYYY-MM for easy querying
  total_tokens_input INTEGER NOT NULL DEFAULT 0,
  total_tokens_output INTEGER NOT NULL DEFAULT 0,
  total_tasks_executed INTEGER NOT NULL DEFAULT 0,
  total_tool_calls INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  estimated_cost_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, month)
);

-- Create indexes for agent_usage
CREATE INDEX agent_usage_user_id_idx ON agent_usage (user_id);
CREATE INDEX agent_usage_month_idx ON agent_usage (month);
CREATE INDEX agent_usage_user_month_idx ON agent_usage (user_id, month);

-- Create trigger to update updated_at
CREATE TRIGGER update_agent_usage_updated_at
  BEFORE UPDATE ON agent_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for agent_usage
ALTER TABLE agent_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_usage
CREATE POLICY "Users can view their own agent usage" ON agent_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent usage" ON agent_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent usage" ON agent_usage
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all agent usage" ON agent_usage
  FOR ALL USING (auth.role() = 'service_role');


-- Add comments for documentation
COMMENT ON TABLE agent_sessions IS 'Tracks AI agent conversation sessions for each user';
COMMENT ON TABLE agent_messages IS 'Stores all messages exchanged in agent conversations';
COMMENT ON TABLE agent_tasks IS 'Tracks goals and tasks assigned to the AI agent';
COMMENT ON TABLE agent_tool_executions IS 'Logs all tool/action invocations by the agent';
COMMENT ON TABLE agent_activity_log IS 'Audit trail of all agent activities for monitoring';
COMMENT ON TABLE agent_usage IS 'Tracks agent token and task usage for billing purposes';
