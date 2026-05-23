"""init

Revision ID: 32d27e1e42c0
Revises:
Create Date: 2026-05-23 23:24:29.996906

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '32d27e1e42c0'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables."""
    op.create_table(
        "agent_configs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("system_prompt", sa.Text(), nullable=False),
        sa.Column("model", sa.String(100), nullable=False, server_default="groq/llama3-8b-8192"),
        sa.Column("temperature", sa.Float(), nullable=False, server_default="0.7"),
        sa.Column("voice_settings", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "sessions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("config_id", sa.String(), sa.ForeignKey("agent_configs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
    )

    op.create_table(
        "session_turns",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("session_id", sa.String(), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("stt_ms", sa.Integer(), nullable=True),
        sa.Column("llm_ms", sa.Integer(), nullable=True),
        sa.Column("tts_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "metrics",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("config_id", sa.String(), sa.ForeignKey("agent_configs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", sa.String(), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("stage", sa.String(20), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("error", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "llm_models",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("model_id", sa.String(100), nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # Indexes for common query patterns
    op.create_index("ix_sessions_config_id", "sessions", ["config_id"])
    op.create_index("ix_session_turns_session_id", "session_turns", ["session_id"])
    op.create_index("ix_metrics_config_id", "metrics", ["config_id"])
    op.create_index("ix_metrics_session_id", "metrics", ["session_id"])
    op.create_index("ix_llm_models_provider", "llm_models", ["provider"])


def downgrade() -> None:
    """Drop all tables in reverse order."""
    op.drop_index("ix_llm_models_provider", "llm_models")
    op.drop_index("ix_metrics_session_id", "metrics")
    op.drop_index("ix_metrics_config_id", "metrics")
    op.drop_index("ix_session_turns_session_id", "session_turns")
    op.drop_index("ix_sessions_config_id", "sessions")

    op.drop_table("llm_models")
    op.drop_table("metrics")
    op.drop_table("session_turns")
    op.drop_table("sessions")
    op.drop_table("agent_configs")
