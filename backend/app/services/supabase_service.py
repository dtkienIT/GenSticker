import uuid
from app.database import supabase
from app.config import settings

class SupabaseService:
  @staticmethod
  def upload_image_to_storage(file_bytes: bytes, file_name: str, content_type: str = "image/png") -> str:
    """
    Uploads a file to Supabase Storage bucket 'stickers'.
    Returns public URL of the uploaded image.
    """
    if not supabase:
      print("⚠️ Supabase client not available, fallback to mock URL")
      return f"https://api.dicebear.com/7.x/bottts/svg?seed={file_name}"
    
    bucket_name = settings.SUPABASE_STORAGE_BUCKET
    unique_path = f"uploads/{uuid.uuid4()}_{file_name}"

    try:
      # Upload to bucket
      response = supabase.storage.from_(bucket_name).upload(
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
      response = supabase.auth.sign_in_with_password({"email": email, "password": pass_word})
      return response
    except Exception as e:
      print(f"Error Supabase login: {e}")
      return None

  @staticmethod
  async def register_user(email: str, pass_word: str, full_name: str):
    """
    Registers a new user with Supabase Auth
    """
    if not supabase:
      return None
    try:
      response = supabase.auth.sign_up({
        "email": email,
        "password": pass_word,
        "options": {
          "data": {
            "full_name": full_name
          }
        }
      })
      return response
    except Exception as e:
      print(f"Error Supabase register: {e}")
      return None
