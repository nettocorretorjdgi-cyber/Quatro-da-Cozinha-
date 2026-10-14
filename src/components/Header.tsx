import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Database,
  PlusCircle,
  Archive,
  LayoutGrid,
  ListOrdered,
  RefreshCw,
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { supabaseService } from '../services/supabaseService';

interface HeaderProps {
  currentView: 'kanban' | 'list' | 'delivered';
  onViewChange: (view: 'kanban' | 'list' | 'delivered') => void;
  onOpenSimulator: () => void;
  onOpenSupabaseConfig: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  activeOrdersCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  onOpenSimulator,
  onOpenSupabaseConfig,
  onRefresh,
  isRefreshing = false,
  activeOrdersCount,
}) => {
  const [soundOn, setSoundOn] = useState<boolean>(soundService.isEnabled());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const isSupabaseConfigured = supabaseService.isConfigured();

  // Clock in header
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggleSound = () => {
    const newState = soundService.toggle();
    setSoundOn(newState);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800">
      {/* Zone 1: Brand Wordmark (Single text element wordmark, single-line) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm tracking-wider">
            KDS
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-neutral-100 whitespace-nowrap block">
              Painel da Cozinha
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: Navigation views (Single-line controls) */}
      <nav className="flex items-center gap-1.5 p-1 bg-neutral-950/70 rounded-xl border border-neutral-800 shrink-0">
        <button
          onClick={() => onViewChange('kanban')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 ${
            currentView === 'kanban'
              ? 'bg-neutral-800 text-amber-300 shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
          title="Visualização em colunas por status"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Quadro de Pedidos</span>
          {activeOrdersCount > 0 && (
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded">
              {activeOrdersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onViewChange('list')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 ${
            currentView === 'list'
              ? 'bg-neutral-800 text-amber-300 shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
          title="Lista contínua de pedidos por ordem de chegada"
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Fila Contínua</span>
        </button>

        <button
          onClick={() => onViewChange('delivered')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 ${
            currentView === 'delivered'
              ? 'bg-neutral-800 text-amber-300 shadow-sm border border-neutral-700'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
          title="Histórico de pedidos já entregues"
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Histórico Entregues</span>
        </button>
      </nav>

      {/* Zone 3: Actions and tools */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Relógio Digital KDS */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-950/60 border border-neutral-800/80 text-xs font-mono tabular-nums text-neutral-300">
          <span className="text-neutral-500 text-[10px]">HORA</span>
          <span className="font-semibold text-neutral-100">{currentTime || '--:--:--'}</span>
        </div>

        {/* Atualizar manual */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors border border-transparent hover:border-neutral-700"
          title="Sincronizar pedidos agora"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
        </button>

        {/* Som da Cozinha */}
        <button
          onClick={handleToggleSound}
          className={`p-2 rounded-lg transition-colors border ${
            soundOn
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
              : 'text-neutral-500 hover:text-neutral-300 bg-neutral-800/60 border-neutral-700 hover:bg-neutral-800'
          }`}
          title={soundOn ? 'Alerta sonoro ativado (Clique para silenciar)' : 'Alerta sonoro mudo (Clique para ativar)'}
        >
          {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Conexão com Supabase */}
        <button
          onClick={onOpenSupabaseConfig}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all border whitespace-nowrap shrink-0 ${
            isSupabaseConfigured
              ? 'text-emerald-400 bg-emerald-950/40 border-emerald-700/50 hover:bg-emerald-900/40'
              : 'text-amber-300 bg-amber-950/30 border-amber-700/40 hover:bg-amber-900/40'
          }`}
          title="Gerenciar conexão com o banco de dados Supabase"
        >
          <Database className="w-3.5 h-3.5" />
          <span>{isSupabaseConfigured ? 'Supabase Conectado' : 'Configurar Supabase'}</span>
        </button>

        {/* Tela Cheia para monitores de cozinha */}
        <button
          onClick={handleToggleFullscreen}
          className="hidden sm:flex p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors border border-transparent hover:border-neutral-700"
          title={isFullscreen ? 'Sair da tela cheia' : 'Entrar em modo tela cheia (ideal para TV/Tablet de cozinha)'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* CTA Primário: Simulador do Totem de Autoatendimento */}
        <button
          onClick={onOpenSimulator}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] rounded-lg transition-all shadow-sm shadow-amber-500/20 whitespace-nowrap shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Simular Pedido do Totem</span>
        </button>
      </div>
    </header>
  );
};
