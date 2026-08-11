// ========================================
// API通信モジュール (Supabase版)
// ========================================

// ========================================
// ヘルパー関数
// ========================================

/**
 * エラーハンドリング
 */
function handleSupabaseError(error, context = '') {
  console.error(`Supabase error [${context}]:`, error);

  let message = 'エラーが発生しました';

  if (error.code === 'PGRST116') {
    message = 'データが見つかりませんでした';
  } else if (error.code === '23505') {
    message = '既に登録されているデータです';
  } else if (error.code === '23503') {
    message = '関連するデータが存在しません';
  } else if (error.message) {
    message = error.message;
  }

  return {
    success: false,
    message: message,
    error: error
  };
}

/**
 * 成功レスポンスを作成
 */
function createSuccessResponse(data, message = '処理が完了しました') {
  return {
    success: true,
    message: message,
    data: data
  };
}

// ========================================
// 認証API
// ========================================

/**
 * ログイン（Supabase Auth）
 */
async function login(email, password, rememberMe = false) {
  try {
    // メールアドレスを直接使用
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'ログインに失敗しました: ' + error.message
      };
    }

    // ユーザー情報を取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .single();

    if (userError) {
      console.error('Get user data error:', userError);
      return {
        success: false,
        message: 'ユーザー情報の取得に失敗しました'
      };
    }

    // ユーザー情報を保存
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));

    return {
      success: true,
      message: 'ログインしました',
      user: userData
    };

  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'ログインエラー: ' + error.message
    };
  }
}

/**
 * ログアウト
 */
async function logout() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
    }

    // ローカルストレージをクリア
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false };
  }
}

/**
 * セッション確認
 */
async function checkSession() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return { success: false };
  }

  // ユーザー情報を取得
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .single();

  if (userError) {
    return { success: false };
  }

  // ユーザー情報を保存
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));

  return {
    success: true,
    user: userData
  };
}

/**
 * 現在のユーザー情報を取得
 */
function getCurrentUser() {
  const userJson = localStorage.getItem(STORAGE_KEYS.USER);
  return userJson ? JSON.parse(userJson) : null;
}

// ========================================
// マスタデータAPI
// ========================================

/**
 * ユーザー一覧取得
 */
async function getUsers(roleFilter = null) {
  try {
    let query = supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (roleFilter) {
      query = query.eq('role', roleFilter);
    }

    const { data, error } = await query;

    if (error) {
      return handleSupabaseError(error, 'getUsers');
    }

    return createSuccessResponse(data);
  } catch (error) {
    return handleSupabaseError(error, 'getUsers');
  }
}

/**
 * クライアント一覧取得
 */
async function getClients() {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('is_active', true)
      .order('client_name');

    if (error) {
      return handleSupabaseError(error, 'getClients');
    }

    return createSuccessResponse(data);
  } catch (error) {
    return handleSupabaseError(error, 'getClients');
  }
}

/**
 * ジャンル一覧取得
 */
async function getGenres() {
  try {
    const { data, error } = await supabase
      .from('genres')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      return handleSupabaseError(error, 'getGenres');
    }

    return createSuccessResponse(data);
  } catch (error) {
    return handleSupabaseError(error, 'getGenres');
  }
}

/**
 * 技術一覧取得
 */
async function getTechnologies() {
  try {
    const { data, error } = await supabase
      .from('technologies')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      return handleSupabaseError(error, 'getTechnologies');
    }

    return createSuccessResponse(data);
  } catch (error) {
    return handleSupabaseError(error, 'getTechnologies');
  }
}

/**
 * 見積項目一覧取得
 */
async function getEstimateItems() {
  try {
    const { data, error } = await supabase
      .from('estimate_items')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      return handleSupabaseError(error, 'getEstimateItems');
    }

    return createSuccessResponse(data);
  } catch (error) {
    return handleSupabaseError(error, 'getEstimateItems');
  }
}

/**
 * 編集項目一覧取得
 */
async function getEditItems() {
  try {
    const { data, error } = await supabase
      .from('edit_items')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      return handleSupabaseError(error, 'getEditItems');
    }

    return createSuccessResponse(data);
  } catch (error) {
    return handleSupabaseError(error, 'getEditItems');
  }
}

/**
 * 所属一覧取得
 */
async function getAffiliations() {
  try {
    const { data, error } = await supabase
      .from('affiliations')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      // テーブルが存在しない場合は空配列を返す
      console.warn('getAffiliations error:', error);
      return createSuccessResponse([]);
    }

    return createSuccessResponse(data);
  } catch (error) {
    return createSuccessResponse([]);
  }
}

/**
 * チーム一覧取得
 */
async function getTeams() {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.warn('getTeams error:', error);
      return createSuccessResponse([]);
    }

    return createSuccessResponse(data);
  } catch (error) {
    return createSuccessResponse([]);
  }
}

/**
 * 所属追加
 */
async function addAffiliation(affiliationName) {
  try {
    // affiliation_id生成
    const { data: existing } = await supabase
      .from('affiliations')
      .select('affiliation_id')
      .order('affiliation_id', { ascending: false })
      .limit(1);

    let newId;
    if (existing && existing.length > 0) {
      const lastNum = parseInt(existing[0].affiliation_id.replace('AFF-', ''));
      newId = 'AFF-' + String(lastNum + 1).padStart(4, '0');
    } else {
      newId = 'AFF-0001';
    }

    const { data, error } = await supabase
      .from('affiliations')
      .insert({
        affiliation_id: newId,
        affiliation_name: affiliationName
      })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'addAffiliation');
    }

    return createSuccessResponse(data, '所属を追加しました');
  } catch (error) {
    return handleSupabaseError(error, 'addAffiliation');
  }
}

/**
 * チーム追加
 */
async function addTeam(teamName) {
  try {
    const { data: existing } = await supabase
      .from('teams')
      .select('team_id')
      .order('team_id', { ascending: false })
      .limit(1);

    let newId;
    if (existing && existing.length > 0) {
      const lastNum = parseInt(existing[0].team_id.replace('TEAM-', ''));
      newId = 'TEAM-' + String(lastNum + 1).padStart(4, '0');
    } else {
      newId = 'TEAM-0001';
    }

    const { data, error } = await supabase
      .from('teams')
      .insert({
        team_id: newId,
        team_name: teamName
      })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'addTeam');
    }

    return createSuccessResponse(data, 'チームを追加しました');
  } catch (error) {
    return handleSupabaseError(error, 'addTeam');
  }
}

/**
 * 所属を削除
 */
async function deleteAffiliation(affiliationId) {
  try {
    // 使用中のユーザーがいるかチェック
    const { data: usedBy } = await supabase
      .from('users')
      .select('user_id')
      .eq('affiliation_id', affiliationId)
      .limit(1);

    if (usedBy && usedBy.length > 0) {
      return { success: false, message: 'この所属はユーザーに使用されているため削除できません' };
    }

    const { error } = await supabase
      .from('affiliations')
      .delete()
      .eq('id', affiliationId);

    if (error) {
      return handleSupabaseError(error, 'deleteAffiliation');
    }

    return createSuccessResponse(null, '所属を削除しました');
  } catch (error) {
    return handleSupabaseError(error, 'deleteAffiliation');
  }
}

/**
 * チームを削除
 */
async function deleteTeam(teamId) {
  try {
    // 使用中のユーザーがいるかチェック
    const { data: usedBy } = await supabase
      .from('users')
      .select('user_id')
      .eq('team_id', teamId)
      .limit(1);

    if (usedBy && usedBy.length > 0) {
      return { success: false, message: 'このチームはユーザーに使用されているため削除できません' };
    }

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (error) {
      return handleSupabaseError(error, 'deleteTeam');
    }

    return createSuccessResponse(null, 'チームを削除しました');
  } catch (error) {
    return handleSupabaseError(error, 'deleteTeam');
  }
}

// ========================================
// マイルストーン管理API
// ========================================

/**
 * マイルストーン工程タイプ一覧取得
 */
async function getMilestoneTypes() {
  try {
    const { data, error } = await supabase
      .from('milestone_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return handleSupabaseError(error, 'getMilestoneTypes');
    }

    return createSuccessResponse(data || [], 'マイルストーンタイプ取得成功');
  } catch (error) {
    return handleSupabaseError(error, 'getMilestoneTypes');
  }
}

/**
 * マイルストーン工程タイプ追加
 */
async function addMilestoneType(typeName) {
  try {
    // 最大display_orderを取得
    const { data: existing } = await supabase
      .from('milestone_types')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing && existing.length > 0) ? existing[0].display_order + 1 : 1;

    const { data, error } = await supabase
      .from('milestone_types')
      .insert({ type_name: typeName, display_order: nextOrder })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, message: 'この工程タイプは既に存在します' };
      }
      return handleSupabaseError(error, 'addMilestoneType');
    }

    return createSuccessResponse(data, '工程タイプを追加しました');
  } catch (error) {
    return handleSupabaseError(error, 'addMilestoneType');
  }
}

/**
 * 案件のマイルストーン一覧取得
 */
async function getProjectMilestones(projectId) {
  try {
    // TEXT形式のproject_idからUUIDを取得
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('project_id', projectId)
      .single();

    if (!project) {
      return createSuccessResponse([], 'マイルストーンなし');
    }

    // confirmed_by JOINを試み、失敗したらシンプルなクエリにフォールバック
    let data, error;
    ({ data, error } = await supabase
      .from('project_milestones')
      .select('*, confirmed_user:users!project_milestones_confirmed_by_fkey(user_id, name)')
      .eq('project_id', project.id)
      .order('display_order', { ascending: true }));

    if (error) {
      // confirmed_byカラムが未追加の場合はシンプルクエリで再取得
      ({ data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', project.id)
        .order('display_order', { ascending: true }));

      if (error) {
        return handleSupabaseError(error, 'getProjectMilestones');
      }
    }

    // confirmed_userをフラット化
    const flattened = (data || []).map(m => ({
      ...m,
      confirmed_by_user_id: m.confirmed_user?.user_id || null,
      confirmed_by_name: m.confirmed_user?.name || null
    }));

    return createSuccessResponse(flattened, 'マイルストーン取得成功');
  } catch (error) {
    return handleSupabaseError(error, 'getProjectMilestones');
  }
}

/**
 * 複数案件のマイルストーン一括取得（タイムライン用）
 */
async function getMultipleProjectMilestones(projectUuids) {
  try {
    if (!projectUuids || projectUuids.length === 0) {
      return createSuccessResponse({});
    }

    const { data, error } = await supabase
      .from('project_milestones')
      .select('*')
      .in('project_id', projectUuids)
      .order('display_order', { ascending: true });

    if (error) {
      return handleSupabaseError(error, 'getMultipleProjectMilestones');
    }

    // project_idでグループ化
    const grouped = {};
    (data || []).forEach(m => {
      if (!grouped[m.project_id]) {
        grouped[m.project_id] = [];
      }
      grouped[m.project_id].push(m);
    });

    return createSuccessResponse(grouped);
  } catch (error) {
    return handleSupabaseError(error, 'getMultipleProjectMilestones');
  }
}

/**
 * マイルストーン一括保存（delete + re-insert）
 */
async function saveProjectMilestones(projectId, milestones) {
  try {
    // TEXT形式のproject_idからUUIDを取得
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('project_id', projectId)
      .single();

    if (!project) {
      return { success: false, message: '案件が見つかりません' };
    }

    // 既存を削除
    await supabase
      .from('project_milestones')
      .delete()
      .eq('project_id', project.id);

    // 新しいデータを挿入
    if (milestones.length > 0) {
      const rows = milestones.map((m, index) => ({
        project_id: project.id,
        milestone_name: m.milestone_name,
        planned_date: m.planned_date || null,
        completed_date: m.completed_date || null,
        confirmed_by: m.confirmed_by || null,
        memo: m.memo || null,
        display_order: index
      }));

      let { error } = await supabase
        .from('project_milestones')
        .insert(rows);

      // confirmed_by/memoカラムが未追加の場合はシンプルな行で再試行
      if (error) {
        const simpleRows = milestones.map((m, index) => ({
          project_id: project.id,
          milestone_name: m.milestone_name,
          planned_date: m.planned_date || null,
          completed_date: m.completed_date || null,
          display_order: index
        }));
        ({ error } = await supabase
          .from('project_milestones')
          .insert(simpleRows));

        if (error) {
          return handleSupabaseError(error, 'saveProjectMilestones');
        }
      }
    }

    return createSuccessResponse(null, 'マイルストーンを保存しました');
  } catch (error) {
    return handleSupabaseError(error, 'saveProjectMilestones');
  }
}

/**
 * マイルストーンの完了/未完了をトグル
 */
async function toggleMilestoneComplete(milestoneId) {
  try {
    // 現在の状態を取得
    const { data: milestone, error: fetchError } = await supabase
      .from('project_milestones')
      .select('completed_date')
      .eq('id', milestoneId)
      .single();

    if (fetchError) {
      return handleSupabaseError(fetchError, 'toggleMilestoneComplete');
    }

    const newDate = milestone.completed_date ? null : new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('project_milestones')
      .update({ completed_date: newDate })
      .eq('id', milestoneId)
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'toggleMilestoneComplete');
    }

    return createSuccessResponse(data, newDate ? '完了にしました' : '未完了に戻しました');
  } catch (error) {
    return handleSupabaseError(error, 'toggleMilestoneComplete');
  }
}

// ========================================
// クライアント管理API
// ========================================

/**
 * クライアント追加
 */
async function addClient(clientName, agencyName) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, message: 'ユーザー情報が取得できません' };
    }

    // クライアントID生成
    const { data: existingClients, error: countError } = await supabase
      .from('clients')
      .select('client_id')
      .order('client_id', { ascending: false })
      .limit(1);

    let newClientId;
    if (existingClients && existingClients.length > 0) {
      const lastId = existingClients[0].client_id;
      const lastNum = parseInt(lastId.replace('CLI-', ''));
      newClientId = 'CLI-' + String(lastNum + 1).padStart(4, '0');
    } else {
      newClientId = 'CLI-0001';
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        client_id: newClientId,
        client_name: clientName,
        agency_name: agencyName,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'addClient');
    }

    return createSuccessResponse(data, 'クライアントを追加しました');
  } catch (error) {
    return handleSupabaseError(error, 'addClient');
  }
}

/**
 * クライアント情報更新
 */
async function updateClientInfo(clientId, clientName, agencyName) {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update({
        client_name: clientName,
        agency_name: agencyName
      })
      .eq('client_id', clientId)
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'updateClientInfo');
    }

    return createSuccessResponse(data, 'クライアント情報を更新しました');
  } catch (error) {
    return handleSupabaseError(error, 'updateClientInfo');
  }
}

/**
 * 案件の重複チェック（同一クライアント・同一案件名）
 */
async function checkDuplicateProject(clientId, projectName) {
  try {
    // client_idがテキスト形式の場合、UUIDに変換
    let clientUuid = clientId;
    if (clientId && typeof clientId === 'string' && !clientId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('client_id', clientId)
        .single();
      if (client) clientUuid = client.id;
    }

    const { data, error } = await supabase
      .from('projects')
      .select('project_id')
      .eq('client_id', clientUuid)
      .eq('project_name', projectName);

    if (error) return { success: true, isDuplicate: false };

    return { success: true, isDuplicate: data && data.length > 0 };
  } catch (error) {
    return { success: true, isDuplicate: false };
  }
}

/**
 * 案件削除（下書きのみ）
 */
async function deleteProject(projectId) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, message: 'ユーザー情報が取得できません' };
    }

    // project_idからプロジェクト情報を取得
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, status, main_editor, estimate_pdf_url')
      .eq('project_id', projectId)
      .single();

    if (projectError || !project) {
      return { success: false, message: '案件が見つかりません' };
    }

    // ステータスチェック（下書きのみ削除可能）
    if (project.status !== 'draft') {
      return { success: false, message: '下書き状態の案件のみ削除できます' };
    }

    // 権限チェック（メイン編集者または管理者のみ）
    if (project.main_editor !== user.id && !user.is_admin) {
      return { success: false, message: '削除権限がありません' };
    }

    // 関連データの削除
    await supabase.from('estimate_breakdown').delete().eq('project_id', project.id);
    await supabase.from('edit_history').delete().eq('project_id', project.id);
    await supabase.from('completed_urls').delete().eq('project_id', project.id);

    // PDFの削除
    if (project.estimate_pdf_url) {
      await deletePdfFromStorage(project.estimate_pdf_url);
    }

    // プロジェクト本体の削除
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id);

    if (deleteError) {
      return handleSupabaseError(deleteError, 'deleteProject');
    }

    return createSuccessResponse(null, '案件を削除しました');
  } catch (error) {
    return handleSupabaseError(error, 'deleteProject');
  }
}

// ========================================
// ファイルアップロードAPI
// ========================================

/**
 * PDFファイルをSupabase Storageにアップロード
 */
async function uploadPdfToStorage(file, projectId) {
  try {
    if (!file) {
      return { success: false, message: 'ファイルが選択されていません' };
    }

    // ファイル名を生成（プロジェクトID_タイムスタンプ.pdf）
    const timestamp = new Date().getTime();
    const fileName = `${projectId}_${timestamp}.pdf`;
    const filePath = `${fileName}`;

    // Supabase Storageにアップロード
    const { error } = await supabase.storage
      .from('estimates')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('PDF upload error:', error);
      return { success: false, message: 'PDFのアップロードに失敗しました: ' + error.message };
    }

    // 公開URLを取得
    const { data: publicUrlData } = supabase.storage
      .from('estimates')
      .getPublicUrl(filePath);

    return {
      success: true,
      message: 'PDFをアップロードしました',
      url: publicUrlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('uploadPdfToStorage error:', error);
    return { success: false, message: 'PDFのアップロードに失敗しました' };
  }
}

/**
 * 古いPDFファイルを削除
 */
async function deletePdfFromStorage(filePath) {
  try {
    if (!filePath) return { success: true };

    // URLからファイルパスを抽出
    let path = filePath;
    if (filePath.includes('estimates/')) {
      path = filePath.split('estimates/')[1];
    }

    const { error } = await supabase.storage
      .from('estimates')
      .remove([path]);

    if (error) {
      console.error('PDF delete error:', error);
      return { success: false, message: 'PDFの削除に失敗しました' };
    }

    return { success: true, message: 'PDFを削除しました' };
  } catch (error) {
    console.error('deletePdfFromStorage error:', error);
    return { success: false, message: 'PDFの削除に失敗しました' };
  }
}

// ========================================
// プロジェクト管理API
// ========================================

/**
 * プロジェクト保存
 */
async function saveProject(projectData) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, message: 'ユーザー情報が取得できません' };
    }

    // client_idがテキスト形式の場合、UUIDに変換
    let clientUuid = projectData.client_id;
    if (projectData.client_id && typeof projectData.client_id === 'string' && !projectData.client_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // client_idからUUIDを取得
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('client_id', projectData.client_id)
        .single();

      if (!client) {
        return { success: false, message: 'クライアントが見つかりません' };
      }
      clientUuid = client.id;
    }

    // main_editor, director, sub_editorsがuser_id(TEXT)の場合、UUIDに変換
    let mainEditorUuid = projectData.main_editor;
    if (projectData.main_editor && projectData.main_editor !== '' && typeof projectData.main_editor === 'string' && !projectData.main_editor.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: mainEditor } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', projectData.main_editor)
        .single();
      if (mainEditor) mainEditorUuid = mainEditor.id;
    }

    // 空文字列またはnullの場合はエラー
    if (!mainEditorUuid || mainEditorUuid === '') {
      return { success: false, message: 'メイン編集者を選択してください' };
    }

    let directorUuid = null;
    if (projectData.director && projectData.director !== '' && typeof projectData.director === 'string' && !projectData.director.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: director } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', projectData.director)
        .single();
      if (director) directorUuid = director.id;
    } else if (projectData.director && projectData.director.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      directorUuid = projectData.director;
    }

    // sub_editorsの変換
    let subEditorsUuids = [];
    if (projectData.sub_editors && projectData.sub_editors.length > 0) {
      for (const subEditor of projectData.sub_editors) {
        // 空文字列はスキップ
        if (!subEditor || subEditor === '') continue;

        if (typeof subEditor === 'string' && !subEditor.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('user_id', subEditor)
            .single();
          if (user) subEditorsUuids.push(user.id);
        } else {
          subEditorsUuids.push(subEditor);
        }
      }
    }

    // 見積合計と編集目標時間を計算
    let estimateTotal = 0;
    let targetHours = 0; // 分単位

    if (projectData.estimate_breakdown && Array.isArray(projectData.estimate_breakdown)) {
      estimateTotal = projectData.estimate_breakdown.reduce((sum, item) => sum + (item.amount || 0), 0);

      // 各見積項目の時給を取得して編集目標時間を個別に計算
      for (const item of projectData.estimate_breakdown) {
        if (item.estimate_item_id && item.amount) {
          // edit_item_idからUUIDと時給を取得
          let hourlyRate = 0;

          if (typeof item.estimate_item_id === 'string' && !item.estimate_item_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const { data: editItem } = await supabase
              .from('edit_items')
              .select('hourly_rate')
              .eq('edit_item_id', item.estimate_item_id)
              .single();
            if (editItem) {
              hourlyRate = editItem.hourly_rate;
            }
          } else {
            // UUIDの場合は直接取得
            const { data: editItem } = await supabase
              .from('edit_items')
              .select('hourly_rate')
              .eq('id', item.estimate_item_id)
              .single();
            if (editItem) {
              hourlyRate = editItem.hourly_rate;
            }
          }

          // 編集目標時間を計算: (金額 ÷ 時給) × 60分
          if (hourlyRate > 0) {
            targetHours += Math.round((item.amount / hourlyRate) * 60);
          }
        }
      }
    }

    // プロジェクトID生成
    const { data: projectId } = await supabase.rpc('generate_project_id');

    // PDFアップロード処理
    let estimatePdfUrl = null;
    if (projectData.pdf_file) {
      const uploadResult = await uploadPdfToStorage(projectData.pdf_file, projectId);
      if (uploadResult.success) {
        estimatePdfUrl = uploadResult.url;
      } else {
        return { success: false, message: uploadResult.message };
      }
    }

    // 日付フィールドの検証（空文字列の場合はnullに変換）
    const registrationDate = projectData.registration_date && projectData.registration_date !== ''
      ? projectData.registration_date
      : new Date().toISOString().split('T')[0];

    const deliveryDate = projectData.delivery_date && projectData.delivery_date !== ''
      ? projectData.delivery_date
      : null;

    const { data, error } = await supabase
      .from('projects')
      .insert({
        project_id: projectId,
        client_id: clientUuid,
        project_name: projectData.project_name,
        agency_name: projectData.agency_name,
        registration_date: registrationDate,
        delivery_date: deliveryDate,
        main_editor: mainEditorUuid,
        sub_editors: subEditorsUuids,
        director: directorUuid,
        genres: projectData.genres || [],
        technologies: projectData.technologies || [],
        estimate_pdf_url: estimatePdfUrl,
        estimate_number: projectData.estimate_number,
        // estimate_total は編集費内訳の自動合計
        // estimate_grand_total は編集費以外を含む見積書全体の合計（手入力）
        estimate_total: estimateTotal,
        estimate_grand_total: projectData.estimate_grand_total ?? null,
        target_hours: targetHours,
        file_storage_url: projectData.file_storage_url,
        other_notes: projectData.other_notes,
        status: 'draft',
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'saveProject');
    }

    // 見積内訳を保存
    if (projectData.estimate_breakdown && projectData.estimate_breakdown.length > 0) {
      for (const item of projectData.estimate_breakdown) {
        // edit_item_idをUUIDに変換
        let editItemUuid = item.estimate_item_id;
        if (item.estimate_item_id && typeof item.estimate_item_id === 'string' && !item.estimate_item_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          const { data: editItem } = await supabase
            .from('edit_items')
            .select('id')
            .eq('edit_item_id', item.estimate_item_id)
            .single();
          if (editItem) editItemUuid = editItem.id;
        }

        // breakdown_id生成
        const { data: breakdownId } = await supabase.rpc('generate_breakdown_id');

        await supabase
          .from('estimate_breakdown')
          .insert({
            breakdown_id: breakdownId,
            project_id: data.id,
            edit_item_id: editItemUuid,
            amount: item.amount
          });
      }
    }

    return createSuccessResponse(data, 'プロジェクトを保存しました');
  } catch (error) {
    return handleSupabaseError(error, 'saveProject');
  }
}

/**
 * プロジェクト更新
 */
async function updateProject(projectData) {
  try {
    // main_editor, director, sub_editorsをUUIDに変換（saveProjectと同様の処理）
    let mainEditorUuid = projectData.main_editor;
    if (projectData.main_editor && projectData.main_editor !== '' && typeof projectData.main_editor === 'string' && !projectData.main_editor.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: mainEditor } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', projectData.main_editor)
        .single();
      if (mainEditor) mainEditorUuid = mainEditor.id;
    }

    let directorUuid = null;
    if (projectData.director && projectData.director !== '' && typeof projectData.director === 'string' && !projectData.director.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: director } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', projectData.director)
        .single();
      if (director) directorUuid = director.id;
    } else if (projectData.director && projectData.director.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      directorUuid = projectData.director;
    }

    let subEditorsUuids = [];
    if (projectData.sub_editors && projectData.sub_editors.length > 0) {
      for (const subEditor of projectData.sub_editors) {
        if (!subEditor || subEditor === '') continue;
        if (typeof subEditor === 'string' && !subEditor.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('user_id', subEditor)
            .single();
          if (user) subEditorsUuids.push(user.id);
        } else {
          subEditorsUuids.push(subEditor);
        }
      }
    }

    let assignedLeaderUuid = null;
    if (projectData.assigned_leader && projectData.assigned_leader !== '' && typeof projectData.assigned_leader === 'string' && !projectData.assigned_leader.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: leader } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', projectData.assigned_leader)
        .single();
      if (leader) assignedLeaderUuid = leader.id;
    } else if (projectData.assigned_leader && projectData.assigned_leader.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      assignedLeaderUuid = projectData.assigned_leader;
    }

    // PDFアップロード処理（新しいファイルがある場合）
    let estimatePdfUrl = projectData.estimate_pdf_url; // 既存のURLを保持
    if (projectData.pdf_file) {
      // 古いPDFを削除
      if (projectData.estimate_pdf_url) {
        await deletePdfFromStorage(projectData.estimate_pdf_url);
      }

      // 新しいPDFをアップロード
      const uploadResult = await uploadPdfToStorage(projectData.pdf_file, projectData.project_id);
      if (uploadResult.success) {
        estimatePdfUrl = uploadResult.url;
      } else {
        return { success: false, message: uploadResult.message };
      }
    }

    // idまたはproject_idで更新対象を特定
    const isUuid = projectData.id && projectData.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    console.log('プロジェクト更新データ:', {
      id: projectData.id,
      project_id: projectData.project_id,
      isUuid: isUuid,
      searchColumn: isUuid ? 'id' : 'project_id',
      searchValue: isUuid ? projectData.id : projectData.project_id,
      genres: projectData.genres,
      technologies: projectData.technologies,
      reflection: projectData.reflection,
      main_editor_message: projectData.main_editor_message
    });

    // まず更新前にデータが存在するか確認
    const { data: existingData, error: checkError } = await supabase
      .from('projects')
      .select('id, project_id')
      .eq(isUuid ? 'id' : 'project_id', isUuid ? projectData.id : projectData.project_id);

    console.log('既存データ確認:', { existingData, checkError });

    if (!existingData || existingData.length === 0) {
      return {
        success: false,
        message: `プロジェクトが見つかりません。検索条件: ${isUuid ? 'id' : 'project_id'} = ${isUuid ? projectData.id : projectData.project_id}`
      };
    }

    const { data, error } = await supabase
      .from('projects')
      .update({
        project_name: projectData.project_name,
        agency_name: projectData.agency_name,
        delivery_date: projectData.delivery_date,
        actual_delivery_date: projectData.actual_delivery_date,
        main_editor: mainEditorUuid,
        sub_editors: subEditorsUuids,
        director: directorUuid,
        genres: projectData.genres || [],
        technologies: projectData.technologies || [],
        estimate_pdf_url: estimatePdfUrl,
        estimate_number: projectData.estimate_number,
        estimate_total: projectData.estimate_total,
        estimate_grand_total: projectData.estimate_grand_total ?? null,
        file_storage_url: projectData.file_storage_url,
        reflection: projectData.reflection,
        main_editor_message: projectData.main_editor_message,
        other_notes: projectData.other_notes,
        assigned_leader: assignedLeaderUuid
      })
      .eq(isUuid ? 'id' : 'project_id', isUuid ? projectData.id : projectData.project_id)
      .select();

    console.log('更新結果:', { data, error, dataLength: data?.length });

    if (error) {
      console.error('プロジェクト更新エラー:', error);
      return handleSupabaseError(error, 'updateProject');
    }

    // 更新後のデータが返ってこない場合は、既存データを使用
    // (RLSポリシーでSELECT権限が制限されている可能性がある)
    let updatedProject;
    if (!data || data.length === 0) {
      console.warn('更新されたデータが返されませんでした。既存データを使用します。');
      updatedProject = existingData[0];
    } else {
      updatedProject = data[0];
    }

    console.log('プロジェクト更新成功:', updatedProject);

    // 見積内訳を更新（既存を削除して再登録）
    console.log('見積内訳データ:', projectData.estimate_breakdown);
    if (projectData.estimate_breakdown && projectData.estimate_breakdown.length > 0) {
      // 既存の見積内訳を削除
      const { error: deleteError } = await supabase
        .from('estimate_breakdown')
        .delete()
        .eq('project_id', updatedProject.id);

      if (deleteError) {
        console.error('見積内訳削除エラー:', deleteError);
      } else {
        console.log('見積内訳削除成功');
      }

      // 新しい見積内訳を登録
      for (const item of projectData.estimate_breakdown) {
        console.log('処理中の見積内訳:', item);

        // edit_item_idをUUIDに変換
        let editItemUuid = item.estimate_item_id;
        console.log('元のedit_item_id:', item.estimate_item_id);

        if (item.estimate_item_id && typeof item.estimate_item_id === 'string' && !item.estimate_item_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          console.log('UUIDではないため変換開始:', item.estimate_item_id);

          const { data: editItems, error: editItemError } = await supabase
            .from('edit_items')
            .select('id')
            .eq('edit_item_id', item.estimate_item_id);

          console.log('edit_items検索結果:', editItems);
          console.log('edit_items検索エラー:', editItemError);

          if (editItemError) {
            console.error('edit_item取得エラー:', editItemError);
            continue;
          }

          if (editItems && editItems.length > 0) {
            editItemUuid = editItems[0].id;
            console.log('変換後のUUID:', editItemUuid);
          } else {
            console.error('edit_itemが見つかりません:', item.estimate_item_id);
            continue;
          }
        }

        console.log('最終的なedit_item_id (UUID):', editItemUuid);

        const { data: breakdownId } = await supabase.rpc('generate_breakdown_id');
        console.log('生成されたbreakdown_id:', breakdownId);

        const { error: insertError } = await supabase
          .from('estimate_breakdown')
          .insert({
            breakdown_id: breakdownId,
            project_id: updatedProject.id,
            edit_item_id: editItemUuid,
            amount: item.amount
          });

        if (insertError) {
          console.error('estimate_breakdown挿入エラー:', insertError);
        } else {
          console.log('estimate_breakdown挿入成功');
        }
      }
    }

    // 編集時間を登録（新規追加分）
    console.log('編集時間データ:', projectData.new_edit_times);
    if (projectData.new_edit_times && projectData.new_edit_times.length > 0) {
      // 現在のユーザーのUUIDを取得
      const currentUser = getCurrentUser();
      const editorUuid = currentUser.id;
      console.log('編集者UUID:', editorUuid);

      for (const editTime of projectData.new_edit_times) {
        console.log('処理中の編集時間:', editTime);

        // estimate_item_idをUUIDに変換
        let estimateItemUuid = editTime.estimate_item_id;
        console.log('元のestimate_item_id:', editTime.estimate_item_id);

        if (editTime.estimate_item_id && typeof editTime.estimate_item_id === 'string' && !editTime.estimate_item_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          console.log('UUIDではないため変換開始:', editTime.estimate_item_id);

          const { data: estimateItems, error: estimateItemError } = await supabase
            .from('estimate_items')
            .select('id')
            .eq('estimate_item_id', editTime.estimate_item_id);

          console.log('estimate_items検索結果:', estimateItems);
          console.log('estimate_items検索エラー:', estimateItemError);

          if (estimateItemError) {
            console.error('estimate_item取得エラー:', estimateItemError);
            continue;
          }

          if (estimateItems && estimateItems.length > 0) {
            estimateItemUuid = estimateItems[0].id;
            console.log('変換後のUUID:', estimateItemUuid);
          } else {
            console.error('estimate_itemが見つかりません:', editTime.estimate_item_id);
            continue;
          }
        }

        console.log('最終的なestimate_item_id (UUID):', estimateItemUuid);

        // history_idを生成
        const { data: timeId, error: rpcError } = await supabase.rpc('generate_time_id');

        if (rpcError) {
          console.error('generate_time_id エラー:', rpcError);
          continue;
        }

        // edit_historyに挿入
        const { error: insertError } = await supabase
          .from('edit_history')
          .insert({
            history_id: timeId,
            project_id: updatedProject.id,
            estimate_item: estimateItemUuid,
            editor: editorUuid,
            date: editTime.date,
            edit_time: editTime.edit_time,
            memo: editTime.memo || null
          });

        if (insertError) {
          console.error('edit_history挿入エラー:', insertError);
        }
      }
    }

    // 完成品URLを更新（既存を削除して再登録）
    if (projectData.completed_urls && projectData.completed_urls.length > 0) {
      // 既存のURLを削除
      await supabase
        .from('completed_urls')
        .delete()
        .eq('project_id', updatedProject.id);

      // 新しいURLを登録
      for (const url of projectData.completed_urls) {
        const { data: urlId } = await supabase.rpc('generate_url_id');

        await supabase
          .from('completed_urls')
          .insert({
            url_id: urlId,
            project_id: updatedProject.id,
            url: url
          });
      }
    }

    return createSuccessResponse(updatedProject, 'プロジェクトを更新しました');
  } catch (error) {
    return handleSupabaseError(error, 'updateProject');
  }
}

/**
 * プロジェクトを上長に申請
 */
async function submitProject(projectId, assignedLeader) {
  try {
    // project_idからUUIDを取得
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('project_id', projectId)
      .single();

    if (projectError) throw projectError;

    // assigned_leaderをUUIDに変換
    const { data: leaderUser, error: leaderError } = await supabase
      .from('users')
      .select('id')
      .eq('user_id', assignedLeader)
      .single();

    if (leaderError) throw leaderError;

    // ステータスをsubmittedに更新
    // submitted_at は承認一覧やダッシュボードの「申請日」表示に使われるため必ず記録する
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        status: 'submitted',
        assigned_leader: leaderUser.id,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', project.id);

    if (updateError) throw updateError;

    return createSuccessResponse(null, 'プロジェクトを上長に申請しました');
  } catch (error) {
    return handleSupabaseError(error, 'submitProject');
  }
}

/**
 * プロジェクト検索
 */
async function searchProjects(searchParams) {
  try {
    // client_id, main_editor, sub_editorをUUIDに変換
    let clientUuid = searchParams.client_id;
    if (searchParams.client_id && typeof searchParams.client_id === 'string' && !searchParams.client_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('client_id', searchParams.client_id)
        .single();
      if (client) clientUuid = client.id;
    }

    let mainEditorUuid = searchParams.main_editor;
    if (searchParams.main_editor && typeof searchParams.main_editor === 'string' && !searchParams.main_editor.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', searchParams.main_editor)
        .single();
      if (user) mainEditorUuid = user.id;
    }

    let subEditorUuid = searchParams.sub_editor;
    if (searchParams.sub_editor && typeof searchParams.sub_editor === 'string' && !searchParams.sub_editor.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', searchParams.sub_editor)
        .single();
      if (user) subEditorUuid = user.id;
    }

    let query = supabase
      .from('projects')
      .select(`
        *,
        client:clients(client_name, agency_name),
        main_editor_user:users!main_editor(name),
        director_user:users!director(name)
      `);

    // フィルター条件を追加
    if (searchParams.agency_name) {
      query = query.ilike('agency_name', `%${searchParams.agency_name}%`);
    }
    if (clientUuid) {
      query = query.eq('client_id', clientUuid);
    }
    if (searchParams.project_name) {
      query = query.ilike('project_name', `%${searchParams.project_name}%`);
    }
    if (mainEditorUuid) {
      query = query.eq('main_editor', mainEditorUuid);
    }
    if (subEditorUuid) {
      query = query.contains('sub_editors', [subEditorUuid]);
    }
    if (searchParams.delivery_date) {
      query = query.eq('delivery_date', searchParams.delivery_date);
    }
    if (searchParams.delivery_date_from) {
      query = query.gte('delivery_date', searchParams.delivery_date_from);
    }
    if (searchParams.delivery_date_to) {
      query = query.lte('delivery_date', searchParams.delivery_date_to);
    }
    // statusは単一値と配列の両方を受け付ける
    // （複数ステータスを 'a,b' のような文字列で渡すと完全一致になり0件になるため）
    if (Array.isArray(searchParams.status)) {
      if (searchParams.status.length > 0) {
        query = query.in('status', searchParams.status);
      }
    } else if (searchParams.status) {
      query = query.eq('status', searchParams.status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return handleSupabaseError(error, 'searchProjects');
    }

    // データ変換: ネストされたリレーションデータをフラット化
    const transformedData = data.map(project => ({
      ...project,
      client_name: project.client?.client_name || '',
      // agency_nameはprojectsテーブルのものを優先、なければclientsテーブルから
      agency_name: project.agency_name || project.client?.agency_name || '',
      main_editor_name: project.main_editor_user?.name || '',
      director_name: project.director_user?.name || ''
    }));

    return createSuccessResponse(transformedData);
  } catch (error) {
    return handleSupabaseError(error, 'searchProjects');
  }
}

/**
 * 進行中の案件取得（編集時間登録用）
 * 編集作業中＝draft（下書き）と rejected（上長差戻し）の案件のみを対象とする。
 * 申請済み（submitted / leader_approved / executive_approved）の案件は
 * 編集時間を追加できないようにするため除外する。
 * - part_time: サブ編集者として登録されている案件
 * - staff: メイン/サブ編集者として登録されている案件
 * - leader: 全ての対象案件
 */
async function getInProgressProjects() {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, message: 'ユーザー情報が取得できません' };
    }

    let query = supabase
      .from('projects')
      .select(`
        *,
        client:clients(client_name, agency_name)
      `)
      .in('status', ['draft', 'rejected']);

    // 権限に応じてフィルタリング
    if (user.role === 'part_time') {
      // アルバイト: サブ編集者として登録されている案件のみ
      query = query.contains('sub_editors', [user.id]);
    } else if (user.role === 'staff') {
      // 編集者: メイン/サブ編集者として登録されている案件
      query = query.or(`main_editor.eq.${user.id},sub_editors.cs.{${user.id}}`);
    }
    // leader/executiveの場合は全案件取得（フィルタなし）

    query = query.order('delivery_date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      return handleSupabaseError(error, 'getInProgressProjects');
    }

    // データ変換: ネストされたリレーションデータをフラット化
    const transformedData = data.map(project => ({
      ...project,
      client_name: project.client?.client_name || '',
      // agency_nameはprojectsテーブルのものを優先、なければclientsテーブルから
      agency_name: project.agency_name || project.client?.agency_name || ''
    }));

    return createSuccessResponse(transformedData);
  } catch (error) {
    return handleSupabaseError(error, 'getInProgressProjects');
  }
}

/**
 * プロジェクト詳細取得
 * @param {string} projectId - project_id (TEXT形式: "PRJ-20260103-001") または id (UUID)
 */
async function getProjectDetail(projectId) {
  try {
    // UUIDかproject_idかを判定
    const isUuid = projectId && projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(*),
        main_editor_user:users!main_editor(*),
        director_user:users!director(*),
        assigned_leader_user:users!assigned_leader(*)
      `)
      .eq(isUuid ? 'id' : 'project_id', projectId)
      .single();

    if (error) {
      return handleSupabaseError(error, 'getProjectDetail');
    }

    // 見積内訳を取得
    const { data: breakdown } = await supabase
      .from('estimate_breakdown')
      .select(`
        *,
        edit_item:edit_items(*)
      `)
      .eq('project_id', project.id);

    project.estimate_breakdown = breakdown || [];

    // 編集時間履歴を取得
    const { data: editHistory } = await supabase
      .from('edit_history')
      .select(`
        *,
        estimate_item_data:estimate_items!estimate_item(*),
        editor_user:users!editor(*)
      `)
      .eq('project_id', project.id)
      .order('date', { ascending: false });

    // 編集時間履歴のデータを平坦化
    project.edit_history = (editHistory || []).map(h => ({
      ...h,
      edit_item_name: h.estimate_item_data?.estimate_item_name || '-',
      editor_name: h.editor_user?.name || '-'
    }));

    // 実働時間を計算（分単位）
    project.total_edit_hours = (editHistory || []).reduce((total, h) => total + (h.edit_time || 0), 0);

    // 完成品URLを取得
    const { data: completedUrls } = await supabase
      .from('completed_urls')
      .select('*')
      .eq('project_id', project.id);

    // 完成品URLのデータを平坦化（URLのみの配列に変換）
    project.completed_urls = (completedUrls || []).map(u => u.url);

    // サブ編集者の詳細情報を取得
    if (project.sub_editors && project.sub_editors.length > 0) {
      const { data: subEditorsData } = await supabase
        .from('users')
        .select('*')
        .in('id', project.sub_editors);

      project.sub_editors_data = subEditorsData || [];
      project.sub_editors_names = subEditorsData ? subEditorsData.map(u => u.name) : [];
      // フォーム用にuser_id配列に変換
      project.sub_editors = subEditorsData ? subEditorsData.map(u => u.user_id) : [];
    } else {
      project.sub_editors_data = [];
      project.sub_editors_names = [];
      project.sub_editors = [];
    }

    // フロントエンド用にデータを平坦化
    project.client_name = project.client?.client_name || '';
    project.client_id_text = project.client?.client_id || ''; // TEXT形式のclient_id
    // agency_nameはprojectsテーブルのものを優先、なければclientsテーブルから
    if (!project.agency_name && project.client?.agency_name) {
      project.agency_name = project.client.agency_name;
    }
    project.main_editor_name = project.main_editor_user?.name || '';
    project.main_editor_id = project.main_editor_user?.user_id || '';
    project.director_name = project.director_user?.name || '';
    project.director_id = project.director_user?.user_id || null;
    project.assigned_leader = project.assigned_leader_user?.user_id || null;
    project.assigned_leader_name = project.assigned_leader_user?.name || null;

    // ジャンルと技術のマスターデータを取得して名前配列を作成
    if (project.genres && project.genres.length > 0) {
      const { data: genresData } = await supabase
        .from('genres')
        .select('genre_id, genre_name')
        .in('genre_id', project.genres);

      project.genres_names = genresData ? genresData.map(g => g.genre_name) : [];
    } else {
      project.genres_names = [];
    }

    if (project.technologies && project.technologies.length > 0) {
      const { data: techData } = await supabase
        .from('technologies')
        .select('tech_id, tech_name')
        .in('tech_id', project.technologies);

      project.technologies_names = techData ? techData.map(t => t.tech_name) : [];
    } else {
      project.technologies_names = [];
    }

    return createSuccessResponse(project);
  } catch (error) {
    return handleSupabaseError(error, 'getProjectDetail');
  }
}

/**
 * 承認用プロジェクト詳細取得（getProjectDetailと同じ）
 */
async function getProjectForApproval(projectId) {
  return await getProjectDetail(projectId);
}

/**
 * 上長評価を保存（承認・差戻し）
 */
async function saveLeaderEvaluation(evaluationData) {
  try {
    console.log('=== saveLeaderEvaluation ===');
    console.log('evaluationData:', evaluationData);

    // 現在のユーザー情報を取得
    const { data: authData } = await supabase.auth.getUser();
    console.log('Current auth user:', authData?.user);

    // project_idからUUIDと assigned_leader を取得
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, assigned_leader, status')
      .eq('project_id', evaluationData.project_id)
      .single();

    console.log('project:', project);
    console.log('projectError:', projectError);

    if (projectError) throw projectError;

    // 更新データを準備
    const updateData = {
      status: evaluationData.status, // 'leader_approved' or 'rejected'
      leader_comment: evaluationData.leader_comment || null,
      leader_message: evaluationData.leader_message || null,
      updated_at: new Date().toISOString()
    };

    if (evaluationData.status === 'rejected') {
      // 差戻しの場合は理由を保存
      updateData.leader_rejection_reason = evaluationData.rejection_reason || null;
    } else {
      // 承認の場合は承認日時・承認者を記録する
      // （「上長からのフィードバック」一覧が leader_approved_at で絞り込むため必須）
      const currentUser = getCurrentUser();
      updateData.leader_approved_at = new Date().toISOString();
      updateData.leader_approved_by = currentUser ? currentUser.id : null;
      // 前回の差戻し理由が残ったままにならないようクリアする
      updateData.leader_rejection_reason = null;
    }

    console.log('updateData:', updateData);

    // プロジェクトを更新
    const { data: result, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', project.id);

    console.log('update result:', result);
    console.log('updateError:', updateError);

    if (updateError) throw updateError;

    const message = evaluationData.status === 'leader_approved' ? '承認しました' : '差戻しました';
    return createSuccessResponse(null, message);
  } catch (error) {
    console.error('saveLeaderEvaluation error:', error);
    return handleSupabaseError(error, 'saveLeaderEvaluation');
  }
}

// ========================================
// 編集時間登録API
// ========================================

/**
 * 編集時間保存
 */
async function saveEditTime(editTimeData) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, message: 'ユーザー情報が取得できません' };
    }

    // editor_idをUUIDに変換
    let editorUuid = user.id;
    if (editTimeData.editor_id && editTimeData.editor_id !== user.user_id) {
      const { data: editor } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', editTimeData.editor_id)
        .single();
      if (editor) editorUuid = editor.id;
    }

    const allHistories = [];

    // 各案件の編集履歴を処理
    for (const projectEdit of editTimeData.project_edits) {
      // project_idをUUIDに変換
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('project_id', projectEdit.project_id)
        .single();

      if (!project) {
        return { success: false, message: `案件が見つかりません: ${projectEdit.project_id}` };
      }

      // 各編集履歴を処理
      for (const history of projectEdit.edit_history) {
        // estimate_item_idをUUIDに変換
        const { data: estimateItem } = await supabase
          .from('estimate_items')
          .select('id')
          .eq('estimate_item_id', history.estimate_item_id)
          .single();

        if (!estimateItem) {
          return { success: false, message: `編集項目が見つかりません: ${history.estimate_item_id}` };
        }

        // history_idを生成
        const { data: historyId, error: rpcError } = await supabase.rpc('generate_history_id');

        if (rpcError) {
          console.error('generate_history_id エラー:', rpcError);
          return { success: false, message: 'history_idの生成に失敗しました' };
        }

        // 編集時間を分単位に変換（edit_hoursは10進数の時間）
        const editTimeMinutes = Math.round(history.edit_hours * 60);

        allHistories.push({
          history_id: historyId,
          project_id: project.id,
          date: editTimeData.edit_date,
          editor: editorUuid,
          estimate_item: estimateItem.id,
          edit_time: editTimeMinutes,
          memo: history.edit_memo || null
        });
      }
    }

    // 一括挿入
    const { data, error } = await supabase
      .from('edit_history')
      .insert(allHistories)
      .select();

    if (error) {
      return handleSupabaseError(error, 'saveEditTime');
    }

    return createSuccessResponse(data, '編集時間を登録しました');
  } catch (error) {
    return handleSupabaseError(error, 'saveEditTime');
  }
}

// ========================================
// ダッシュボードAPI
// ========================================

/**
 * 納品済プロジェクト取得
 * @param {string} userId - ユーザーID
 * @param {string} dateFrom - 開始日
 * @param {string} dateTo - 終了日
 */
async function getCompletedProjects(userId, dateFrom, dateTo) {
  try {
    // userIdからUUIDを取得してmain_editorを正しくフィルター
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!userRecord) {
      return createSuccessResponse([]);
    }

    // actual_delivery_dateが入力されているプロジェクトを取得
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(client_name, agency_name),
        main_editor_user:users!main_editor(user_id, name)
      `)
      .eq('main_editor', userRecord.id)
      .not('actual_delivery_date', 'is', null)
      .gte('delivery_date', dateFrom)
      .lte('delivery_date', dateTo)
      .order('delivery_date', { ascending: false });

    if (error) {
      return handleSupabaseError(error, 'getCompletedProjects');
    }

    // データ変換: ネストされたリレーションデータをフラット化
    const transformedData = (data || []).map(project => ({
      ...project,
      client_name: project.client?.client_name || '',
      agency_name: project.agency_name || project.client?.agency_name || '',
      main_editor_name: project.main_editor_user?.name || ''
    }));

    return createSuccessResponse(transformedData);
  } catch (error) {
    return handleSupabaseError(error, 'getCompletedProjects');
  }
}

// ========================================
// 通知API
// ========================================

/**
 * 通知一覧取得
 */
async function getNotifications(userId) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return handleSupabaseError(error, 'getNotifications');
    }

    return createSuccessResponse(data);
  } catch (error) {
    return handleSupabaseError(error, 'getNotifications');
  }
}

// ========================================
// ユーザー管理API（管理者専用）
// ========================================

/**
 * 全ユーザー一覧取得
 */
async function getAllUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        affiliation:affiliations(affiliation_id, affiliation_name),
        team:teams(team_id, team_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error, 'getAllUsers');
    }

    // データ変換: リレーションデータをフラット化
    const transformedData = (data || []).map(u => ({
      ...u,
      affiliation_name: u.affiliation?.affiliation_name || '',
      team_name: u.team?.team_name || ''
    }));

    return createSuccessResponse(transformedData);
  } catch (error) {
    return handleSupabaseError(error, 'getAllUsers');
  }
}

/**
 * ユーザー追加
 */
async function addUser(userData) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.is_admin) {
      return { success: false, message: '管理者権限が必要です' };
    }

    // PostgreSQL関数を使用してユーザー登録
    // この関数はauth.usersとusersテーブルの両方にデータを登録します
    const { data: result, error: rpcError } = await supabase.rpc('register_new_user', {
      p_user_id: userData.user_id,
      p_user_name: userData.name,
      p_email: userData.email,
      p_password: userData.password,
      p_role: userData.role,
      p_is_editor: userData.is_editor || false,
      p_is_admin: userData.is_admin || false
    });

    if (rpcError) {
      return handleSupabaseError(rpcError, 'addUser - register_new_user');
    }

    // 関数からの結果を確認
    if (!result || !result.success) {
      return {
        success: false,
        message: result?.message || 'ユーザー登録に失敗しました'
      };
    }

    return {
      success: true,
      message: result.message,
      data: { id: result.user_id }
    };
  } catch (error) {
    return handleSupabaseError(error, 'addUser');
  }
}

/**
 * ユーザー情報更新
 */
async function updateUser(userId, userData) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.is_admin) {
      return { success: false, message: '管理者権限が必要です' };
    }

    const updateData = {
      name: userData.name,
      role: userData.role,
      is_editor: userData.is_editor,
      is_admin: userData.is_admin,
      is_active: userData.is_active,
      affiliation_id: userData.affiliation_id || null,
      team_id: userData.team_id || null
    };

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'updateUser');
    }

    return createSuccessResponse(data, 'ユーザー情報を更新しました');
  } catch (error) {
    return handleSupabaseError(error, 'updateUser');
  }
}

/**
 * ユーザーパスワードリセット（管理者のみ）
 *
 * supabase.auth.admin.updateUserById() は service_role キーを必要とするが、
 * 公開フロントエンドには anon key しか置けないため使えない。
 * 管理者チェック付きの SECURITY DEFINER 関数(021)をRPCで呼ぶ。
 * 権限の最終判定はサーバー側で行われるため、下のチェックはUI用の早期リターン。
 */
async function resetUserPassword(userId, newPassword) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.is_admin) {
      return { success: false, message: '管理者権限が必要です' };
    }

    const { data, error } = await supabase.rpc('admin_reset_user_password', {
      p_user_id: userId,
      p_new_password: newPassword
    });

    if (error) {
      return handleSupabaseError(error, 'resetUserPassword');
    }

    // 関数は { success, message } のjsonbを返す
    if (!data || !data.success) {
      return {
        success: false,
        message: (data && data.message) || 'パスワードのリセットに失敗しました'
      };
    }

    return createSuccessResponse(null, data.message);
  } catch (error) {
    return handleSupabaseError(error, 'resetUserPassword');
  }
}

/**
 * ユーザー削除（論理削除）
 */
async function deleteUser(userId) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.is_admin) {
      return { success: false, message: '管理者権限が必要です' };
    }

    // 自分自身は削除できない
    if (currentUser.user_id === userId) {
      return { success: false, message: '自分自身は削除できません' };
    }

    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'deleteUser');
    }

    return createSuccessResponse(data, 'ユーザーを無効化しました');
  } catch (error) {
    return handleSupabaseError(error, 'deleteUser');
  }
}
