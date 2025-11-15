# Secure RLS Policies (Production)

This guide locks down your Supabase tables so only authenticated users can read/write their own data.

## 1) Enable Auth and Add `user_id`

Ensure your tables have a `user_id` column (already present in `captures`; add to `positions` too):

```sql
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS user_id uuid; -- optional but recommended
```

## 2) Enable Row Level Security

```sql
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
```

## 3) Drop “allow all” policies

```sql
DROP POLICY IF EXISTS "Enable all access for captures" ON captures;
DROP POLICY IF EXISTS "Enable all access for positions" ON positions;
```

## 4) Add per-user policies

```sql
-- Captures: users can CRUD only their own rows
CREATE POLICY "captures_select_own" ON captures
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "captures_insert_own" ON captures
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "captures_update_own" ON captures
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "captures_delete_own" ON captures
  FOR DELETE USING (auth.uid() = user_id);

-- Positions: users can CRUD only their own rows
CREATE POLICY "positions_select_own" ON positions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "positions_insert_own" ON positions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "positions_update_own" ON positions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "positions_delete_own" ON positions
  FOR DELETE USING (auth.uid() = user_id);
```

## 5) Attach `user_id` on insert (client code)

When authenticated via `supabase.auth`, include `user_id`:

```js
const {
  data: { user }
} = await supabase.auth.getUser();

await supabase.from('captures').insert([{ 
  id, url, title, timestamp, protocol, data, user_id: user?.id 
}]);

await supabase.from('positions').insert(positions.map(p => ({
  ...p,
  user_id: user?.id
})));
```

If you are not ready to implement UI login, keep the quick-start policies during development but do not ship them to production.

## Notes
- Service role keys bypass RLS; never ship service keys in the extension.
- Using anon key with Auth is recommended for MV3 extensions.
- Consider adding an auth UI (email OTP, magic link, or OAuth) as a next step.

