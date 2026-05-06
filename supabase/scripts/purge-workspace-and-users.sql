-- =============================================================================
-- Purge one workspace and associated DB rows, then remove Auth users.
-- =============================================================================
--
-- Edit WORKSPACE_UUID_HERE (single place), then run in Supabase SQL Editor
-- (or psql as a superuser / role allowed to delete auth.users).
--
-- What happens:
--   1. Snapshot distinct member user_ids for this workspace.
--   2. DROP TRIGGER prevent_last_admin_delete on workspace_member (see 0001_foundation).
--      Otherwise CASCADE delete hits prevent_last_admin_removal() (last admin).
--   3. DELETE the workspace row → ON DELETE CASCADE removes tenant data and this
--      workspace's workspace_member / workspace_invite rows (see migrations).
--   4. CREATE TRIGGER ... EXECUTE FUNCTION prevent_last_admin_removal() again.
--   5. DELETE from auth.users only for ids in the snapshot that have **no**
--      workspace_member rows left (Mode A — safe if users might belong to other
--      workspaces).
--
-- Does not: cancel Stripe, remove Storage files, or delete operator_user rows.
--
-- Mode B (optional): delete every snapshot member from auth regardless of other
-- workspaces — uncomment the alternate DELETE block inside the DO body only if
-- you intend to wipe those accounts completely.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  ws uuid := 'WORKSPACE_UUID_HERE'::uuid;
  deleted_ws int;
  deleted_users int;
BEGIN
  CREATE TEMP TABLE _purge_ws_members ON COMMIT DROP AS
  SELECT DISTINCT user_id
  FROM public.workspace_member
  WHERE workspace_id = ws;

  DROP TRIGGER IF EXISTS prevent_last_admin_delete ON public.workspace_member;

  BEGIN
    DELETE FROM public.workspace WHERE id = ws;
    GET DIAGNOSTICS deleted_ws = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      CREATE TRIGGER prevent_last_admin_delete
      BEFORE DELETE ON public.workspace_member
      FOR EACH ROW
      EXECUTE FUNCTION public.prevent_last_admin_removal();
      RAISE;
  END;

  CREATE TRIGGER prevent_last_admin_delete
  BEFORE DELETE ON public.workspace_member
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_admin_removal();

  -- Mode A: orphan auth accounts only (recommended).
  DELETE FROM auth.users u
  WHERE u.id IN (SELECT user_id FROM _purge_ws_members)
    AND NOT EXISTS (
      SELECT 1 FROM public.workspace_member wm WHERE wm.user_id = u.id
    );
  GET DIAGNOSTICS deleted_users = ROW_COUNT;

  -- Mode B (optional): delete auth for every member of this workspace, even if
  -- they still belong to another workspace. Uncomment ONLY if intended.
  -- DELETE FROM auth.users u
  -- WHERE u.id IN (SELECT user_id FROM _purge_ws_members);
  -- GET DIAGNOSTICS deleted_users = ROW_COUNT;

  RAISE NOTICE 'Purged workspace % — workspaces_deleted: %, auth_users_deleted: %',
    ws, deleted_ws, deleted_users;
END $$;

COMMIT;
