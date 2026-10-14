import React, { useState } from 'react';
import { X, Plus, Trash2, Sparkles, Send, ShoppingBag, UtensilsCrossed, Monitor } from 'lucide-react';
import { KitchenOrder, OrderItem, DeliveryType } from '../types/kitchen';

interface KioskSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateOrder: (order: Omit<KitchenOrder, 'id'>) => Promise<void>;
}

const PRESET_PRODUCTS = [
  { nome: 'Smash Burger Duplo Cheddar', categoria: 'lanche', preco: 32.90 },
  { nome: 'Classic Cheese Salada Artesanal', categoria: 'lanche', preco: 28.50 },
  { nome: 'Monster Bacon Melt BBQ', categoria: 'lanche', preco: 36.00 },
  { nome: 'Chicken Crispy Spicy', categoria: 'lanche', preco: 29.90 },
  { nome: 'Veggie Burger Grão de Bico', categoria: 'lanche', preco: 31.00 },
  { nome: 'Batata Frita Rústica Grande', categoria: 'acompanhamento', preco: 18.00 },
  { nome: 'Batata Crinkle com Cheddar & Bacon', categoria: 'acompanhamento', preco: 24.00 },
  { nome: 'Onion Rings Crocantes 12un', categoria: 'acompanhamento', preco: 21.00 },
  { nome: 'Refrigerante Cola Zero 400ml', categoria: 'bebida', preco: 8.50 },
  { nome: 'Suco Natural Laranja 500ml', categoria: 'bebida', preco: 11.00 },
  { nome: 'Milkshake de Pistache 400ml', categoria: 'sobremesa', preco: 22.00 },
  { nome: 'Brownie Quente com Sorvete Baunilha', categoria: 'sobremesa', preco: 19.50 },
];

export const KioskSimulatorModal: React.FC<KioskSimulatorModalProps> = ({
  isOpen,
  onClose,
  onCreateOrder,
}) => {
  const [customerName, setCustomerName] = useState('Lucas Silva');
  const [totemOrigem, setTotemOrigem] = useState('Totem 01');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('comer_no_local');
  const [generalNotes, setGeneralNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState<OrderItem[]>([
    {
      id: 'sim-1',
      nome: 'Smash Burger Duplo Cheddar',
      quantidade: 1,
      categoria: 'lanche',
      observacao: 'Ponto da carne: bem passada',
      concluido: false,
    },
    {
      id: 'sim-2',
      nome: 'Batata Frita Rústica Grande',
      quantidade: 1,
      categoria: 'acompanhamento',
      observacao: '',
      concluido: false,
    },
    {
      id: 'sim-3',
      nome: 'Refrigerante Cola Zero 400ml',
      quantidade: 1,
      categoria: 'bebida',
      observacao: 'Gelo e limão',
      concluido: false,
    },
  ]);

  if (!isOpen) return null;

  const handleAddItem = (prod: typeof PRESET_PRODUCTS[0]) => {
    const existingIndex = items.findIndex((i) => i.nome === prod.nome);
    if (existingIndex >= 0) {
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantidade: item.quantidade + 1 } : item
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          nome: prod.nome,
          quantidade: 1,
          categoria: prod.categoria as OrderItem['categoria'],
          observacao: '',
          concluido: false,
        },
      ]);
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateItemObs = (id: string, obs: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, observacao: obs } : i))
    );
  };

  const handleUpdateItemQty = (id: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantidade: qty } : i))
    );
  };

  const loadQuickPreset = (type: 'burger' | 'special_allergy' | 'express_drink') => {
    if (type === 'burger') {
      setCustomerName('Rodrigo Paes');
      setTotemOrigem('Totem 02');
      setDeliveryType('comer_no_local');
      setGeneralNotes('Mesa 08. Entregar talheres.');
      setItems([
        {
          id: `it-${Date.now()}-1`,
          nome: 'Monster Bacon Melt BBQ',
          quantidade: 2,
          categoria: 'lanche',
          observacao: 'SEM CEBOLA em um dos lanches',
          concluido: false,
        },
        {
          id: `it-${Date.now()}-2`,
          nome: 'Batata Crinkle com Cheddar & Bacon',
          quantidade: 1,
          categoria: 'acompanhamento',
          observacao: 'Bacon extra crocante',
          concluido: false,
        },
        {
          id: `it-${Date.now()}-3`,
          nome: 'Refrigerante Cola Zero 400ml',
          quantidade: 2,
          categoria: 'bebida',
          concluido: false,
        },
      ]);
    } else if (type === 'special_allergy') {
      setCustomerName('Dra. Amanda Vianna');
      setTotemOrigem('Totem 01');
      setDeliveryType('para_viagem');
      setGeneralNotes('⚠️ ALERTA DE ALERGIA SEVERA: Separar chapa para montagem.');
      setItems([
        {
          id: `it-${Date.now()}-1`,
          nome: 'Classic Cheese Salada Artesanal',
          quantidade: 1,
          categoria: 'lanche',
          observacao: 'SEM TOMATE, SEM MAIONESE E SEM QUEIJO (Intolerância à lactose)',
          concluido: false,
        },
        {
          id: `it-${Date.now()}-2`,
          nome: 'Suco Natural Laranja 500ml',
          quantidade: 1,
          categoria: 'bebida',
          observacao: 'Sem açúcar e sem gelo',
          concluido: false,
        },
      ]);
    } else {
      setCustomerName('Gabriel Costa');
      setTotemOrigem('Totem 03');
      setDeliveryType('para_viagem');
      setGeneralNotes('Embalar com tampa e canudo biodegradável.');
      setItems([
        {
          id: `it-${Date.now()}-1`,
          nome: 'Milkshake de Pistache 400ml',
          quantidade: 2,
          categoria: 'sobremesa',
          observacao: 'Caprichar na cobertura',
          concluido: false,
        },
        {
          id: `it-${Date.now()}-2`,
          nome: 'Brownie Quente com Sorvete Baunilha',
          quantidade: 1,
          categoria: 'sobremesa',
          concluido: false,
        },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsSubmitting(true);
    try {
      // Generate order number like #106, #107 based on random sequence
      const orderNum = `#${Math.floor(100 + Math.random() * 900)}`;

      await onCreateOrder({
        numero_pedido: orderNum,
        cliente_nome: customerName.trim() || 'Cliente Totem',
        totem_origem: totemOrigem,
        tipo_entrega: deliveryType,
        status: 'recebido',
        itens: items,
        observacoes_gerais: generalNotes.trim() || undefined,
        total: 45.00,
        criado_em: new Date().toISOString(),
      });

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">
                Simulador de Totem de Autoatendimento
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Envie novos pedidos como se fossem gerados pelos totens na entrada da loja.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Presets rápidos */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Modelos Rápidos Pré-configurados:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => loadQuickPreset('burger')}
                className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 text-left text-xs transition-colors"
              >
                <span className="font-semibold text-neutral-200 block">Combo Burger Duplo</span>
                <span className="text-[11px] text-neutral-500">Com obs. de ponto e cebola</span>
              </button>
              <button
                type="button"
                onClick={() => loadQuickPreset('special_allergy')}
                className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-rose-500/50 text-left text-xs transition-colors"
              >
                <span className="font-semibold text-neutral-200 block">Restrição / Alergia</span>
                <span className="text-[11px] text-neutral-500">Sem lactose, sem glúten</span>
              </button>
              <button
                type="button"
                onClick={() => loadQuickPreset('express_drink')}
                className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 text-left text-xs transition-colors"
              >
                <span className="font-semibold text-neutral-200 block">Sobremesas & Shakes</span>
                <span className="text-[11px] text-neutral-500">Pistache & Brownie</span>
              </button>
            </div>
          </div>

          {/* Dados do Cliente e Totem */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Nome do Cliente:
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Totem Emissor:
              </label>
              <select
                value={totemOrigem}
                onChange={(e) => setTotemOrigem(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-amber-500/60"
              >
                <option value="Totem 01">Totem 01 (Entrada Principal)</option>
                <option value="Totem 02">Totem 02 (Salão Central)</option>
                <option value="Totem 03">Totem 03 (Drive/Express)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Tipo de Retirada:
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType('comer_no_local')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                    deliveryType === 'comer_no_local'
                      ? 'bg-neutral-800 text-amber-300 border-neutral-700'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  <span>No Local</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType('para_viagem')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                    deliveryType === 'para_viagem'
                      ? 'bg-neutral-800 text-amber-300 border-neutral-700'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Viagem</span>
                </button>
              </div>
            </div>
          </div>

          {/* Adicionar produtos rápidos */}
          <div>
            <label className="text-xs font-medium text-neutral-400 block mb-1.5">
              Cardápio do Totem (Clique para adicionar):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_PRODUCTS.map((prod) => (
                <button
                  key={prod.nome}
                  type="button"
                  onClick={() => handleAddItem(prod)}
                  className="px-2.5 py-1 text-xs rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 text-neutral-300 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3 text-amber-400" />
                  <span>{prod.nome}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Itens do Pedido */}
          <div>
            <label className="text-xs font-semibold text-neutral-200 block mb-2">
              Itens Selecionados no Totem ({items.length}):
            </label>
            {items.length === 0 ? (
              <p className="text-xs text-neutral-500 italic py-2">
                Nenhum item selecionado. Adicione produtos acima.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex items-center border border-neutral-800 rounded bg-neutral-900">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(item.id, item.quantidade - 1)}
                            className="px-2 py-0.5 text-xs text-neutral-400 hover:text-white"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-mono font-bold text-amber-400">
                            {item.quantidade}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(item.id, item.quantidade + 1)}
                            className="px-2 py-0.5 text-xs text-neutral-400 hover:text-white"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-xs font-semibold text-neutral-200">
                          {item.nome}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-neutral-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Observação específica do item */}
                    <div>
                      <input
                        type="text"
                        value={item.observacao || ''}
                        onChange={(e) => handleUpdateItemObs(item.id, e.target.value)}
                        placeholder="Observação do cliente (ex: Sem cebola, carne bem passada...)"
                        className="w-full px-2.5 py-1 text-xs bg-neutral-900 border border-neutral-800 rounded text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-amber-500/40"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observações Gerais */}
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1">
              Observações Gerais do Pedido (opcional):
            </label>
            <textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Ex: Cliente com mobilidade reduzida, avisar quando pronto..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          {/* Botão de Envio */}
          <div className="pt-2 border-t border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-colors shadow-md shadow-amber-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Enviando Pedido...' : 'Finalizar e Enviar para a Cozinha'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
