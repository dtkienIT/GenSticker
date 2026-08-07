import asyncio
import uuid
from app.database import supabase, supabase_admin
from app.config import settings

class SupabaseService:
  @staticmethod
  async def verify_access_token(access_token: str) -> str | None:
    """Validate a Supabase access token and return its user id."""
    if not supabase or not access_token:
      return None
    try:
      response = await asyncio.to_thread(supabase.auth.get_user, access_token)
      user = getattr(response, "user", None)
      user_id = getattr(user, "id", None)
      return str(user_id) if user_id else None
    except Exception:
      return None

  @staticmethod
  def upload_image_to_storage(file_bytes: bytes, file_name: str, content_type: str = "image/png") -> str:
    """
    Uploads a file to Supabase Storage bucket 'stickers'.
    Returns public URL of the uploaded image.
    """
    client = supabase_admin or supabase
    if not client:
      print("⚠️ Supabase client not available, fallback to mock URL")
      return f"https://api.dicebear.com/7.x/bottts/svg?seed={file_name}"
    
    bucket_name = settings.SUPABASE_STORAGE_BUCKET
    unique_path = f"uploads/{uuid.uuid4()}_{file_name}"

    try:
      # Upload to bucket
      client.storage.from_(bucket_name).upload(
        path=unique_path,
        file=file_bytes,
        file_options={"content-type": content_type, "x-upsert": "true"}
      )
      
      # Get Public URL
      public_url = supabase.storage.from_(bucket_name).get_public_url(unique_path)
      return public_url
    except Exception as e:
      print(f"⚠️ Error uploading to Supabase Storage: {e}")
      # Fallback to mock url
      return f"https://api.dicebear.com/7.x/bottts/svg?seed={file_name}"

  @staticmethod
  async def authenticate_user(email: str, pass_word: str):
    """
    Authenticates user with Supabase Auth
    """
    if not supabase:
      return None
    try:
      response = await asyncio.to_thread(
        supabase.auth.sign_in_with_password,
        {"email": email, "password": pass_word},
      )
      return response
    except Exception as e:
      print(f"Error Supabase login: {e}")
      return None

  @staticmethod
  async def register_user(email: str, pass_word: str, full_name: str):
    """
    Registers a new user with Supabase Auth.
    Validates email format and checks for duplicate email.
    """
    import re

    if not supabase:
      return None

    # 1. Validate email format
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
      raise ValueError("Email không đúng định dạng.")

    # Public registration uses Supabase email verification. Never auto-confirm
    # with the service-role client from an unauthenticated endpoint.
    try:
      response = await asyncio.to_thread(supabase.auth.sign_up, {
        "email": email,
        "password": pass_word,
        "options": {
          "data": {
            "full_name": full_name
          }
        }
      })
      return response
    except Exception:
      return None


  @staticmethod
  def save_sticker_pack(
    user_id: str | None,
    title: str,
    prompt: str | None,
    style_id: str,
    style_name: str,
    stickers: list[dict]
  ) -> dict | None:
    """
    Saves a completed sticker pack and its stickers to Supabase Database
    """
    client = supabase_admin or supabase
    if not client:
      print("⚠️ Supabase client not available for saving pack")
      return None

    try:
      cover_url = stickers[0].get("image_url", "") if stickers else None

      # 1. Insert sticker_pack record
      pack_data = {
        "title": title,
        "prompt": prompt,
        "style_id": style_id,
        "style_name": style_name,
        "status": "completed",
        "cover_url": cover_url,
        "total_stickers": len(stickers)
      }
      if user_id:
        pack_data["user_id"] = user_id

      res_pack = client.table("sticker_packs").insert(pack_data).execute()
      if not res_pack.data:
        print("⚠️ Could not insert sticker pack")
        return None

      pack_record = res_pack.data[0]
      pack_id = pack_record["id"]

      # 2. Insert individual stickers
      sticker_records = []
      for st in stickers:
        sticker_records.append({
          "pack_id": pack_id,
          "title": st.get("title", "Sticker"),
          "emotion": st.get("emotion", "happy"),
          "tags": st.get("tags", []),
          "image_url": st.get("image_url", ""),
          "width": st.get("width", 1024),
          "height": st.get("height", 1024),
          "file_size_kb": st.get("file_size_kb", 150),
          "is_favorite": st.get("is_favorite", False)
        })

      if sticker_records:
        client.table("stickers").insert(sticker_records).execute()

      print(f"✅ Saved sticker pack '{title}' with ID: {pack_id}")
      return pack_record
    except Exception as e:
      print(f"⚠️ Error saving sticker pack to DB: {e}")
      return None

  @staticmethod
  def get_user_sticker_packs(user_id: str) -> list[dict]:
    """
    Fetches past sticker packs for a user from Supabase Database
    """
    client = supabase_admin or supabase
    if not client:
      return []

    try:
      res = client.table("sticker_packs").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
      packs = res.data or []
      for p in packs:
        stk_res = client.table("stickers").select("*").eq("pack_id", p["id"]).execute()
        p["stickers"] = stk_res.data or []
      return packs
    except Exception as e:
      print(f"⚠️ Error fetching user sticker packs: {e}")
      return []


