import { OrderStatus } from '../types/kitchen';

export function normalizeOrderStatus(raw: unknown): OrderStatus {
  if (raw === null || raw === undefined) return 'recebido';
  const clean = String(raw).trim().toLowerCase();

  if (
    clean === 'em_preparacao' ||
    clean === 'em preparação' ||
    clean === 'em preparacao' ||
    clean === 'em_preparo' ||
    clean === 'em preparo' ||
    clean === 'preparando' ||
    clean === 'in_progress' ||
    clean === 'preparing' ||
    clean === 'producao' ||
    clean === 'produção' ||
    clean === 'cozinha' ||
    clean === '2'
  ) {
    return 'em_preparacao';
  }

  if (
    clean === 'pronto' ||
    clean === 'prontos' ||
    clean === 'ready' ||
    clean === 'balcao' ||
    clean === 'balcão' ||
    clean === 'disponivel' ||
    clean === 'disponível' ||
    clean === '3'
  ) {
    return 'pronto';
  }

  if (
    clean === 'entregue' ||
    clean === 'entregues' ||
    clean === 'concluido' ||
    clean === 'concluído' ||
    clean === 'finalizado' ||
    clean === 'delivered' ||
    clean === 'retirado' ||
    clean === '4'
  ) {
    return 'entregue';
  }

  return 'recebido';
}

export function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return '--/-- às --:--';
  }
}

export function getElapsedMinutes(isoString: string): number {
  try {
    const created = new Date(isoString).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - created) / 60000));
  } catch {
    return 0;
  }
}

export function formatElapsedTime(isoString: string): string {
  try {
    const created = new Date(isoString).getTime();
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - created) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  } catch {
    return '0m 00s';
  }
}

export interface UrgencyInfo {
  level: 'normal' | 'warning' | 'critical';
  label: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
}

export function getOrderUrgency(isoString: string, status: OrderStatus): UrgencyInfo {
  if (status === 'entregue') {
    return {
      level: 'normal',
      label: 'Entregue',
      badgeBg: 'bg-neutral-800',
      textColor: 'text-neutral-400',
      borderColor: 'border-neutral-700',
    };
  }

  const mins = getElapsedMinutes(isoString);

  if (mins >= 15) {
    return {
      level: 'critical',
      label: 'Atrasado (>15 min)',
      badgeBg: 'bg-rose-950/70',
      textColor: 'text-rose-400',
      borderColor: 'border-rose-500/60',
    };
  }

  if (mins >= 8) {
    return {
      level: 'warning',
      label: 'Atenção (8-15 min)',
      badgeBg: 'bg-amber-950/70',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/60',
    };
  }

  return {
    level: 'normal',
    label: 'No prazo (<8 min)',
    badgeBg: 'bg-emerald-950/50',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-600/40',
  };
}

export function getStatusDetails(status: OrderStatus) {
  switch (status) {
    case 'recebido':
      return {
        label: 'Recebido',
        description: 'Aguardando início do preparo',
        accentBg: 'bg-blue-500/10',
        textColor: 'text-blue-400',
        borderColor: 'border-blue-500/30',
        nextStatus: 'em_preparacao' as OrderStatus,
        nextLabel: 'Iniciar Preparo',
      };
    case 'em_preparacao':
      return {
        label: 'Em Preparação',
        description: 'Pedido em produção na cozinha',
        accentBg: 'bg-amber-500/10',
        textColor: 'text-amber-400',
        borderColor: 'border-amber-500/40',
        nextStatus: 'pronto' as OrderStatus,
        nextLabel: 'Marcar como Pronto',
      };
    case 'pronto':
      return {
        label: 'Pronto',
        description: 'Disponível para retirada no balcão',
        accentBg: 'bg-emerald-500/10',
        textColor: 'text-emerald-400',
        borderColor: 'border-emerald-500/40',
        nextStatus: 'entregue' as OrderStatus,
        nextLabel: 'Entregar ao Cliente',
      };
    case 'entregue':
      return {
        label: 'Entregue',
        description: 'Pedido retirado pelo cliente',
        accentBg: 'bg-neutral-800/50',
        textColor: 'text-neutral-400',
        borderColor: 'border-neutral-700',
        nextStatus: null,
        nextLabel: '',
      };
  }
}
