import asyncio
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, unquote

import httpx

from app.config import settings
from app.database import supabase, supabase_admin


STORAGE_UPLOAD_MAX_ATTEMPTS = 3
STORAGE_UPLOAD_RETRY_BASE_SECONDS = 0.5
STORAGE_UPLOAD_TIMEOUT_SECONDS = 10.0


class SupabaseService:
  @staticmethod
  def has_storage_client() -> bool:
    """Return whether uploads can target the configured Supabase project."""
    api_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    return bool(settings.SUPABASE_URL.strip() and api_key.strip())

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
    """Upload with a fresh HTTP/1.1 connection on every retry.

    The Supabase SDK keeps one shared HTTP/2 session. A disconnected session can
    therefore poison every retry in a long-running serverless invocation. Each
    attempt here owns and closes its transport so a retry is genuinely isolated.
    """
    api_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    supabase_url = settings.SUPABASE_URL.strip().rstrip("/")
    if not supabase_url or not api_key.strip():
      print("[WARN] Supabase Storage is not configured, using fallback URL")
      return f"https://api.dicebear.com/7.x/bottts/svg?seed={file_name}"

    bucket_name = settings.SUPABASE_STORAGE_BUCKET
    safe_name = Path(file_name.replace("\\", "/")).name or "image.png"
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", safe_name)
    unique_path = f"uploads/{uuid.uuid4()}_{safe_name}"
    object_url = (
      f"{supabase_url}/storage/v1/object/"
      f"{quote(bucket_name, safe='')}/{quote(unique_path, safe='/')}"
    )
    public_url = (
      f"{supabase_url}/storage/v1/object/public/"
      f"{quote(bucket_name, safe='')}/{quote(unique_path, safe='/')}"
    )
    headers = {
      "Authorization": f"Bearer {api_key}",
      "apikey": api_key,
      "Content-Type": content_type,
      "x-upsert": "true",
      "Connection": "close",
    }

    for attempt in range(1, STORAGE_UPLOAD_MAX_ATTEMPTS + 1):
      try:
        with httpx.Client(
          timeout=STORAGE_UPLOAD_TIMEOUT_SECONDS,
          http2=False,
          follow_redirects=False,
        ) as client:
          response = client.post(object_url, headers=headers, content=file_bytes)
          response.raise_for_status()
        if attempt > 1:
          print(
            "[OK] Supabase Storage upload recovered on attempt "
            f"{attempt}/{STORAGE_UPLOAD_MAX_ATTEMPTS}"
          )
        return public_url
      except Exception as error:
        status_code = (
          error.response.status_code
          if isinstance(error, httpx.HTTPStatusError)
          else None
        )
        failure = f"HTTP {status_code}" if status_code else type(error).__name__
        print(
          "[WARN] Supabase Storage upload attempt "
          f"{attempt}/{STORAGE_UPLOAD_MAX_ATTEMPTS} failed ({failure})"
        )
        if attempt < STORAGE_UPLOAD_MAX_ATTEMPTS:
          time.sleep(STORAGE_UPLOAD_RETRY_BASE_SECONDS * (2 ** (attempt - 1)))

    return f"https://api.dicebear.com/7.x/bottts/svg?seed={file_name}"

  @staticmethod
  def delete_storage_urls(public_urls: list[str]) -> None:
    """Best-effort cleanup for files uploaded before a pack-level failure."""
    api_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    supabase_url = settings.SUPABASE_URL.strip().rstrip("/")
    bucket_name = settings.SUPABASE_STORAGE_BUCKET
    public_prefix = (
      f"{supabase_url}/storage/v1/object/public/"
      f"{quote(bucket_name, safe='')}/"
    )
    object_paths = [
      unquote(url.removeprefix(public_prefix))
      for url in public_urls
      if url.startswith(public_prefix)
    ]
    if not supabase_url or not api_key.strip() or not object_paths:
      return

    delete_url = (
      f"{supabase_url}/storage/v1/object/{quote(bucket_name, safe='')}"
    )
    try:
      with httpx.Client(
        timeout=STORAGE_UPLOAD_TIMEOUT_SECONDS,
        http2=False,
        follow_redirects=False,
      ) as client:
        response = client.delete(
          delete_url,
          headers={
            "Authorization": f"Bearer {api_key}",
            "apikey": api_key,
            "Connection": "close",
          },
          json={"prefixes": object_paths},
        )
        response.raise_for_status()
    except Exception as error:
      print(f"[WARN] Supabase partial-upload cleanup failed ({type(error).__name__})")

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
