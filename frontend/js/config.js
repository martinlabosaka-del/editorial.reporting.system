// ========================================
// 設定ファイル
// ========================================

const CONFIG = {
  // === Supabase設定 ===
  SUPABASE: {
    URL: 'https://hrywcftzbturamsuoizb.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyeXdjZnR6YnR1cmFtc3VvaXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczODg1MTMsImV4cCI6MjA4Mjk2NDUxM30.c5gN0j0pLXixll4gXEtuyQqhf17FNdoes379LFx-AT8'
  },

  // === 旧GAS API設定（移行期間中のみ使用） ===
  // Supabase移行後は削除予定
  API_URL: 'https://hennsyu-houkoku-proxy.martinlab-osaka.workers.dev',

  // アプリケーション設定
  APP_NAME: '編集報告WEBアプリ',
  VERSION: '3.0.0',  // Supabase版

  // ローカルストレージキー
  STORAGE_KEYS: {
    TOKEN: 'auth_token',
    USER: 'current_user',
    SESSION: 'supabase_session'
  },

  // 使用モード
  // 'SUPABASE' - Supabaseを使用（本番環境）
  // 'GAS' - Google Apps Scriptを使用（旧環境、移行期間のみ）
  MODE: 'SUPABASE'
};

// グローバル変数としてエクスポート
const API_BASE_URL = CONFIG.API_URL;
const STORAGE_KEYS = CONFIG.STORAGE_KEYS;
const SUPABASE_URL = CONFIG.SUPABASE.URL;
const SUPABASE_ANON_KEY = CONFIG.SUPABASE.ANON_KEY;
