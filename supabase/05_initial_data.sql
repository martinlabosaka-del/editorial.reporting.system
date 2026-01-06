-- ========================================
-- 初期データ投入
-- ========================================

-- このSQLは、Supabaseプロジェクトに初期マスタデータを投入するためのものです。
-- Supabase Studio > SQL Editor で実行してください。

-- ========================================
-- 1. ジャンルマスタ
-- ========================================

INSERT INTO genres (genre_id, genre_name, display_order, is_active) VALUES
('GNR-001', '企業紹介', 1, true),
('GNR-002', 'プロモーション', 2, true),
('GNR-003', 'イベント', 3, true),
('GNR-004', '教育・研修', 4, true),
('GNR-005', 'セミナー', 5, true),
('GNR-006', 'ウェビナー', 6, true),
('GNR-007', 'CM', 7, true),
('GNR-008', 'ドキュメンタリー', 8, true),
('GNR-009', 'インタビュー', 9, true),
('GNR-010', 'その他', 10, true);

-- ========================================
-- 2. 使用技術マスタ
-- ========================================

INSERT INTO technologies (tech_id, tech_name, display_order, is_active) VALUES
('TECH-001', 'Premiere Pro', 1, true),
('TECH-002', 'After Effects', 2, true),
('TECH-003', 'DaVinci Resolve', 3, true),
('TECH-004', 'Final Cut Pro', 4, true),
('TECH-005', 'Photoshop', 5, true),
('TECH-006', 'Illustrator', 6, true),
('TECH-007', 'Audition', 7, true),
('TECH-008', 'Cinema 4D', 8, true),
('TECH-009', 'Blender', 9, true),
('TECH-010', 'その他', 10, true);

-- ========================================
-- 3. 見積項目マスタ
-- ========================================

INSERT INTO estimate_items (estimate_item_id, estimate_item_name, hourly_rate, display_order, is_active) VALUES
('EST-001', '編集作業', 3000.00, 1, true),
('EST-002', 'モーショングラフィックス', 4000.00, 2, true),
('EST-003', 'カラーグレーディング', 3500.00, 3, true),
('EST-004', '音声編集', 2800.00, 4, true),
('EST-005', 'テロップ作成', 2500.00, 5, true),
('EST-006', '素材作成', 3500.00, 6, true),
('EST-007', '3DCG制作', 5000.00, 7, true),
('EST-008', 'その他', 3000.00, 8, true);

-- ========================================
-- 4. 編集作業項目マスタ
-- ========================================

INSERT INTO edit_items (edit_item_id, edit_item_name, hourly_rate, display_order, is_active) VALUES
('EDIT-001', '粗編集', 2500.00, 1, true),
('EDIT-002', '本編集', 3000.00, 2, true),
('EDIT-003', 'エフェクト作業', 4000.00, 3, true),
('EDIT-004', '音声編集', 2800.00, 4, true),
('EDIT-005', 'カラーコレクション', 3500.00, 5, true),
('EDIT-006', 'テロップ入れ', 2500.00, 6, true),
('EDIT-007', '修正対応', 2800.00, 7, true),
('EDIT-008', 'その他', 2500.00, 8, true);

-- ========================================
-- 5. サンプルクライアント（テスト用）
-- ========================================

INSERT INTO clients (client_id, client_name, agency_name, is_active) VALUES
('CLI-0001', 'サンプル株式会社', '広告代理店A', true),
('CLI-0002', 'テスト企業', NULL, true),
('CLI-0003', 'デモカンパニー', '広告代理店B', true);

-- ========================================
-- 確認クエリ
-- ========================================

-- 投入されたデータを確認
SELECT 'genres' as table_name, COUNT(*) as count FROM genres
UNION ALL
SELECT 'technologies', COUNT(*) FROM technologies
UNION ALL
SELECT 'estimate_items', COUNT(*) FROM estimate_items
UNION ALL
SELECT 'edit_items', COUNT(*) FROM edit_items
UNION ALL
SELECT 'clients', COUNT(*) FROM clients;

-- ========================================
-- 注意事項
-- ========================================

-- ユーザーデータは、Supabase Authと連携して作成する必要があります。
-- 以下の手順でテストユーザーを作成してください:
--
-- 1. Supabase Studio > Authentication > Users > Add User
--    Email: test.user@example.com
--    Password: testpass123
--    Auto Confirm User: チェック
--
-- 2. 作成されたUser IDをコピー
--
-- 3. 以下のSQLを実行（User IDを置き換えてください）:
--
-- INSERT INTO users (user_id, name, role, is_active, auth_user_id)
-- VALUES (
--   'test.user',
--   'テストユーザー',
--   'staff',
--   true,
--   'ここにSupabase AuthのUser IDを貼り付け'
-- );
