// Configuración de los 11 informes del Departamento de Compras (colección 33 de Metabase).
// Define para cada uno qué columnas son KPIs (se suman), las dimensiones de
// desglose, la columna de estado y la métrica principal para los rankings.

export interface ReporteCompras {
  key: string; // slug de URL
  cardId: number;
  label: string;
  descripcion: string;
  grupo: "Decisión de compra" | "Reposición a tienda" | "Stock operativo" | "Pedidos";
  kpis: { col: string; label: string }[];
  estadoCol?: string;
  dims: string[];
  metrica: string;
}

export const REPORTES_COMPRAS: ReporteCompras[] = [
  {
    key: "stock-compras", cardId: 303, label: "Stock para Compras",
    descripcion: "Propuesta de compra por producto: stock, objetivo y unidades a pedir.",
    grupo: "Decisión de compra",
    kpis: [
      { col: "Unidades a Pedir", label: "Unidades a pedir" },
      { col: "stock_total_disponible", label: "Stock disponible" },
      { col: "Reservado (RES)", label: "Reservado" },
    ],
    estadoCol: "Estado", dims: ["Familia", "Proveedor", "Estado", "Tendencia"], metrica: "Unidades a Pedir",
  },
  {
    key: "stock-jewels-district", cardId: 338, label: "Stock TQ Jewels District",
    descripcion: "Propuesta de compra para la plataforma TQ Jewels District.",
    grupo: "Decisión de compra",
    kpis: [
      { col: "Unidades a Pedir", label: "Unidades a pedir" },
      { col: "stock_total_disponible", label: "Stock disponible" },
      { col: "Reservado (RES)", label: "Reservado" },
    ],
    estadoCol: "Estado", dims: ["Familia", "Proveedor", "Estado", "Tendencia"], metrica: "Unidades a Pedir",
  },
  {
    key: "pedidos-proveedores", cardId: 381, label: "Pedidos a Proveedores",
    descripcion: "Propuesta de pedido por proveedor con VMM, ABC y stock objetivo.",
    grupo: "Decisión de compra",
    kpis: [
      { col: "Uds. a Pedir", label: "Unidades a pedir" },
      { col: "Stock Total", label: "Stock total" },
    ],
    estadoCol: "Estado", dims: ["Proveedor", "Metal", "Familia", "ABC", "Estado", "Tendencia"], metrica: "Uds. a Pedir",
  },
  {
    key: "reposicion-seguridad", cardId: 356, label: "Reposición y Stock de Seguridad",
    descripcion: "Reposición por tienda con stock de seguridad y cobertura.",
    grupo: "Reposición a tienda",
    kpis: [
      { col: "Cantidad a Enviar", label: "Cantidad a enviar" },
      { col: "Stock Tienda", label: "Stock en tiendas" },
      { col: "Stock Almacén", label: "Stock almacén" },
    ],
    estadoCol: "Estado", dims: ["Tienda", "Metal", "Familia", "Estado"], metrica: "Cantidad a Enviar",
  },
  {
    key: "reposicion-analisis", cardId: 357, label: "Reposición (Análisis)",
    descripcion: "Análisis de reposición con cluster, ABC, VMM y sobrestock.",
    grupo: "Reposición a tienda",
    kpis: [
      { col: "Cant. Enviar", label: "Cantidad a enviar" },
      { col: "Sobrestock (uds.)", label: "Sobrestock (uds.)" },
    ],
    estadoCol: "Estado", dims: ["Tienda", "Cluster", "Metal", "Familia", "ABC", "Estado"], metrica: "Cant. Enviar",
  },
  {
    key: "reposicion-imprimir", cardId: 358, label: "Reposición (Para imprimir)",
    descripcion: "Reposición solicitada vs asignada por tienda, con desviación de operario.",
    grupo: "Reposición a tienda",
    kpis: [
      { col: "Cant. Solicitada", label: "Solicitada" },
      { col: "Cant. Asignada", label: "Asignada" },
    ],
    estadoCol: "Estado", dims: ["Tienda", "Cluster", "Metal", "Familia", "Estado", "Alerta"], metrica: "Cant. Asignada",
  },
  {
    key: "reposicion-icod", cardId: 359, label: "Reposición Icod",
    descripcion: "Reposición del almacén central de Icod por plataforma.",
    grupo: "Reposición a tienda",
    kpis: [
      { col: "Cant. Solicitada", label: "Solicitada" },
      { col: "Cant. Asignada", label: "Asignada" },
    ],
    estadoCol: "Estado", dims: ["Plataforma", "Metal", "Familia", "Estado", "Alerta"], metrica: "Cant. Asignada",
  },
  {
    key: "stock-tiendas", cardId: 350, label: "Stock por Tiendas",
    descripcion: "Stock por SKU y tienda con promedio de ventas 6M.",
    grupo: "Stock operativo",
    kpis: [
      { col: "Stock Tienda", label: "Stock en tiendas" },
      { col: "Stock Almacén", label: "Stock almacén" },
    ],
    estadoCol: "Estado", dims: ["Tienda", "Metal", "Familia", "Estado"], metrica: "Stock Tienda",
  },
  {
    key: "inventarios-rotativos", cardId: 355, label: "Inventarios Rotativos",
    descripcion: "Stock por categoría/canal con coste unitario ponderado.",
    grupo: "Stock operativo",
    kpis: [{ col: "stock", label: "Stock total" }],
    dims: ["canal", "categoria", "metal"], metrica: "stock",
  },
  {
    key: "descatalogados", cardId: 365, label: "Descatalogados a Retirar",
    descripcion: "Productos descatalogados aún en tienda pendientes de retirar.",
    grupo: "Stock operativo",
    kpis: [
      { col: "Stock Total", label: "Stock total" },
      { col: "Stock Tienda", label: "Stock en tiendas" },
    ],
    estadoCol: "Estado", dims: ["Tienda", "Metal", "Familia", "Estado"], metrica: "Stock Total",
  },
  {
    key: "pedidos-tiendas", cardId: 321, label: "Pedidos de Tiendas",
    descripcion: "Pedidos solicitados por las tiendas con stock disponible.",
    grupo: "Pedidos",
    kpis: [{ col: "Cantidad_Pedida", label: "Cantidad pedida" }],
    dims: ["Metal", "Familia", "Tienda_Destino"], metrica: "Cantidad_Pedida",
  },
];

export const REPORTE_BY_KEY = Object.fromEntries(REPORTES_COMPRAS.map((r) => [r.key, r]));
