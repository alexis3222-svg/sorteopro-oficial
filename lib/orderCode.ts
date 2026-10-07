export function getOrderCode(
    pedidoId: number
) {
    return `B593-${String(pedidoId).padStart(6, "0")}`;
}