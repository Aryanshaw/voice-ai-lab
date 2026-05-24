"""add_llm_models

Revision ID: c44df5811896
Revises: 32d27e1e42c0
Create Date: 2026-05-24 01:11:41.443766

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c44df5811896'
down_revision: Union[str, Sequence[str], None] = '32d27e1e42c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        CREATE TABLE IF NOT EXISTS llm_models (
            id VARCHAR NOT NULL PRIMARY KEY,
            provider VARCHAR(50) NOT NULL,
            model_id VARCHAR(100) NOT NULL,
            label VARCHAR(255) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
        )
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS llm_models")
