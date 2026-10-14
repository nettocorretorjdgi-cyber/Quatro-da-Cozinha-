import React from 'react';
import { KitchenOrder, OrderStatus } from '../types/kitchen';
import { OrderCard } from './OrderCard';

interface OrderListViewProps {
  orders: KitchenOrder[];
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onToggleItem: (orderId: string, itemId: string) => void;
  onPrintTicket: (order: KitchenOrder) => void;
  onDeleteOrder: (orderId: string) => void;
}

export const OrderListView: React.FC<OrderListViewProps> = ({
  orders,
  onStatusChange,
  onToggleItem,
  onPrintTicket,
  onDeleteOrder,
}) => {
  // Sort by created time ascending (oldest first, so kitchen handles oldest orders first)
  const sorted = [...orders]
    .filter((o) => o.status !== 'entregue')
    .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime());

  if (sorted.length === 0) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-500">
          ✓
        </div>
        <h3 className="text-sm font-bold text-neutral-200">Fila da cozinha zerada!</h3>
        <p className="text-xs text-neutral-400 mt-1">
          Todos os pedidos foram atendidos. Simule novos pedidos do totem para continuar.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between text-xs text-neutral-400">
        <span>Ordenado por tempo de espera (mais antigo para o mais recente)</span>
        <span className="font-mono tabular-nums">{sorted.length} pedidos na fila ativa</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sorted.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onStatusChange={onStatusChange}
            onToggleItem={onToggleItem}
            onPrintTicket={onPrintTicket}
            onDeleteOrder={onDeleteOrder}
          />
        ))}
      </div>
    </div>
  );
};
