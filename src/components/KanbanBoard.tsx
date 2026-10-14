import React from 'react';
import { Inbox, Flame, CheckCircle2 } from 'lucide-react';
import { KitchenOrder, OrderStatus } from '../types/kitchen';
import { OrderCard } from './OrderCard';

interface KanbanBoardProps {
  orders: KitchenOrder[];
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onToggleItem: (orderId: string, itemId: string) => void;
  onPrintTicket: (order: KitchenOrder) => void;
  onDeleteOrder: (orderId: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  orders,
  onStatusChange,
  onToggleItem,
  onPrintTicket,
  onDeleteOrder,
}) => {
  const recebidos = orders.filter((o) => o.status === 'recebido');
  const emPreparacao = orders.filter((o) => o.status === 'em_preparacao');
  const prontos = orders.filter((o) => o.status === 'pronto');

  const columns = [
    {
      id: 'recebido' as OrderStatus,
      title: 'Recebidos',
      subtitle: 'Aguardando preparo',
      icon: Inbox,
      orders: recebidos,
      headerBadge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      borderTone: 'border-blue-900/40',
    },
    {
      id: 'em_preparacao' as OrderStatus,
      title: 'Em Preparação',
      subtitle: 'Em produção na cozinha',
      icon: Flame,
      orders: emPreparacao,
      headerBadge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      borderTone: 'border-amber-900/40',
    },
    {
      id: 'pronto' as OrderStatus,
      title: 'Prontos para Retirada',
      subtitle: 'Disponíveis no balcão',
      icon: CheckCircle2,
      orders: prontos,
      headerBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      borderTone: 'border-emerald-900/40',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 items-start">
      {columns.map((col) => {
        const Icon = col.icon;
        return (
          <section
            key={col.id}
            className="flex flex-col bg-neutral-950/60 rounded-2xl border border-neutral-800 p-4 min-h-[500px]"
          >
            {/* Column Header */}
            <header className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg border ${col.headerBadge}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                    <span>{col.title}</span>
                    <span className="font-mono text-xs tabular-nums text-neutral-400">
                      ({col.orders.length})
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">{col.subtitle}</p>
                </div>
              </div>
            </header>

            {/* Column Order Cards */}
            <div className="space-y-4 flex-1">
              {col.orders.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 p-6 text-center">
                  <Icon className="w-8 h-8 text-neutral-700 mb-2 stroke-[1.5]" />
                  <p className="text-xs font-medium text-neutral-500">
                    Nenhum pedido nesta etapa
                  </p>
                  <p className="text-[11px] text-neutral-600 mt-1 max-w-[200px]">
                    Novos pedidos enviados pelo totem aparecerão aqui automaticamente.
                  </p>
                </div>
              ) : (
                col.orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={onStatusChange}
                    onToggleItem={onToggleItem}
                    onPrintTicket={onPrintTicket}
                    onDeleteOrder={onDeleteOrder}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};
