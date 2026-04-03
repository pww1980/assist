"""Initial schema – all tables

Revision ID: 001
Revises:
Create Date: 2026-04-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # users
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("username", sa.String(100), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    # todos
    op.create_table(
        "todos",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("due_date", sa.DateTime, nullable=True),
        sa.Column("priority", sa.SmallInteger, nullable=False, server_default="2"),
        sa.Column("completed", sa.Boolean, nullable=False, server_default="0"),
        sa.Column("external_provider", sa.String(50), nullable=True),
        sa.Column("external_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.Column(
            "updated_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.text("NOW()"),
            server_onupdate=sa.text("NOW()"),
        ),
    )
    op.create_index("ix_todos_id", "todos", ["id"])

    # events
    op.create_table(
        "events",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("start_time", sa.DateTime, nullable=False),
        sa.Column("end_time", sa.DateTime, nullable=True),
        sa.Column("location", sa.Text, nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("reminder_offset", sa.Integer, nullable=True),
        sa.Column("external_provider", sa.String(50), nullable=True),
        sa.Column("external_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.Column(
            "updated_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.text("NOW()"),
            server_onupdate=sa.text("NOW()"),
        ),
    )
    op.create_index("ix_events_id", "events", ["id"])

    # ideas
    op.create_table(
        "ideas",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("content", sa.Text, nullable=True),
        sa.Column("tags", sa.Text, nullable=True),
        sa.Column("source", sa.String(20), nullable=False, server_default="telegram"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.Column(
            "updated_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.text("NOW()"),
            server_onupdate=sa.text("NOW()"),
        ),
    )
    op.create_index("ix_ideas_id", "ideas", ["id"])

    # shopping_items
    op.create_table(
        "shopping_items",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=True),
        sa.Column("unit", sa.String(30), nullable=True),
        sa.Column("checked", sa.Boolean, nullable=False, server_default="0"),
        sa.Column("store_name", sa.Text, nullable=True),
        sa.Column("price", sa.Numeric(10, 2), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.Column(
            "updated_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.text("NOW()"),
            server_onupdate=sa.text("NOW()"),
        ),
    )
    op.create_index("ix_shopping_items_id", "shopping_items", ["id"])

    # reminders
    op.create_table(
        "reminders",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("target_ref", sa.String(36), nullable=True),
        sa.Column("remind_at", sa.DateTime, nullable=False),
        sa.Column("channel", sa.String(30), nullable=False, server_default="telegram"),
        sa.Column("sent", sa.Boolean, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_reminders_id", "reminders", ["id"])

    # integrations
    op.create_table(
        "integrations",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("provider_name", sa.String(50), nullable=False, unique=True),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default="0"),
        sa.Column("config_json", sa.Text, nullable=True),
        sa.Column("last_sync_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_integrations_id", "integrations", ["id"])
    op.create_index("ix_integrations_provider_name", "integrations", ["provider_name"], unique=True)

    # sync_jobs
    op.create_table(
        "sync_jobs",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("provider_name", sa.String(50), nullable=False),
        sa.Column("object_type", sa.String(50), nullable=False),
        sa.Column("object_id", sa.String(36), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.Column(
            "updated_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.text("NOW()"),
            server_onupdate=sa.text("NOW()"),
        ),
    )
    op.create_index("ix_sync_jobs_id", "sync_jobs", ["id"])

    # audit_log
    op.create_table(
        "audit_log",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("actor", sa.String(100), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", sa.String(36), nullable=True),
        sa.Column("payload_json", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_audit_log_id", "audit_log", ["id"])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("sync_jobs")
    op.drop_table("integrations")
    op.drop_table("reminders")
    op.drop_table("shopping_items")
    op.drop_table("ideas")
    op.drop_table("events")
    op.drop_table("todos")
    op.drop_table("users")
