-- ============================================================
-- One Step 体重管理アプリ ─ Supabase テーブル設計
-- Supabase ダッシュボード → SQL Editor に貼り付けて「Run」
-- ============================================================

-- 1) アプリ設定テーブル（管理者パスコード等）
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 2) 会員テーブル
CREATE TABLE IF NOT EXISTS members (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  passcode      TEXT NOT NULL,
  target_weight TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 3) 体重記録テーブル
CREATE TABLE IF NOT EXISTS records (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_name    TEXT NOT NULL,
  date           DATE NOT NULL,
  morning_weight TEXT DEFAULT '',
  night_weight   TEXT DEFAULT '',
  breakfast      TEXT DEFAULT '○',
  lunch          TEXT DEFAULT '○',
  dinner         TEXT DEFAULT '○',
  reflection     TEXT DEFAULT '',
  admin_reply    TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- 日付順の検索を高速化するインデックス
CREATE INDEX IF NOT EXISTS idx_records_member_date
  ON records (member_name, date);

-- ============================================================
-- Row Level Security（RLS）設定
-- このアプリはパスコード認証をアプリ側で行うため、
-- anon キーでの全操作を許可するポリシーを設定します。
-- ============================================================

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE records        ENABLE ROW LEVEL SECURITY;

-- app_settings
CREATE POLICY "allow_all_app_settings" ON app_settings
  FOR ALL USING (true) WITH CHECK (true);

-- members
CREATE POLICY "allow_all_members" ON members
  FOR ALL USING (true) WITH CHECK (true);

-- records
CREATE POLICY "allow_all_records" ON records
  FOR ALL USING (true) WITH CHECK (true);
