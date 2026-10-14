import React, { useState } from 'react';
import { Archive, Search, RotateCcw, Printer, Clock, CheckCircle } from 'lucide-react';
import { KitchenOrder, OrderStatus } from '../types/kitchen';
import { formatDateTime, getElapsedMinutes } from '../utils/formatters';

interface DeliveredOrdersViewProps {
  orders: KitchenOrder[];
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onPrintTicket: (order: KitchenOrder) => void;
}

export const DeliveredOrdersView: React.FC<DeliveredOrdersViewProps> = ({
  orders,
  onStatusChange,
  onPrintTicket,
}) => {
  const [search, setSearch] = useState('');

  const delivered = orders
    .filter((o) => o.status === 'entregue')
    .sort(
      (a, b) =>
        new Date(b.entregue_em || b.atualizado_em || b.criado_em).getTime() -
        new Date(a.entregue_em || a.atualizado_em || a.criado_em).getTime()
    );

  const filtered = delivered.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.numero_pedido.toLowerCase().includes(q) ||
      (o.cliente_nome && o.cliente_nome.toLowerCase().includes(q)) ||
      o.itens.some((i) => i.nome.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header da seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
            <Archive className="w-5 h-5 text-amber-400" />
            <span>Histórico de Pedidos Entregues</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Pedidos que foram finalizados na cozinha e retirados pelos clientes no balcão.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pedido ou cliente entregue..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-900 rounded-lg border border-neutral-800 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40">
          <Archive className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-neutral-300">Nenhum pedido entregue encontrado</h4>
          <p className="text-xs text-neutral-500 mt-1">
            Quando os pedidos forem marcados como &quot;Entregue&quot;, eles ficarão arquivados nesta seção.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const prepMinutes = order.pronto_em
              ? Math.max(0, Math.floor((new Date(order.pronto_em).getTime() - new Date(order.criado_em).getTime()) / 60000))
              : getElapsedMinutes(order.criado_em);

            return (
              <div
                key={order.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Order ID */}
                  <div className="w-16 text-center">
                    <span className="font-mono text-xl font-black text-neutral-200 block">
                      {order.numero_pedido}
                    </span>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                      {order.tipo_entrega === 'para_viagem' ? 'Viagem' : 'Local'}
                    </span>
                  </div>

                  {/* Detalhes */}
                  <div>
                    <div className="flex items-center gap-2 text-xs text-neutral-300 font-semibold">
                      <span>{order.cliente_nome || 'Cliente Totem'}</span>
                      <span aria-hidden="true" className="text-neutral-600">·</span>
                      <span className="text-neutral-400 font-normal">{order.totem_origem || 'Totem'}</span>
                    </div>

                    <div className="text-xs text-neutral-400 mt-1">
                      {order.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(' · ')}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-neutral-500 mt-2 font-mono tabular-nums">
                      <span>Criado: {formatDateTime(order.criado_em)}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle className="w-3 h-3" />
                        Tempo de preparo: {prepMinutes} min
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => onPrintTicket(order)}
                    className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors border border-neutral-800"
                    title="Imprimir comanda"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onStatusChange(order.id, 'pronto')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors"
                    title="Reverter para status 'Pronto'"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Voltar para Pronto</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
