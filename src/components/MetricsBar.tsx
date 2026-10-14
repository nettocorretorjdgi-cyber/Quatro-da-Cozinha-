import React from 'react';
import { Clock, AlertTriangle, CheckCircle2, Flame, Inbox, Search, X } from 'lucide-react';
import { KitchenOrder } from '../types/kitchen';
import { getElapsedMinutes } from '../utils/formatters';

interface MetricsBarProps {
  orders: KitchenOrder[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  urgencyFilter: 'all' | 'delayed';
  onUrgencyFilterChange: (filter: 'all' | 'delayed') => void;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  orders,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  urgencyFilter,
  onUrgencyFilterChange,
}) => {
  // Compute metrics
  const activeOrders = orders.filter((o) => o.status !== 'entregue');
  const recebidos = orders.filter((o) => o.status === 'recebido');
  const emPreparo = orders.filter((o) => o.status === 'em_preparacao');
  const prontos = orders.filter((o) => o.status === 'pronto');
  const entregues = orders.filter((o) => o.status === 'entregue');

  const delayedOrders = activeOrders.filter((o) => getElapsedMinutes(o.criado_em) >= 15);

  const avgMinutes = activeOrders.length > 0
    ? Math.round(activeOrders.reduce((acc, curr) => acc + getElapsedMinutes(curr.criado_em), 0) / activeOrders.length)
    : 0;

  return (
    <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* KPI Strip (Real operational data with tabular numerals) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-4 shrink-0">
          {/* Recebidos */}
          <button
            onClick={() => onStatusFilterChange(statusFilter === 'recebido' ? 'all' : 'recebido')}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-left transition-all ${
              statusFilter === 'recebido'
                ? 'bg-blue-950/40 border-blue-500/60'
                : 'bg-neutral-950/40 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400">
              <Inbox className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] text-neutral-400 block font-medium">Aguardando</span>
              <span className="text-sm font-bold font-mono tabular-nums text-neutral-100">{recebidos.length}</span>
            </div>
          </button>

          {/* Em Preparação */}
          <button
            onClick={() => onStatusFilterChange(statusFilter === 'em_preparacao' ? 'all' : 'em_preparacao')}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-left transition-all ${
              statusFilter === 'em_preparacao'
                ? 'bg-amber-950/40 border-amber-500/60'
                : 'bg-neutral-950/40 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
              <Flame className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] text-neutral-400 block font-medium">Em Preparo</span>
              <span className="text-sm font-bold font-mono tabular-nums text-neutral-100">{emPreparo.length}</span>
            </div>
          </button>

          {/* Prontos */}
          <button
            onClick={() => onStatusFilterChange(statusFilter === 'pronto' ? 'all' : 'pronto')}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-left transition-all ${
              statusFilter === 'pronto'
                ? 'bg-emerald-950/40 border-emerald-500/60'
                : 'bg-neutral-950/40 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] text-neutral-400 block font-medium">Prontos</span>
              <span className="text-sm font-bold font-mono tabular-nums text-neutral-100">{prontos.length}</span>
            </div>
          </button>

          {/* Atrasados Alert */}
          <button
            onClick={() => onUrgencyFilterChange(urgencyFilter === 'delayed' ? 'all' : 'delayed')}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-left transition-all ${
              urgencyFilter === 'delayed'
                ? 'bg-rose-950/60 border-rose-500'
                : delayedOrders.length > 0
                ? 'bg-rose-950/20 border-rose-900/60 hover:border-rose-700'
                : 'bg-neutral-950/40 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className={`p-1.5 rounded-md ${delayedOrders.length > 0 ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-neutral-800 text-neutral-500'}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] text-neutral-400 block font-medium">Atrasados (&gt;15m)</span>
              <span className={`text-sm font-bold font-mono tabular-nums ${delayedOrders.length > 0 ? 'text-rose-400' : 'text-neutral-300'}`}>
                {delayedOrders.length}
              </span>
            </div>
          </button>

          {/* Tempo Médio */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-neutral-950/40 border border-neutral-800">
            <div className="p-1.5 rounded-md bg-neutral-800 text-neutral-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] text-neutral-400 block font-medium">Tempo Médio</span>
              <span className="text-sm font-bold font-mono tabular-nums text-neutral-200">
                {avgMinutes} min
              </span>
            </div>
          </div>
        </div>

        {/* Search & Active Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por nº pedido ou cliente..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-neutral-950 rounded-lg border border-neutral-800 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {(statusFilter !== 'all' || urgencyFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                onStatusFilterChange('all');
                onUrgencyFilterChange('all');
                onSearchChange('');
              }}
              className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 whitespace-nowrap shrink-0"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
