import React, { useState } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  UploadCloud,
} from 'lucide-react';
import { supabaseService, SUPABASE_SQL_SCHEMA } from '../services/supabaseService';
import { KitchenOrder } from '../types/kitchen';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: KitchenOrder[];
  onConfigSaved: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  orders,
  onConfigSaved,
}) => {
  const currentConfig = supabaseService.getConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [activeTab, setActiveTab] = useState<'config' | 'sql'>('config');

  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setFeedback(null);

    try {
      const saveRes = await supabaseService.saveConfig(url, anonKey);
      if (!saveRes.success) {
        setFeedback({ type: 'error', message: saveRes.message });
        return;
      }

      if (url && anonKey) {
        const testRes = await supabaseService.testConnection();
        if (testRes.success) {
          setFeedback({
            type: 'success',
            message: `${testRes.message} Todas as atualizações e novos pedidos serão gravados diretamente no Supabase em tempo real.`,
          });
          onConfigSaved();
        } else {
          setFeedback({ type: 'error', message: testRes.message });
        }
      } else {
        setFeedback({
          type: 'success',
          message: 'Configuração limpa. Operando em modo de banco de dados local.',
        });
        onConfigSaved();
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSyncToSupabase = async () => {
    if (!supabaseService.isConfigured()) {
      setFeedback({
        type: 'error',
        message: 'Conecte-se ao Supabase primeiro antes de sincronizar os pedidos.',
      });
      return;
    }

    setSyncing(true);
    setFeedback(null);
    try {
      const res = await supabaseService.syncLocalOrdersToSupabase(orders);
      setFeedback({
        type: 'success',
        message: `${res.count} pedido(s) sincronizados com sucesso na tabela "pedidos" do Supabase!`,
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Erro ao sincronizar pedidos com o Supabase.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">
                Integração com Supabase
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Persistência remota e sincronização em tempo real de pedidos da cozinha.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-800 px-5 pt-2 gap-2 bg-neutral-950/40">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'config'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Credenciais & Conexão
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'sql'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Script SQL (Banco + Políticas de Armazenamento)
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'config' ? (
            <form onSubmit={handleSaveAndTest} className="space-y-4">
              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-400">
                <p>
                  Para conectar o painel ao seu projeto Supabase, acesse{' '}
                  <span className="text-neutral-200 font-medium">Project Settings &gt; API</span> e
                  copie a <span className="text-neutral-200 font-medium">Project URL</span> e a chave{' '}
                  <span className="text-neutral-200 font-medium">anon (public)</span>.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Project URL do Supabase:
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://exemplo-seu-projeto.supabase.co"
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-amber-500/60 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  API Key Anon (Chave pública):
                </label>
                <input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-amber-500/60 font-mono"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={handleSyncToSupabase}
                  disabled={syncing || !url}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 rounded-lg transition-colors border border-neutral-700"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{syncing ? 'Sincronizando...' : 'Exportar Pedidos Atuais ao Supabase'}</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={testing}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-colors shadow-md shadow-amber-500/20"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                    <span>{testing ? 'Testando...' : 'Salvar e Conectar'}</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  Execute no SQL Editor do seu projeto Supabase:
                </span>
                <button
                  onClick={handleCopySql}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-amber-300 rounded-lg border border-neutral-700 transition-colors"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copiado com sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Script SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-[340px] leading-relaxed">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>

              <div className="p-3 rounded-lg bg-neutral-950/70 border border-neutral-800 text-xs text-neutral-400 space-y-1">
                <p className="font-semibold text-neutral-300">O que este script configura:</p>
                <p>1. Tabela <code className="text-amber-300">pedidos</code> com índices e políticas RLS completas (SELECT, INSERT, UPDATE, DELETE).</p>
                <p>2. Habilitação do <code className="text-amber-300">supabase_realtime</code> para sincronização instantânea.</p>
                <p>3. Criação dos buckets no Supabase Storage: <code className="text-emerald-400">kds-comprovantes</code> e <code className="text-emerald-400">kds-produtos</code>.</p>
                <p>4. Políticas de armazenamento completas salvas em <code className="text-emerald-400">storage.objects</code> (Leitura pública, Upload, Atualização e Exclusão).</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
