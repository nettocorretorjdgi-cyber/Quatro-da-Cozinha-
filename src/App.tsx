/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { MetricsBar } from './components/MetricsBar';
import { KanbanBoard } from './components/KanbanBoard';
import { OrderListView } from './components/OrderListView';
import { DeliveredOrdersView } from './components/DeliveredOrdersView';
import { KioskSimulatorModal } from './components/KioskSimulatorModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { TicketPrintModal } from './components/TicketPrintModal';
import { KitchenOrder, OrderStatus } from './types/kitchen';
import { supabaseService } from './services/supabaseService';
import { soundService } from './services/soundService';
import { getElapsedMinutes } from './utils/formatters';
import { Bell, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning';
  title: string;
  description?: string;
}

export default function App() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'kanban' | 'list' | 'delivered'>('kanban');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'delayed'>('all');

  // Modals
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isSupabaseConfigOpen, setIsSupabaseConfigOpen] = useState<boolean>(false);
  const [ticketToPrint, setTicketToPrint] = useState<KitchenOrder | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'info' | 'success' | 'warning', title: string, description?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Fetch initial orders
  const loadOrders = useCallback(async (quiet: boolean = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const data = await supabaseService.fetchOrders();
      setOrders(data);
    } catch (err) {
      console.warn('Erro ao carregar pedidos:', err);
    } finally {
      setLoading(false);
      if (!quiet) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(false);
  }, [loadOrders]);

  // Supabase Realtime channel subscription + Poller fallback
  useEffect(() => {
    const unsubscribe = supabaseService.subscribeToRealtime((payload) => {
      if (payload.eventType === 'INSERT') {
        setOrders((prev) => {
          if (prev.some((o) => o.id === payload.record.id || o.numero_pedido === payload.record.numero_pedido)) {
            return prev;
          }
          return [payload.record, ...prev];
        });
        soundService.playNewOrderChime();
        addToast(
          'info',
          `Novo Pedido ${payload.record.numero_pedido}`,
          `${payload.record.cliente_nome || 'Cliente'} (${payload.record.totem_origem || 'Totem'})`
        );
      } else if (payload.eventType === 'UPDATE') {
        setOrders((prev) =>
          prev.map((o) => (o.id === payload.record.id ? payload.record : o))
        );
      } else if (payload.eventType === 'DELETE' && payload.oldId) {
        setOrders((prev) => prev.filter((o) => o.id !== payload.oldId));
      }
    });

    // Background sync check every 20 seconds
    const interval = setInterval(() => {
      loadOrders(true);
    }, 20000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [loadOrders, addToast]);

  // Periodic alert check for orders overdue (>15min)
  useEffect(() => {
    const checkOverdue = () => {
      const hasOverdue = orders.some(
        (o) => o.status !== 'entregue' && getElapsedMinutes(o.criado_em) >= 15
      );
      if (hasOverdue) {
        // play alert quietly
      }
    };

    const overdueTimer = setInterval(checkOverdue, 45000);
    return () => clearInterval(overdueTimer);
  }, [orders]);

  // Handlers for Status Change
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    // Optimistic UI update
    const previousOrder = orders.find((o) => o.id === orderId);
    if (!previousOrder) return;

    soundService.playStatusChange();

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const now = new Date().toISOString();
          return {
            ...o,
            status: newStatus,
            atualizado_em: now,
            iniciado_em: newStatus === 'em_preparacao' && !o.iniciado_em ? now : o.iniciado_em,
            pronto_em: newStatus === 'pronto' && !o.pronto_em ? now : o.pronto_em,
            entregue_em: newStatus === 'entregue' && !o.entregue_em ? now : o.entregue_em,
          };
        }
        return o;
      })
    );

    const statusLabels: Record<OrderStatus, string> = {
      recebido: 'Recebido',
      em_preparacao: 'Em Preparação',
      pronto: 'Pronto para Retirada',
      entregue: 'Entregue ao Cliente',
    };

    addToast(
      'success',
      `Pedido ${previousOrder.numero_pedido}`,
      `Status atualizado para: ${statusLabels[newStatus]}`
    );

    await supabaseService.updateOrderStatus(orderId, newStatus);
  };

  // Toggle item check state
  const handleToggleItem = async (orderId: string, itemId: string) => {
    soundService.playStatusChange();

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          return {
            ...order,
            itens: order.itens.map((item) =>
              item.id === itemId ? { ...item, concluido: !item.concluido } : item
            ),
          };
        }
        return order;
      })
    );

    await supabaseService.toggleOrderItemChecked(orderId, itemId);
  };

  // Create new order (From Totem Simulator)
  const handleCreateOrder = async (orderData: Omit<KitchenOrder, 'id'>) => {
    const created = await supabaseService.createOrder(orderData);
    setOrders((prev) => [created, ...prev]);
    soundService.playNewOrderChime();
    addToast(
      'info',
      `Novo Pedido ${created.numero_pedido} Registrado!`,
      `Recebido de ${created.totem_origem || 'Totem'} com ${created.itens.length} itens.`
    );
  };

  // Delete order
  const handleDeleteOrder = async (orderId: string) => {
    const ord = orders.find((o) => o.id === orderId);
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    await supabaseService.deleteOrder(orderId);
    addToast('warning', 'Pedido Removido', ord ? `Pedido ${ord.numero_pedido} foi excluído.` : undefined);
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = o.numero_pedido.toLowerCase().includes(q);
        const matchesClient = o.cliente_nome && o.cliente_nome.toLowerCase().includes(q);
        const matchesItem = o.itens.some((i) => i.nome.toLowerCase().includes(q));
        if (!matchesNum && !matchesClient && !matchesItem) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && o.status !== statusFilter) {
        return false;
      }

      // Urgency filter
      if (urgencyFilter === 'delayed') {
        if (o.status === 'entregue') return false;
        if (getElapsedMinutes(o.criado_em) < 15) return false;
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, urgencyFilter]);

  const activeOrdersCount = orders.filter((o) => o.status !== 'entregue').length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* KDS Header (Strict Top Bar Contract) */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
        onRefresh={() => loadOrders(false)}
        isRefreshing={isRefreshing}
        activeOrdersCount={activeOrdersCount}
      />

      {/* Metrics Bar & Search Controls */}
      {currentView !== 'delivered' && (
        <MetricsBar
          orders={orders}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          urgencyFilter={urgencyFilter}
          onUrgencyFilterChange={setUrgencyFilter}
        />
      )}

      {/* Main Viewport Content */}
      <main className="flex-1 overflow-x-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
            <p className="text-xs text-neutral-400 font-mono">
              Carregando pedidos da cozinha...
            </p>
          </div>
        ) : currentView === 'kanban' ? (
          <KanbanBoard
            orders={filteredOrders}
            onStatusChange={handleStatusChange}
            onToggleItem={handleToggleItem}
            onPrintTicket={(order) => setTicketToPrint(order)}
            onDeleteOrder={handleDeleteOrder}
          />
        ) : currentView === 'list' ? (
          <OrderListView
            orders={filteredOrders}
            onStatusChange={handleStatusChange}
            onToggleItem={handleToggleItem}
            onPrintTicket={(order) => setTicketToPrint(order)}
            onDeleteOrder={handleDeleteOrder}
          />
        ) : (
          <DeliveredOrdersView
            orders={orders}
            onStatusChange={handleStatusChange}
            onPrintTicket={(order) => setTicketToPrint(order)}
          />
        )}
      </main>

      {/* Modals */}
      <KioskSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onCreateOrder={handleCreateOrder}
      />

      <SupabaseConfigModal
        isOpen={isSupabaseConfigOpen}
        onClose={() => setIsSupabaseConfigOpen(false)}
        orders={orders}
        onConfigSaved={() => loadOrders(false)}
      />

      <TicketPrintModal
        order={ticketToPrint}
        onClose={() => setTicketToPrint(null)}
      />

      {/* Toast Notifications Overlay */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-xl flex items-start gap-3 backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'bg-neutral-900/95 border-emerald-500/40 text-emerald-300'
                : toast.type === 'warning'
                ? 'bg-neutral-900/95 border-rose-500/40 text-rose-300'
                : 'bg-neutral-900/95 border-amber-500/40 text-amber-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : toast.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <Bell className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <span className="font-bold text-neutral-100 block">{toast.title}</span>
              {toast.description && (
                <span className="text-neutral-400 mt-0.5 block leading-relaxed">
                  {toast.description}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
