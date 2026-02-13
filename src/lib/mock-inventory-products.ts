/** Productos mock para uso en inventario y boletas/facturas (demo) */
export interface MockProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
}

export const MOCK_PRODUCTS: MockProduct[] = [
  { id: "1", name: "Jabón de tocador", category: "Aseo", unit: "unidad" },
  { id: "2", name: "Papel higiénico", category: "Aseo", unit: "rollo" },
  { id: "3", name: "Shampoo", category: "Aseo", unit: "unidad" },
  { id: "4", name: "Toalla grande", category: "Ropa de cama", unit: "unidad" },
  { id: "5", name: "Café molido", category: "Desayuno", unit: "kg" },
];
