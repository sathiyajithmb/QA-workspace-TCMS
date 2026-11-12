"""Preserve source spreadsheet fields on imported test cases."""
from alembic import op
import sqlalchemy as sa

revision = '0002_case_import_metadata'
down_revision = '0001_srs_schema'
branch_labels = None
depends_on = None


def upgrade():
    columns = {column['name'] for column in sa.inspect(op.get_bind()).get_columns('test_cases')}
    if 'import_metadata' not in columns:
        op.add_column('test_cases', sa.Column('import_metadata', sa.JSON(), nullable=False, server_default=sa.text("'{}'")))


def downgrade():
    raise RuntimeError('This application migration is intentionally forward-only.')
