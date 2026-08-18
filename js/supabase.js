// ============================================================
// AREIS PRO
// CONFIGURAÇÃO DO SUPABASE
// ============================================================

const _supabaseUrl = 'https://ujwfggunvzsonnsjuvpl.supabase.co';

const _supabaseKey = 'sb_publishable_hcM_2Z8eE_3sdJybZGz1HQ_rae8MIH7';

const supabaseClient = supabase.createClient(
    _supabaseUrl,
    _supabaseKey
);