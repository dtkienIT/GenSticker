import asyncio
import re
import uuid
from datetime import datetime, timezone

from app.config import settings
from app.database import supabase, supabase_admin


class SupabaseService:
  @staticmethod
  def has_storage_client() -> bool:
    """Return whether uploads can target a configured Supabase client."""
    return bool(supabase_admin or supabase)

  @staticmethod
  def get_user_from_access_token(access_token: str):
    """Validate a Supabase access token and return its authenticated user."""
    client = supabase or supabase_admin
    if not client or not access_token:
      return None

    try:
      response = client.auth.get_user(access_token)
      return response.user if response and hasattr(response, "user") else None
    except Exception as error:
      print(f"Invalid Supabase access token: {error}")
      return None

  @staticmethod
  async def verify_access_token(access_token: str) -> str | None:
    """Validate a Supabase access token without blocking the API event loop."""
    user = await asyncio.to_thread(
      SupabaseService.get_user_from_access_token,
      access_token,
    )
    user_id = getattr(user, "id", None)
    return str(user_id) if user_id else None

  @staticmethod
  def upload_image_to_storage(
    file_bytes: bytes,
    file_name: str,
    content_type: str = "image/png",
  ) -> str:
    """Upload a file to the configured Supabase Storage bucket."""
    client = supabase_admin or supabase
    if not client:
      print("[WARN] Supabase client not available, fallback to mock URL")
      return f"https://api.dicebear.com/7.x/bottts/svg?seed={file_name}"

    bucket_name = settings.SUPABASE_STORAGE_BUCKET
    unique_path = f"uploads/{uuid.uuid4()}_{file_name}"

    try:
      client.storage.from_(bucket_name).upload(
        path=unique_path,
        file=file_bytes,
        file_options={"content-type": content_type, "x-upsert": "true"}
      )
      return client.storage.from_(bucket_name).get_public_url(unique_path)
    except Exception as error:
      print(f"[WARN] Error uploading to Supabase Storage: {error}")
      return f"https://api.dicebear.com/7.x/bottts/svg?seed={file_name}"

  @staticmethod
  async def authenticate_user(email: str, pass_word: str):
    """Authenticate a user with Supabase Auth."""
    if not supabase:
      return None
    try:
      return await asyncio.to_thread(
        supabase.auth.sign_in_with_password,
        {"email": email, "password": pass_word},
      )
    except Exception as error:
      print(f"Error Supabase login: {error}")
      return None

  @staticmethod
  async def register_user(email: str, pass_word: str, full_name: str):
    """Register, duplicate-check, and auto-confirm a user via Supabase Auth."""
    if not supabase:
      return None

    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
      raise ValueError("Email không đúng định dạng.")

    # Keep kien_v4's duplicate check and admin-assisted auto-confirm flow.
    if supabase_admin:
      try:
        existing = await asyncio.to_thread(supabase_admin.auth.admin.list_users)
        if existing and hasattr(existing, "__iter__"):
          for user in existing:
            existing_email = getattr(user, "email", None)
            if existing_email and existing_email.lower() == email.lower():
              raise ValueError(
                "Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập."
              )
      except ValueError:
        raise
      except Exception as list_error:
        print(f"[WARN] Could not check existing users: {list_error}")

    if supabase_admin:
      try:
        response = await asyncio.to_thread(
          supabase_admin.auth.admin.create_user,
          {
            "email": email,
            "password": pass_word,
            "email_confirm": True,
            "user_metadata": {"full_name": full_name},
          },
        )
        if response and (hasattr(response, "id") or hasattr(response, "user")):
          return response
      except Exception as admin_error:
        error_message = str(admin_error).lower()
        if any(word in error_message for word in ("already", "duplicate", "exists")):
          raise ValueError(
            "Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập."
          ) from admin_error
        print(f"[WARN] Admin create user note: {admin_error}")

    try:
      response = await asyncio.to_thread(
        supabase.auth.sign_up,
        {
          "email": email,
          "password": pass_word,
          "options": {"data": {"full_name": full_name}},
        },
      )
      if response and getattr(response, "user", None):
        identities = getattr(response.user, "identities", None)
        if identities is not None and len(identities) == 0:
          raise ValueError(
            "Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập."
          )

      if supabase_admin and response and getattr(response, "user", None):
        try:
          await asyncio.to_thread(
            supabase_admin.auth.admin.update_user_by_id,
            response.user.id,
            {"email_confirm": True},
          )
        except Exception as admin_error:
          print(f"[WARN] Auto confirm email note: {admin_error}")

      return response
    except ValueError:
      raise
    except Exception as error:
      print(f"Error Supabase register: {error}")
      return None

  @staticmethod
  def save_sticker_pack(
    user_id: str | None,
    title: str,
    prompt: str | None,
    style_id: str,
    style_name: str,
    stickers: list[dict],
  ) -> dict | None:
    """Save a completed sticker pack and its stickers to Supabase."""
    client = supabase_admin or supabase
    if not client:
      print("[WARN] Supabase client not available for saving pack")
      return None

    try:
      pack_data = {
        "title": title or "Bộ Sticker Chibi",
        "style_name": style_name or "3D Chibi Cutie",
        "total_stickers": len(stickers) if stickers else 20,
      }
      if user_id and re.match(
        r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
        user_id,
      ):
        pack_data["user_id"] = user_id

      pack_response = client.table("sticker_packs").insert(pack_data).execute()
      if not pack_response or not pack_response.data:
        print("[WARN] Could not insert sticker pack")
        return None

      pack_record = pack_response.data[0]
      pack_id = pack_record["id"]
      sticker_records = [
        {
          "pack_id": pack_id,
          "title": sticker.get("title", "Sticker"),
          "emotion": sticker.get("emotion", "happy"),
          "tags": sticker.get("tags", []),
          "image_url": sticker.get("image_url", ""),
        }
        for sticker in stickers
      ]
      if sticker_records:
        client.table("stickers").insert(sticker_records).execute()

      print(f"[OK] Saved sticker pack '{title}' with ID: {pack_id}")
      return pack_record
    except Exception as error:
      print(f"[WARN] Error saving sticker pack to DB: {error}")
      return None

  @staticmethod
  def get_user_sticker_packs(user_id: str) -> list[dict]:
    """Fetch non-deleted sticker packs owned by a user."""
    client = supabase_admin or supabase
    if not client or not user_id:
      return []

    try:
      response = (
        client.table("sticker_packs")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_deleted", False)
        .order("created_at", desc=True)
        .execute()
      )
      packs = response.data or []
      for pack in packs:
        sticker_response = (
          client.table("stickers")
          .select("*")
          .eq("pack_id", pack["id"])
          .execute()
        )
        pack["stickers"] = sticker_response.data or []
      return packs
    except Exception as error:
      print(f"[WARN] Error fetching user sticker packs: {error}")
      return []

  @staticmethod
  def soft_delete_user_sticker_pack(user_id: str, pack_id: str) -> bool:
    """Hide one owned sticker pack without deleting its rows."""
    client = supabase_admin or supabase
    if not client or not user_id or not pack_id:
      return False

    try:
      deleted_at = datetime.now(timezone.utc).isoformat()
      response = (
        client.table("sticker_packs")
        .update({"is_deleted": True, "deleted_at": deleted_at})
        .eq("id", pack_id)
        .eq("user_id", user_id)
        .eq("is_deleted", False)
        .execute()
      )
      return bool(response.data)
    except Exception as error:
      print(f"[WARN] Error soft-deleting sticker pack: {error}")
      return False
