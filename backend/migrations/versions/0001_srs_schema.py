"""Create and extend the QA Manager schema.

Revision ID: 0001_srs_schema
Revises:
"""
from alembic import op

revision = "0001_srs_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    from app.main import ensure_database_schema

    ensure_database_schema(op.get_bind())


def downgrade():
    raise RuntimeError("This application migration is intentionally forward-only.")
