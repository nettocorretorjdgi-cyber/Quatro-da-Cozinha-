export type OrderStatus = 'recebido' | 'em_preparacao' | 'pronto' | 'entregue';

export type DeliveryType = 'comer_no_local' | 'para_viagem';

export interface OrderItem {
  id: string;
  nome: string;
  quantidade: number;
  categoria?: 'lanche' | 'bebida' | 'acompanhamento' | 'sobremesa';
  adicionais?: string[];
  observacao?: string; // ex: "Sem cebola", "Carne bem passada", "Sem gelo"
  concluido?: boolean; // Para o cozinheiro marcar item individual
}

export interface KitchenOrder {
  id: string;
  numero_pedido: string; // ex: "#102", "A-45"
  cliente_nome?: string;
  totem_origem?: string; // ex: "Totem 01", "Totem 02", "App Mesa"
  tipo_entrega: DeliveryType;
  status: OrderStatus;
  itens: OrderItem[];
  observacoes_gerais?: string;
  total?: number;
  criado_em: string; // ISO string
  atualizado_em?: string; // ISO string
  iniciado_em?: string; // quando passou para 'em_preparacao'
  pronto_em?: string; // quando passou para 'pronto'
  entregue_em?: string; // quando passou para 'entregue'
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  tableName: string;
}

export interface KdsStats {
  totalRecebidos: number;
  totalEmPreparacao: number;
  totalProntos: number;
  totalEntregues: number;
  tempoMedioPreparoMin: number;
  pedidosAtrasados: number;
}
