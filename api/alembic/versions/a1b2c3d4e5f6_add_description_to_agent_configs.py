"""add description to agent_configs

Revision ID: a1b2c3d4e5f6
Revises: c44df5811896
Create Date: 2026-05-24
"""

from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'c44df5811896'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'agent_configs',
        sa.Column('description', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('agent_configs', 'description')
