import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { KitchenOrder, OrderStatus, SupabaseConfig } from '../types/kitchen';
import { INITIAL_ORDERS } from './mockData';
import { normalizeOrderStatus } from '../utils/formatters';

const STORAGE_KEY_URL = 'kds_supabase_url';
const STORAGE_KEY_KEY = 'kds_supabase_key';
const STORAGE_KEY_LOCAL_ORDERS = 'kds_local_orders_v1';
const TABLE_NAME = 'pedidos';

export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- SCHEMA SQL COMPLETO: BANCO DE DADOS & POLÍTICAS DE ARMAZENAMENTO (STORAGE)
-- PAINEL DE GERENCIAMENTO DA COZINHA (KDS) & TOTEM DE AUTOATENDIMENTO
-- Execute este script no SQL Editor do seu projeto Supabase:
-- ========================================================

-- ========================================================
-- 1. CRIAÇÃO DA TABELA DE PEDIDOS
-- ========================================================
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido TEXT NOT NULL,
  cliente_nome TEXT DEFAULT 'Cliente Totem',
  tipo_entrega TEXT DEFAULT 'comer_no_local', -- 'comer_no_local' ou 'para_viagem'
  totem_origem TEXT DEFAULT 'Totem 01',
  status TEXT NOT NULL DEFAULT 'recebido',
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacoes_gerais TEXT,
  total NUMERIC(10,2) DEFAULT 0.00,
  comprovante_url TEXT, -- Link para arquivo no Supabase Storage se houver
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  iniciado_em TIMESTAMPTZ,
  pronto_em TIMESTAMPTZ,
  entregue_em TIMESTAMPTZ
);

-- ========================================================
-- REMOÇÃO DEFINITIVA DA CONSTRAINT QUE TRAVAVA OS PEDIDOS
-- ========================================================
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_status_check;

-- Normalização automática de status (converte qualquer variação para minúsculas)
CREATE OR REPLACE FUNCTION public.normalizar_status_pedido()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status := TRIM(LOWER(COALESCE(NEW.status, 'recebido')));
  
  IF NEW.status IN ('em preparacao', 'em preparação', 'em_preparo', 'em preparo', 'preparando', 'em produção', 'em_producao', 'producao', 'produção', '2') THEN
    NEW.status := 'em_preparacao';
  ELSIF NEW.status IN ('recebido', 'recebidos', 'novo', 'pendente', 'aguardando', '1') THEN
    NEW.status := 'recebido';
  ELSIF NEW.status IN ('pronto', 'prontos', 'concluido', 'concluído', 'ready', '3') THEN
    NEW.status := 'pronto';
  ELSIF NEW.status IN ('entregue', 'entregues', 'finalizado', 'retirado', 'delivered', '4') THEN
    NEW.status := 'entregue';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalizar_status_pedido ON public.pedidos;
CREATE TRIGGER trg_normalizar_status_pedido
BEFORE INSERT OR UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.normalizar_status_pedido();

-- Índices para consultas rápidas por status e ordem de chegada
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos (status);
CREATE INDEX IF NOT EXISTS idx_pedidos_criado_em ON public.pedidos (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON public.pedidos (numero_pedido);

-- ========================================================
-- 2. HABILITAR ROW LEVEL SECURITY (RLS) NA TABELA
-- ========================================================
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas para evitar duplicidade
DROP POLICY IF EXISTS "Permitir leitura de pedidos para todos" ON public.pedidos;
DROP POLICY IF EXISTS "Permitir criacao de pedidos pelos totens" ON public.pedidos;
DROP POLICY IF EXISTS "Permitir atualizacao de status pela cozinha" ON public.pedidos;
DROP POLICY IF EXISTS "Permitir exclusao de pedidos cancelados" ON public.pedidos;
DROP POLICY IF EXISTS "Acesso público total aos pedidos" ON public.pedidos;

-- 2.1 Política de Leitura (SELECT)
-- Permite que o KDS e os totens consultem todos os pedidos
CREATE POLICY "Permitir leitura de pedidos para todos"
ON public.pedidos
FOR SELECT
USING (true);

-- 2.2 Política de Inserção (INSERT)
-- Permite que os totens de autoatendimento registrem novos pedidos
CREATE POLICY "Permitir criacao de pedidos pelos totens"
ON public.pedidos
FOR INSERT
WITH CHECK (true);

-- 2.3 Política de Atualização (UPDATE)
-- Permite que o painel da cozinha altere o status dos pedidos e marque itens
CREATE POLICY "Permitir atualizacao de status pela cozinha"
ON public.pedidos
FOR UPDATE
USING (true)
WITH CHECK (true);

-- 2.4 Política de Exclusão (DELETE)
-- Permite remover pedidos cancelados quando necessário
CREATE POLICY "Permitir exclusao de pedidos cancelados"
ON public.pedidos
FOR DELETE
USING (true);

-- ========================================================
-- 3. HABILITAR REALTIME (SINCRONIZAÇÃO EM TEMPO REAL)
-- ========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'pedidos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
  END IF;
END $$;

-- ========================================================
-- 4. BUCKETS DE ARMAZENAMENTO (SUPABASE STORAGE)
-- Cria os buckets para comandas, fotos de comprovantes e produtos
-- ========================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('kds-comprovantes', 'kds-comprovantes', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  ('kds-produtos', 'kds-produtos', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ========================================================
-- 5. POLÍTICAS DE SEGURANÇA DO STORAGE (storage.objects)
-- (Nota: storage.objects já possui RLS habilitado nativamente no Supabase)
-- ========================================================
-- Limpar políticas antigas do storage se existirem
DO $$
BEGIN
  DROP POLICY IF EXISTS "Leitura pública de comprovantes e produtos" ON storage.objects;
  DROP POLICY IF EXISTS "Upload de comprovantes e arquivos pelo KDS/Totem" ON storage.objects;
  DROP POLICY IF EXISTS "Atualização de arquivos no storage" ON storage.objects;
  DROP POLICY IF EXISTS "Exclusão de arquivos no storage" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
  -- Ignora caso não tenha permissão de alterar políticas de storage
  NULL;
END $$;

-- 5.1 Política de Leitura Pública do Storage (SELECT)
CREATE POLICY "Leitura pública de comprovantes e produtos"
ON storage.objects
FOR SELECT
USING (bucket_id IN ('kds-comprovantes', 'kds-produtos'));

-- 5.2 Política de Upload/Inserção no Storage (INSERT)
CREATE POLICY "Upload de comprovantes e arquivos pelo KDS/Totem"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id IN ('kds-comprovantes', 'kds-produtos'));

-- 5.3 Política de Atualização no Storage (UPDATE)
CREATE POLICY "Atualização de arquivos no storage"
ON storage.objects
FOR UPDATE
USING (bucket_id IN ('kds-comprovantes', 'kds-produtos'))
WITH CHECK (bucket_id IN ('kds-comprovantes', 'kds-produtos'));

-- 5.4 Política de Exclusão no Storage (DELETE)
CREATE POLICY "Exclusão de arquivos no storage"
ON storage.objects
FOR DELETE
USING (bucket_id IN ('kds-comprovantes', 'kds-produtos'));

-- ========================================================
-- 6. PEDIDOS INICIAIS DE TESTE
-- ========================================================
INSERT INTO public.pedidos (numero_pedido, cliente_nome, totem_origem, tipo_entrega, status, itens, observacoes_gerais, total)
VALUES
(
  '#101',
  'Mariana Silva',
  'Totem 01',
  'comer_no_local',
  'recebido',
  '[
    {"id": "1", "nome": "Smash Burger Duplo Cheddar", "quantidade": 1, "observacao": "Ponto da carne: bem passada", "concluido": false},
    {"id": "2", "nome": "Batata Frita Rústica G", "quantidade": 1, "observacao": "Com alecrim e sal de parrilla", "concluido": false},
    {"id": "3", "nome": "Refrigerante Cola Zero 400ml", "quantidade": 1, "observacao": "Gelo e limão", "concluido": false}
  ]'::jsonb,
  'Cliente aguarda na mesa 04.',
  54.90
),
(
  '#102',
  'Carlos Eduardo',
  'Totem 02',
  'para_viagem',
  'recebido',
  '[
    {"id": "4", "nome": "Classic Cheese Salada", "quantidade": 2, "observacao": "SEM CEBOLA e SEM TOMATE", "concluido": false},
    {"id": "5", "nome": "Onion Rings Crocantes", "quantidade": 1, "concluido": false}
  ]'::jsonb,
  'Embalar para viagem com saco kraft.',
  62.00
),
(
  '#103',
  'Beatriz Almeida',
  'Totem 01',
  'comer_no_local',
  'em_preparacao',
  '[
    {"id": "6", "nome": "Monster Bacon Melt BBQ", "quantidade": 1, "concluido": true},
    {"id": "7", "nome": "Milkshake de Pistache 400ml", "quantidade": 1, "observacao": "Caprichar na calda", "concluido": true}
  ]'::jsonb,
  'Mesa 12',
  68.00
)
ON CONFLICT DO NOTHING;
`;

class SupabaseService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig = {
    url: '',
    anonKey: '',
    isConnected: false,
    tableName: TABLE_NAME,
  };

  constructor() {
    this.init();
  }

  private init() {
    // 1. Prioritize environment variables
    const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
    const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

    // 2. Check localStorage overrides
    const storedUrl = localStorage.getItem(STORAGE_KEY_URL) || '';
    const storedKey = localStorage.getItem(STORAGE_KEY_KEY) || '';

    const effectiveUrl = (storedUrl || envUrl).trim();
    const effectiveKey = (storedKey || envKey).trim();

    this.config.url = effectiveUrl;
    this.config.anonKey = effectiveKey;

    if (effectiveUrl && effectiveKey && effectiveUrl.startsWith('http')) {
      try {
        this.client = createClient(effectiveUrl, effectiveKey, {
          auth: { persistSession: false },
        });
        this.config.isConnected = true;
      } catch (err) {
        console.warn('Erro ao inicializar cliente Supabase:', err);
        this.client = null;
        this.config.isConnected = false;
      }
    } else {
      this.client = null;
      this.config.isConnected = false;
    }
  }

  public getConfig(): SupabaseConfig {
    return { ...this.config };
  }

  public isConfigured(): boolean {
    return !!(this.client && this.config.url && this.config.anonKey);
  }

  public async saveConfig(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      // Clear config to switch to local mode
      localStorage.removeItem(STORAGE_KEY_URL);
      localStorage.removeItem(STORAGE_KEY_KEY);
      this.client = null;
      this.config.url = '';
      this.config.anonKey = '';
      this.config.isConnected = false;
      return { success: true, message: 'Supabase desconectado. Operando em modo de banco local.' };
    }

    if (!cleanUrl.startsWith('https://') && !cleanUrl.startsWith('http://')) {
      return { success: false, message: 'A URL do Supabase deve iniciar com https://' };
    }

    try {
      const testClient = createClient(cleanUrl, cleanKey, {
        auth: { persistSession: false },
      });

      // Quick probe
      const { error } = await testClient.from(TABLE_NAME).select('id').limit(1);

      if (error && error.code !== 'PGRST116') {
        // Table might not exist yet or wrong key
        if (error.code === '42P01') {
          // Table doesn't exist yet, but credentials work!
          localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
          localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
          this.client = testClient;
          this.config.url = cleanUrl;
          this.config.anonKey = cleanKey;
          this.config.isConnected = true;
          return {
            success: true,
            message: 'Conectado ao Supabase! A tabela "pedidos" ainda não foi criada. Copie o script SQL abaixo e execute no SQL Editor.',
          };
        }
        return {
          success: false,
          message: `Erro ao conectar com o Supabase: ${error.message} (${error.code})`,
        };
      }

      localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
      localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
      this.client = testClient;
      this.config.url = cleanUrl;
      this.config.anonKey = cleanKey;
      this.config.isConnected = true;

      return { success: true, message: 'Conexão com o Supabase estabelecida com sucesso!' };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido ao conectar';
      return { success: false, message: `Falha na conexão: ${errorMsg}` };
    }
  }

  public async testConnection(): Promise<{ success: boolean; message: string; count?: number }> {
    if (!this.client) {
      return { success: false, message: 'Supabase não configurado. Atualmente usando armazenamento local.' };
    }

    try {
      const { data, error, count } = await this.client
        .from(TABLE_NAME)
        .select('*', { count: 'exact' })
        .limit(1);

      if (error) {
        return {
          success: false,
          message: `Erro Supabase: ${error.message}. Verifique se a tabela "${TABLE_NAME}" existe e se as políticas RLS foram aplicadas.`,
        };
      }

      return {
        success: true,
        message: `Conexão bem-sucedida! Tabela "${TABLE_NAME}" encontrada com ${count ?? data?.length ?? 0} pedido(s).`,
        count: count ?? data?.length ?? 0,
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Falha na requisição ao Supabase.',
      };
    }
  }

  // --- Local Database Fallback Storage ---
  public getLocalOrders(): KitchenOrder[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LOCAL_ORDERS);
      if (!raw) {
        this.saveLocalOrders(INITIAL_ORDERS);
        return INITIAL_ORDERS;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      this.saveLocalOrders(INITIAL_ORDERS);
      return INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  }

  public saveLocalOrders(orders: KitchenOrder[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_LOCAL_ORDERS, JSON.stringify(orders));
    } catch (err) {
      console.error('Erro ao salvar local orders:', err);
    }
  }

  // --- CRUD Operations ---
  public async fetchOrders(): Promise<KitchenOrder[]> {
    if (!this.client) {
      return this.getLocalOrders();
    }

    try {
      const { data, error } = await this.client
        .from(TABLE_NAME)
        .select('*')
        .order('criado_em', { ascending: true });

      if (error) {
        console.warn('Erro ao carregar do Supabase, usando local:', error.message);
        return this.getLocalOrders();
      }

      if (!data || data.length === 0) {
        // If Supabase table is empty, seed it with our rich initial orders
        const localOrders = this.getLocalOrders();
        await this.syncLocalOrdersToSupabase(localOrders);
        return localOrders;
      }

      // Convert DB record to KitchenOrder
      const formatted: KitchenOrder[] = data.map((item) => ({
        id: String(item.id),
        numero_pedido: item.numero_pedido || '#000',
        cliente_nome: item.cliente_nome || undefined,
        tipo_entrega: item.tipo_entrega || 'comer_no_local',
        totem_origem: item.totem_origem || 'Totem',
        status: normalizeOrderStatus(item.status),
        itens: Array.isArray(item.itens) ? item.itens : [],
        observacoes_gerais: item.observacoes_gerais || undefined,
        total: item.total ? Number(item.total) : undefined,
        criado_em: item.criado_em || new Date().toISOString(),
        atualizado_em: item.atualizado_em || undefined,
        iniciado_em: item.iniciado_em || undefined,
        pronto_em: item.pronto_em || undefined,
        entregue_em: item.entregue_em || undefined,
      }));

      // Cache locally
      this.saveLocalOrders(formatted);
      return formatted;
    } catch (err) {
      console.warn('Exceção ao buscar pedidos do Supabase:', err);
      return this.getLocalOrders();
    }
  }

  public async createOrder(order: Omit<KitchenOrder, 'id'> & { id?: string }): Promise<KitchenOrder> {
    const newId = order.id || `ord-${Date.now()}`;
    const timestamp = order.criado_em || new Date().toISOString();

    const fullOrder: KitchenOrder = {
      ...order,
      id: newId,
      criado_em: timestamp,
      atualizado_em: timestamp,
    };

    // Save locally first
    const currentLocal = this.getLocalOrders();
    const updatedLocal = [fullOrder, ...currentLocal];
    this.saveLocalOrders(updatedLocal);

    // Save to Supabase if available
    if (this.client) {
      try {
        const payload = {
          numero_pedido: fullOrder.numero_pedido,
          cliente_nome: fullOrder.cliente_nome || null,
          tipo_entrega: fullOrder.tipo_entrega,
          totem_origem: fullOrder.totem_origem || 'Totem 01',
          status: fullOrder.status,
          itens: fullOrder.itens,
          observacoes_gerais: fullOrder.observacoes_gerais || null,
          total: fullOrder.total || 0,
          criado_em: fullOrder.criado_em,
          atualizado_em: fullOrder.atualizado_em,
        };

        const { data, error } = await this.client
          .from(TABLE_NAME)
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.warn('Erro ao inserir pedido no Supabase:', error.message);
        } else if (data) {
          fullOrder.id = String(data.id);
          // Update local with true db id
          const remapped = updatedLocal.map((o) => (o.id === newId ? fullOrder : o));
          this.saveLocalOrders(remapped);
        }
      } catch (err) {
        console.warn('Falha na inserção no Supabase:', err);
      }
    }

    return fullOrder;
  }

  public async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus
  ): Promise<KitchenOrder | null> {
    const now = new Date().toISOString();
    const currentLocal = this.getLocalOrders();
    const existingIndex = currentLocal.findIndex((o) => o.id === orderId);

    if (existingIndex === -1) return null;

    const existing = currentLocal[existingIndex];
    const updated: KitchenOrder = {
      ...existing,
      status: newStatus,
      atualizado_em: now,
      iniciado_em: newStatus === 'em_preparacao' && !existing.iniciado_em ? now : existing.iniciado_em,
      pronto_em: newStatus === 'pronto' && !existing.pronto_em ? now : existing.pronto_em,
      entregue_em: newStatus === 'entregue' && !existing.entregue_em ? now : existing.entregue_em,
    };

    currentLocal[existingIndex] = updated;
    this.saveLocalOrders(currentLocal);

    if (this.client) {
      try {
        const updates: Record<string, unknown> = {
          status: newStatus,
          atualizado_em: now,
        };
        if (newStatus === 'em_preparacao') updates.iniciado_em = updated.iniciado_em;
        if (newStatus === 'pronto') updates.pronto_em = updated.pronto_em;
        if (newStatus === 'entregue') updates.entregue_em = updated.entregue_em;

        const { error } = await this.client
          .from(TABLE_NAME)
          .update(updates)
          .eq('id', orderId);

        if (error) {
          console.warn('Erro ao atualizar status no Supabase:', error.message);
        }
      } catch (err) {
        console.warn('Erro ao atualizar no Supabase:', err);
      }
    }

    return updated;
  }

  public async toggleOrderItemChecked(
    orderId: string,
    itemId: string
  ): Promise<KitchenOrder | null> {
    const currentLocal = this.getLocalOrders();
    const existingIndex = currentLocal.findIndex((o) => o.id === orderId);
    if (existingIndex === -1) return null;

    const existing = currentLocal[existingIndex];
    const updatedItems = existing.itens.map((item) => {
      if (item.id === itemId) {
        return { ...item, concluido: !item.concluido };
      }
      return item;
    });

    const updated: KitchenOrder = {
      ...existing,
      itens: updatedItems,
      atualizado_em: new Date().toISOString(),
    };

    currentLocal[existingIndex] = updated;
    this.saveLocalOrders(currentLocal);

    if (this.client) {
      try {
        await this.client
          .from(TABLE_NAME)
          .update({
            itens: updatedItems,
            atualizado_em: updated.atualizado_em,
          })
          .eq('id', orderId);
      } catch (err) {
        console.warn('Erro ao atualizar item no Supabase:', err);
      }
    }

    return updated;
  }

  public async deleteOrder(orderId: string): Promise<boolean> {
    const currentLocal = this.getLocalOrders();
    const filtered = currentLocal.filter((o) => o.id !== orderId);
    this.saveLocalOrders(filtered);

    if (this.client) {
      try {
        await this.client.from(TABLE_NAME).delete().eq('id', orderId);
      } catch (err) {
        console.warn('Erro ao excluir pedido no Supabase:', err);
      }
    }

    return true;
  }

  public async syncLocalOrdersToSupabase(orders: KitchenOrder[]): Promise<{ count: number }> {
    if (!this.client || orders.length === 0) return { count: 0 };

    try {
      const records = orders.map((o) => ({
        numero_pedido: o.numero_pedido,
        cliente_nome: o.cliente_nome || null,
        tipo_entrega: o.tipo_entrega,
        totem_origem: o.totem_origem || 'Totem 01',
        status: o.status,
        itens: o.itens,
        observacoes_gerais: o.observacoes_gerais || null,
        total: o.total || 0,
        criado_em: o.criado_em,
        atualizado_em: o.atualizado_em || o.criado_em,
        iniciado_em: o.iniciado_em || null,
        pronto_em: o.pronto_em || null,
        entregue_em: o.entregue_em || null,
      }));

      const { data, error } = await this.client
        .from(TABLE_NAME)
        .upsert(records, { onConflict: 'numero_pedido' })
        .select();

      if (error) {
        console.warn('Falha no sync de pedidos para Supabase:', error.message);
        return { count: 0 };
      }
      return { count: data?.length || 0 };
    } catch (err) {
      console.warn('Erro durante sync com Supabase:', err);
      return { count: 0 };
    }
  }

  /**
   * Assina mudanças em tempo real no Supabase Realtime channel
   */
  public subscribeToRealtime(
    onPayload: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; record: KitchenOrder; oldId?: string }) => void
  ): () => void {
    if (!this.client) {
      return () => {};
    }

    try {
      const channel = this.client
        .channel('kds_orders_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: TABLE_NAME },
          (payload) => {
            const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
            if (eventType === 'DELETE') {
              onPayload({
                eventType,
                record: {} as KitchenOrder,
                oldId: String((payload.old as { id?: string | number })?.id || ''),
              });
              return;
            }

            const raw = payload.new as Record<string, unknown>;
            if (raw && raw.id) {
              const record: KitchenOrder = {
                id: String(raw.id),
                numero_pedido: String(raw.numero_pedido || '#000'),
                cliente_nome: raw.cliente_nome ? String(raw.cliente_nome) : undefined,
                tipo_entrega: (raw.tipo_entrega as 'comer_no_local' | 'para_viagem') || 'comer_no_local',
                totem_origem: raw.totem_origem ? String(raw.totem_origem) : 'Totem',
                status: normalizeOrderStatus(raw.status),
                itens: Array.isArray(raw.itens) ? (raw.itens as KitchenOrder['itens']) : [],
                observacoes_gerais: raw.observacoes_gerais ? String(raw.observacoes_gerais) : undefined,
                total: raw.total ? Number(raw.total) : undefined,
                criado_em: raw.criado_em ? String(raw.criado_em) : new Date().toISOString(),
                atualizado_em: raw.atualizado_em ? String(raw.atualizado_em) : undefined,
                iniciado_em: raw.iniciado_em ? String(raw.iniciado_em) : undefined,
                pronto_em: raw.pronto_em ? String(raw.pronto_em) : undefined,
                entregue_em: raw.entregue_em ? String(raw.entregue_em) : undefined,
              };

              onPayload({ eventType, record });
            }
          }
        )
        .subscribe();

      return () => {
        if (this.client) {
          this.client.removeChannel(channel);
        }
      };
    } catch (err) {
      console.warn('Erro ao assinar Realtime do Supabase:', err);
      return () => {};
    }
  }
}

export const supabaseService = new SupabaseService();
