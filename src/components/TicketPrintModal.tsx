import React from 'react';
import { X, Printer, Check } from 'lucide-react';
import { KitchenOrder } from '../types/kitchen';
import { formatDateTime } from '../utils/formatters';

interface TicketPrintModalProps {
  order: KitchenOrder | null;
  onClose: () => void;
}

export const TicketPrintModal: React.FC<TicketPrintModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-neutral-100">
              Comanda da Cozinha (Impressão)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Realistic Thermal Receipt Slip */}
        <div className="p-6 bg-neutral-950 flex justify-center">
          <div
            id="kitchen-ticket-printable"
            className="w-full max-w-[320px] bg-white text-black p-5 rounded font-mono text-xs shadow-lg leading-tight select-text"
          >
            <div className="text-center pb-3 border-b-2 border-dashed border-black">
              <h2 className="text-lg font-black tracking-tight">KDS COZINHA</h2>
              <p className="text-[10px]">TOTEM AUTOATENDIMENTO</p>
              <div className="mt-2 text-3xl font-black">{order.numero_pedido}</div>
              <p className="text-[11px] font-bold mt-1 uppercase">
                {order.tipo_entrega === 'para_viagem' ? 'PARA VIAGEM' : 'COMER NO LOCAL'}
              </p>
            </div>

            <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>CLIENTE:</span>
                <span className="font-bold">{order.cliente_nome || 'NÃO INFORMADO'}</span>
              </div>
              <div className="flex justify-between">
                <span>ORIGEM:</span>
                <span>{order.totem_origem || 'TOTEM 01'}</span>
              </div>
              <div className="flex justify-between">
                <span>DATA/HORA:</span>
                <span>{formatDateTime(order.criado_em)}</span>
              </div>
            </div>

            <div className="py-3 border-b-2 border-dashed border-black space-y-2">
              <div className="text-[11px] font-bold">ITENS DO PEDIDO:</div>
              {order.itens.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-bold text-[12px]">
                    <span>{item.quantidade}x {item.nome}</span>
                  </div>
                  {item.adicionais && item.adicionais.length > 0 && (
                    <div className="text-[10px] pl-3 italic">
                      + {item.adicionais.join(', ')}
                    </div>
                  )}
                  {item.observacao && (
                    <div className="text-[11px] font-black pl-2 py-0.5 bg-neutral-200 mt-0.5">
                      &gt;&gt; OBS: {item.observacao.toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {order.observacoes_gerais && (
              <div className="py-2 border-b border-dashed border-black text-[11px]">
                <span className="font-bold">OBSERVAÇÕES:</span>
                <p className="italic">{order.observacoes_gerais}</p>
              </div>
            )}

            <div className="pt-3 text-center text-[10px] text-neutral-600">
              <p>*** SISTEMA KDS INTEGRADO ***</p>
              <p>Bom trabalho equipe!</p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded-lg bg-neutral-800"
          >
            Fechar
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Comanda</span>
          </button>
        </div>
      </div>
    </div>
  );
};
