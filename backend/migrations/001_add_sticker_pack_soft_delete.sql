ALTER TABLE public.sticker_packs
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sticker_packs_deleted_state_check'
      AND conrelid = 'public.sticker_packs'::regclass
  ) THEN
    ALTER TABLE public.sticker_packs
      ADD CONSTRAINT sticker_packs_deleted_state_check
      CHECK (is_deleted = (deleted_at IS NOT NULL));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_sticker_packs_active_user_created_at
  ON public.sticker_packs (user_id, created_at DESC)
  WHERE is_deleted = false;
