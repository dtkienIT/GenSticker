"""Add product consent, pack slots, and export manifests.

Revision ID: 002_product_persistence
Revises: 001_initial
Create Date: 2026-07-21
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_product_persistence"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "display_name", sa.String(length=255), server_default="Local User", nullable=False
        ),
    )
    op.add_column(
        "users", sa.Column("locale", sa.String(length=16), server_default="vi", nullable=False)
    )
    op.add_column(
        "users",
        sa.Column("consent_version", sa.String(length=32), server_default="1.0", nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("consent_accepted", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("consent_reuse_opt_in", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.add_column("users", sa.Column("consent_accepted_at", sa.DateTime(), nullable=True))

    op.add_column(
        "packs",
        sa.Column(
            "template_id", sa.String(length=100), server_default="core-eight-v1", nullable=False
        ),
    )
    op.add_column("packs", sa.Column("slots_json", sa.Text(), server_default="[]", nullable=False))

    op.create_table(
        "export_manifests",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("pack_id", sa.String(length=36), nullable=False),
        sa.Column("formats_json", sa.Text(), nullable=False),
        sa.Column("assets_json", sa.Text(), nullable=False),
        sa.Column("checksums_json", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("native_share_available", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["pack_id"], ["packs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_export_manifests_pack_id"), "export_manifests", ["pack_id"], unique=False
    )
    op.create_index(
        op.f("ix_export_manifests_user_id"), "export_manifests", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_export_manifests_user_id"), table_name="export_manifests")
    op.drop_index(op.f("ix_export_manifests_pack_id"), table_name="export_manifests")
    op.drop_table("export_manifests")

    op.drop_column("packs", "slots_json")
    op.drop_column("packs", "template_id")

    op.drop_column("users", "consent_accepted_at")
    op.drop_column("users", "consent_reuse_opt_in")
    op.drop_column("users", "consent_accepted")
    op.drop_column("users", "consent_version")
    op.drop_column("users", "locale")
    op.drop_column("users", "display_name")
