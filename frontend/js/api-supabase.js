// ========================================
// API通信モジュール (Supabase版)
// ========================================

// ========================================
// 認証API
// ========================================

/**
 * ログイン（Supabase Auth）
 */
async function login(loginId, password, rememberMe = false) {
  try {
    // メールアドレス形式に変換（例：yamada.taro → yamada.taro@example.com）
    const email = `${loginId}@example.com`;

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

    // プロジェクトID生成
    const { data: projectId } = await supabase.rpc('generate_project_id');

    const { data, error } = await supabase
      .from('projects')
      .insert({
        project_id: projectId,
        client_id: projectData.client_id,
        project_name: projectData.project_name,
        agency_name: projectData.agency_name,
        registration_date: projectData.registration_date,
        delivery_date: projectData.delivery_date,
        main_editor: projectData.main_editor,
        sub_editors: projectData.sub_editors || [],
        director: projectData.director,
        genres: projectData.genres || [],
        technologies: projectData.technologies || [],
        estimate_total: projectData.estimate_total,
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
    const { data, error } = await supabase
      .from('projects')
      .update({
        project_name: projectData.project_name,
        agency_name: projectData.agency_name,
        delivery_date: projectData.delivery_date,
        main_editor: projectData.main_editor,
        sub_editors: projectData.sub_editors || [],
        director: projectData.director,
        genres: projectData.genres || [],
        technologies: projectData.technologies || [],
        estimate_total: projectData.estimate_total,
        file_storage_url: projectData.file_storage_url,
        other_notes: projectData.other_notes
      })
      .eq('id', projectData.id)
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'updateProject');
    }

    return createSuccessResponse(data, 'プロジェクトを更新しました');
  } catch (error) {
    return handleSupabaseError(error, 'updateProject');
  }
}

/**
 * プロジェクト検索
 */
async function searchProjects(searchParams) {
  try {
    let query = supabase
      .from('projects')
      .select(`
        *,
        client:clients(client_name, agency_name),
        main_editor_user:users!main_editor(name),
        director_user:users!director(name)
      `);

    // フィルター条件を追加
    if (searchParams.status) {
      query = query.eq('status', searchParams.status);
    }
    if (searchParams.client_id) {
      query = query.eq('client_id', searchParams.client_id);
    }
    if (searchParams.main_editor) {
      query = query.eq('main_editor', searchParams.main_editor);
    }
    if (searchParams.date_from) {
      query = query.gte('registration_date', searchParams.date_from);
    }
    if (searchParams.date_to) {
      query = query.lte('registration_date', searchParams.date_to);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return handleSupabaseError(error, 'searchProjects');
    }

    return createSuccessResponse(data);
  } catch (error) {
    return handleSupabaseError(error, 'searchProjects');
  }
}

/**
 * プロジェクト詳細取得
 */
async function getProjectDetail(projectId) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(*),
        main_editor_user:users!main_editor(*),
        director_user:users!director(*)
      `)
      .eq('id', projectId)
      .single();

    if (error) {
      return handleSupabaseError(error, 'getProjectDetail');
    }

    return createSuccessResponse(data);
  } catch (error) {
    return handleSupabaseError(error, 'getProjectDetail');
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

    // 履歴ID生成
    const { data: historyId } = await supabase.rpc('generate_history_id');

    const { data, error } = await supabase
      .from('edit_history')
      .insert({
        history_id: historyId,
        project_id: editTimeData.project_id,
        date: editTimeData.date,
        editor: user.id,
        edit_item_id: editTimeData.edit_item_id,
        edit_time: editTimeData.edit_time,
        memo: editTimeData.memo
      })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error, 'saveEditTime');
    }

    return createSuccessResponse(data, '編集時間を登録しました');
  } catch (error) {
    return handleSupabaseError(error, 'saveEditTime');
  }
}

// ========================================
// 承認関連API
// ========================================

/**
 * リーダー承認
 */
async function approveProjectByLeader(evaluationData) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, message: 'ユーザー情報が取得できません' };
    }

    const { data, error } = await supabase.rpc('approve_project_by_leader', {
      p_project_id: evaluationData.project_id,
      p_leader_id: user.id,
      p_evaluation_data: evaluationData
    });

    if (error) {
      return handleSupabaseError(error, 'approveProjectByLeader');
    }

    return data;
  } catch (error) {
    return handleSupabaseError(error, 'approveProjectByLeader');
  }
}

/**
 * リーダー差戻
 */
async function rejectProjectByLeader(data) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, message: 'ユーザー情報が取得できません' };
    }

    const { data: result, error } = await supabase.rpc('reject_project_by_leader', {
      p_project_id: data.project_id,
      p_leader_id: user.id,
      p_rejection_reason: data.rejection_reason
    });

    if (error) {
      return handleSupabaseError(error, 'rejectProjectByLeader');
    }

    return result;
  } catch (error) {
    return handleSupabaseError(error, 'rejectProjectByLeader');
  }
}

// ========================================
// ダッシュボードAPI
// ========================================

/**
 * ダッシュボードデータ取得
 */
async function getDashboardData(userId) {
  try {
    const { data, error } = await supabase.rpc('get_dashboard_data', {
      p_user_id: userId
    });

    if (error) {
      return handleSupabaseError(error, 'getDashboardData');
    }

    return createSuccessResponse(data);
  } catch (error) {
    return handleSupabaseError(error, 'getDashboardData');
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
