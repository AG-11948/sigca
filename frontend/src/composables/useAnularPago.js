import api from '@/services/api';
import { useUiStore } from '@/stores/ui';
import { q } from '@/utils/formato';

/** Anulación autorizada y justificada de un pago (nunca se elimina). */
export function useAnularPago() {
  const ui = useUiStore();
  return async function anular(pago) {
    const motivo = await ui.confirmar({
      titulo: `Anular ${pago.numeroComprobante}`,
      mensaje: `El pago de ${q(pago.montoCentavos)} dejará de contar para el saldo de la cita y para los ingresos de la caja. El registro se conserva como ANULADO.`,
      textoAceptar: 'Anular pago',
      peligro: true,
      campo: 'Motivo de la anulación',
    });
    if (!motivo) return false;
    try {
      const { data } = await api.patch(`/pagos/${pago._id}/anular`, { motivo });
      ui.exito(data.mensaje);
      return true;
    } catch (e) {
      ui.error(e);
      return false;
    }
  };
}
