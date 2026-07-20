"""Initial base domain tables

Revision ID: 001_initial
Revises: 
Create Date: 2026-07-20

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('external_id', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_external_id'), 'users', ['external_id'], unique=True)

    # characters
    op.create_table(
        'characters',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('approved_profile_version', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_characters_status'), 'characters', ['status'], unique=False)
    op.create_index(op.f('ix_characters_user_id'), 'characters', ['user_id'], unique=False)

    # character_profiles
    op.create_table(
        'character_profiles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('character_id', sa.String(length=36), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('canonical_asset_id', sa.String(length=36), nullable=False),
        sa.Column('config_json', sa.String(), nullable=False),
        sa.Column('approved_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['character_id'], ['characters.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_character_profiles_character_id'), 'character_profiles', ['character_id'], unique=False)

    # packs
    op.create_table(
        'packs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('character_id', sa.String(length=36), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('config_version', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['character_id'], ['characters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_packs_character_id'), 'packs', ['character_id'], unique=False)
    op.create_index(op.f('ix_packs_status'), 'packs', ['status'], unique=False)
    op.create_index(op.f('ix_packs_user_id'), 'packs', ['user_id'], unique=False)

    # generation_jobs
    op.create_table(
        'generation_jobs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('character_id', sa.String(length=36), nullable=True),
        sa.Column('pack_id', sa.String(length=36), nullable=True),
        sa.Column('kind', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('current_stage', sa.String(length=50), nullable=False),
        sa.Column('progress', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('request_json', sa.Text(), nullable=False),
        sa.Column('result_json', sa.Text(), nullable=True),
        sa.Column('error_code', sa.String(length=100), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['character_id'], ['characters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['pack_id'], ['packs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_generation_jobs_character_id'), 'generation_jobs', ['character_id'], unique=False)
    op.create_index(op.f('ix_generation_jobs_pack_id'), 'generation_jobs', ['pack_id'], unique=False)
    op.create_index(op.f('ix_generation_jobs_status'), 'generation_jobs', ['status'], unique=False)
    op.create_index(op.f('ix_generation_jobs_user_id'), 'generation_jobs', ['user_id'], unique=False)

    # assets
    op.create_table(
        'assets',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('character_id', sa.String(length=36), nullable=True),
        sa.Column('job_id', sa.String(length=36), nullable=True),
        sa.Column('asset_type', sa.String(length=50), nullable=False),
        sa.Column('relative_path', sa.String(length=512), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('byte_size', sa.Integer(), nullable=False),
        sa.Column('sha256', sa.String(length=64), nullable=False),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['character_id'], ['characters.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['job_id'], ['generation_jobs.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assets_asset_type'), 'assets', ['asset_type'], unique=False)
    op.create_index(op.f('ix_assets_character_id'), 'assets', ['character_id'], unique=False)
    op.create_index(op.f('ix_assets_job_id'), 'assets', ['job_id'], unique=False)
    op.create_index(op.f('ix_assets_sha256'), 'assets', ['sha256'], unique=False)
    op.create_index(op.f('ix_assets_user_id'), 'assets', ['user_id'], unique=False)

    # job_events
    op.create_table(
        'job_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('job_id', sa.String(length=36), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('stage', sa.String(length=50), nullable=False),
        sa.Column('progress', sa.Integer(), nullable=False),
        sa.Column('payload_json', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['job_id'], ['generation_jobs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_job_events_job_id'), 'job_events', ['job_id'], unique=False)

    # cost_ledgers
    op.create_table(
        'cost_ledgers',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('job_id', sa.String(length=36), nullable=True),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('workflow_version', sa.String(length=50), nullable=False),
        sa.Column('gpu_seconds', sa.Float(), nullable=False),
        sa.Column('retry_count', sa.Integer(), nullable=False),
        sa.Column('estimated_cost_usd', sa.Float(), nullable=False),
        sa.Column('metadata_json', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['job_id'], ['generation_jobs.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cost_ledgers_job_id'), 'cost_ledgers', ['job_id'], unique=False)
    op.create_index(op.f('ix_cost_ledgers_user_id'), 'cost_ledgers', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_table('cost_ledgers')
    op.drop_table('job_events')
    op.drop_table('assets')
    op.drop_table('generation_jobs')
    op.drop_table('packs')
    op.drop_table('character_profiles')
    op.drop_table('characters')
    op.drop_table('users')
