-- =============================================
-- AIエコ献立 - Supabase Database Schema
-- =============================================

-- Enable UUID extension (Supabase default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. profiles: ユーザー情報
-- Supabase Authと連携するプロフィールテーブル
-- =============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- プロフィール用のRLS（Row Level Security）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のプロフィールのみ参照・更新可能
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 新規ユーザー登録時にプロフィールを自動作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 2. ingredients: ユーザーごとの在庫食材
-- =============================================
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity TEXT,  -- 例: "3個", "500g", "1パック"
    category TEXT,  -- 例: "野菜", "肉類", "調味料"
    expiry_date DATE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_ingredients_user_id ON ingredients(user_id);
CREATE INDEX idx_ingredients_expiry_date ON ingredients(expiry_date);

-- RLS設定
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ingredients"
    ON ingredients FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ingredients"
    ON ingredients FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ingredients"
    ON ingredients FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ingredients"
    ON ingredients FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- 3. meal_history: 過去の献立履歴
-- =============================================
CREATE TABLE meal_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,  -- 献立の対象日
    menu_json JSONB NOT NULL,  -- 献立データ（朝・昼・夕など）
    used_ingredients TEXT[],  -- 使用した食材リスト
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_meal_history_user_id ON meal_history(user_id);
CREATE INDEX idx_meal_history_date ON meal_history(date);
CREATE INDEX idx_meal_history_user_date ON meal_history(user_id, date);

-- RLS設定
ALTER TABLE meal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal history"
    ON meal_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal history"
    ON meal_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal history"
    ON meal_history FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal history"
    ON meal_history FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- updated_at 自動更新トリガー
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at
    BEFORE UPDATE ON ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
