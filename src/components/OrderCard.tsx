import React, { useState, useEffect } from 'react';
import {
  Clock,
  Check,
  RotateCcw,
  Printer,
  ChevronRight,
  AlertCircle,
  ShoppingBag,
  UtensilsCrossed,
  Trash2,
} from 'lucide-react';
import { KitchenOrder, OrderStatus } from '../types/kitchen';
import { formatElapsedTime, formatDateTime, getOrderUrgency, getStatusDetails } from '../utils/formatters';

interface OrderCardProps {
  order: KitchenOrder;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onToggleItem: (orderId: string, itemId: string) => void;
  onPrintTicket: (order: KitchenOrder) => void;
  onDeleteOrder: (orderId: string) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onStatusChange,
  onToggleItem,
  onPrintTicket,
  onDeleteOrder,
}) => {
  const [elapsed, setElapsed] = useState<string>(formatElapsedTime(order.criado_em));
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  // Live timer tick
  useEffect(() => {
    const update = () => setElapsed(formatElapsedTime(order.criado_em));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [order.criado_em]);

  const urgency = getOrderUrgency(order.criado_em, order.status);
  const statusDetails = getStatusDetails(order.status);

  // Previous status logic
  const getPreviousStatus = (current: OrderStatus): OrderStatus | null => {
    if (current === 'em_preparacao') return 'recebido';
    if (current === 'pronto') return 'em_preparacao';
    if (current === 'entregue') return 'pronto';
    return null;
  };

  const prevStatus = getPreviousStatus(order.status);

  // Items progress calculation
  const totalItems = order.itens.reduce((acc, curr) => acc + curr.quantidade, 0);
  const completedItems = order.itens
    .filter((i) => i.concluido)
    .reduce((acc, curr) => acc + curr.quantidade, 0);
  const isAllItemsCompleted = totalItems > 0 && completedItems === totalItems;

  return (
    <article
      className={`flex flex-col justify-between bg-neutral-900 rounded-xl border transition-all duration-200 shadow-md ${
        urgency.level === 'critical'
          ? 'border-rose-500/80 shadow-rose-950/20 ring-1 ring-rose-500/30'
          : urgency.level === 'warning'
          ? 'border-amber-500/60 shadow-amber-950/20'
          : 'border-neutral-800 hover:border-neutral-700'
      }`}
    >
      {/* Top Header do Ticket */}
      <div className="p-3.5 border-b border-neutral-800/80">
        <div className="flex items-start justify-between gap-3">
          {/* Order ID & Source */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black tracking-tight text-neutral-100">
                {order.numero_pedido}
              </span>
              <span className="text-xs font-medium text-neutral-400">
                {order.tipo_entrega === 'para_viagem' ? (
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <ShoppingBag className="w-3 h-3" />
                    Viagem
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-blue-300">
                    <UtensilsCrossed className="w-3 h-3" />
                    No Local
                  </span>
                )}
              </span>
            </div>

            {/* Clean metadata without pill capsules */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
              <span>{order.totem_origem || 'Totem'}</span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span className="font-medium text-neutral-300">{order.cliente_nome || 'Cliente'}</span>
            </div>
          </div>

          {/* Cronômetro e Urgência */}
          <div className="text-right">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono font-bold text-xs tabular-nums ${urgency.badgeBg} ${urgency.textColor} ${urgency.borderColor}`}
            >
              <Clock className="w-3 h-3" />
              <span>{elapsed}</span>
            </div>
            <div className="text-[11px] text-neutral-500 mt-1 font-mono tabular-nums">
              {formatDateTime(order.criado_em)}
            </div>
          </div>
        </div>

        {/* Status atual em texto limpo */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-800/50 text-xs">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${statusDetails.textColor}`}>
              {statusDetails.label}
            </span>
            <span aria-hidden="true" className="text-neutral-700">/</span>
            <span className="text-neutral-400 text-[11px]">
              {completedItems}/{totalItems} itens prontos
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPrintTicket(order)}
              className="p-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
              title="Visualizar / Imprimir comanda"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (confirmDelete) {
                  onDeleteOrder(order.id);
                } else {
                  setConfirmDelete(true);
                  setTimeout(() => setConfirmDelete(false), 3000);
                }
              }}
              className={`p-1 rounded transition-colors ${
                confirmDelete
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'text-neutral-500 hover:text-rose-400 hover:bg-neutral-800'
              }`}
              title={confirmDelete ? 'Confirmar exclusão' : 'Excluir pedido'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Itens do Pedido */}
      <div className="p-3.5 space-y-2.5 flex-1 overflow-y-auto max-h-[360px]">
        {order.itens.map((item) => (
          <div
            key={item.id}
            onClick={() => onToggleItem(order.id, item.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleItem(order.id, item.id);
              }
            }}
            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
              item.concluido
                ? 'bg-neutral-950/40 border-neutral-800/60 opacity-60'
                : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {/* Checkbox de preparo do item */}
              <div
                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  item.concluido
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'border-neutral-700 bg-neutral-900'
                }`}
              >
                {item.concluido && <Check className="w-3 h-3 stroke-[3]" />}
              </div>

              {/* Multiplicador e Nome */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-sm font-black text-amber-400 shrink-0">
                    {item.quantidade}x
                  </span>
                  <span
                    className={`text-sm font-bold tracking-tight text-neutral-100 ${
                      item.concluido ? 'line-through text-neutral-400' : ''
                    }`}
                  >
                    {item.nome}
                  </span>
                </div>

                {/* Adicionais se houver */}
                {item.adicionais && item.adicionais.length > 0 && (
                  <div className="text-xs text-neutral-400 mt-0.5">
                    + {item.adicionais.join(', ')}
                  </div>
                )}

                {/* OBSERVAÇÃO DO ITEM (Alta visibilidade) */}
                {item.observacao && (
                  <div className="mt-1.5 flex items-start gap-1.5 p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="break-words">{item.observacao}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Observações Gerais do Pedido */}
        {order.observacoes_gerais && (
          <div className="p-2.5 rounded-lg bg-neutral-950/90 border border-neutral-800 text-xs text-neutral-300">
            <span className="font-semibold text-neutral-400 block mb-0.5 text-[11px]">
              OBSERVAÇÃO GERAL:
            </span>
            <p className="italic text-neutral-200">{order.observacoes_gerais}</p>
          </div>
        )}
      </div>

      {/* Ações Inferiores (Mudar Status) */}
      <div className="p-3 bg-neutral-950/80 border-t border-neutral-800/80 flex items-center gap-2">
        {/* Botão de Voltar Status (caso erre clique) */}
        {prevStatus && (
          <button
            onClick={() => onStatusChange(order.id, prevStatus)}
            className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 transition-colors"
            title="Voltar status anterior"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {/* Botão Principal de Avanço */}
        {statusDetails.nextStatus && (
          <button
            onClick={() => onStatusChange(order.id, statusDetails.nextStatus!)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all active:scale-[0.98] ${
              order.status === 'recebido'
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/30'
                : order.status === 'em_preparacao'
                ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-900/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30'
            }`}
          >
            <span>{statusDetails.nextLabel}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Se já estiver entregue */}
        {order.status === 'entregue' && (
          <div className="flex-1 text-center py-2 text-xs font-medium text-neutral-500">
            Pedido Concluído e Entregue
          </div>
        )}
      </div>
    </article>
  );
};
