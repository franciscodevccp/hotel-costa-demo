"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  X,
  FileText,
} from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";

export interface InventoryProduct {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  entradas: number;
  salidas: number;
  folio?: string;
}

const MOCK_INITIAL_PRODUCTS: InventoryProduct[] = [
  {
    id: "1",
    name: "Jabón de tocador",
    category: "Aseo",
    stock: 12,
    minStock: 20,
    unit: "unidad",
    entradas: 50,
    salidas: 38,
    folio: "B-0001",
  },
  {
    id: "2",
    name: "Papel higiénico",
    category: "Aseo",
    stock: 8,
    minStock: 15,
    unit: "rollo",
    entradas: 30,
    salidas: 22,
    folio: "B-0001",
  },
  {
    id: "3",
    name: "Shampoo",
    category: "Aseo",
    stock: 45,
    minStock: 10,
    unit: "unidad",
    entradas: 60,
    salidas: 15,
    folio: "F-0002",
  },
  {
    id: "4",
    name: "Toalla grande",
    category: "Ropa de cama",
    stock: 25,
    minStock: 30,
    unit: "unidad",
    entradas: 40,
    salidas: 15,
    folio: "F-0002",
  },
  {
    id: "5",
    name: "Café molido",
    category: "Desayuno",
    stock: 3,
    minStock: 10,
    unit: "kg",
    entradas: 8,
    salidas: 5,
    folio: "B-0003",
  },
];

type StockFilter = "" | "more" | "less";

export function InventoryView() {
  const [products, setProducts] = useState<InventoryProduct[]>(MOCK_INITIAL_PRODUCTS);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState<{
    product: InventoryProduct;
    type: "entrada" | "salida";
  } | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>("");
  const [search, setSearch] = useState("");
  const [showLowStockAlert, setShowLowStockAlert] = useState(true);

  // Formulario agregar producto
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "Aseo",
    stock: 0,
    minStock: 5,
    unit: "unidad",
  });

  // Formulario movimiento
  const [movementQty, setMovementQty] = useState(0);
  const [movementFolio, setMovementFolio] = useState("");

  const lowStockProducts = products.filter((p) => p.stock < p.minStock);
  const hasLowStock = lowStockProducts.length > 0;

  // Alerta de bajo stock al entrar (demo: se muestra al montar el componente)
  useEffect(() => {
    if (hasLowStock) {
      setShowLowStockAlert(true);
    }
  }, [hasLowStock]);

  // Filtrar productos
  let filtered = [...products];
  if (stockFilter === "more") {
    filtered = filtered.sort((a, b) => b.stock - a.stock);
  } else if (stockFilter === "less") {
    filtered = filtered.sort((a, b) => a.stock - b.stock);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name.trim()) return;
    const product: InventoryProduct = {
      id: String(Date.now()),
      name: newProduct.name.trim(),
      category: newProduct.category,
      stock: newProduct.stock,
      minStock: newProduct.minStock,
      unit: newProduct.unit,
      entradas: newProduct.stock,
      salidas: 0,
      folio: undefined,
    };
    setProducts((prev) => [...prev, product]);
    setNewProduct({ name: "", category: "Aseo", stock: 0, minStock: 5, unit: "unidad" });
    setShowAddProduct(false);
  };

  const handleMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMovementModal || movementQty <= 0) return;
    const { product, type } = showMovementModal;
    const folioToSave = movementFolio.trim() || undefined;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== product.id) return p;
        const qty = type === "entrada" ? movementQty : -movementQty;
        const newStock = Math.max(0, p.stock + qty);
        return {
          ...p,
          stock: newStock,
          entradas: type === "entrada" ? p.entradas + movementQty : p.entradas,
          salidas: type === "salida" ? p.salidas + movementQty : p.salidas,
          folio: folioToSave ?? p.folio,
        };
      })
    );
    setShowMovementModal(null);
    setMovementQty(0);
    setMovementFolio("");
  };

  return (
    <div className="space-y-6">
      {/* Alerta de bajo stock */}
      {hasLowStock && showLowStockAlert && (
        <div
          role="alert"
          className="relative overflow-hidden rounded-xl border border-[var(--warning)]/30 bg-gradient-to-br from-[var(--warning)]/5 via-[var(--card)] to-[var(--warning)]/5 p-5 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--warning)]/15 shadow-inner">
              <AlertTriangle className="h-5 w-5 text-[var(--warning)]" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--foreground)]">
                Productos con stock bajo
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Los siguientes productos están por debajo del mínimo recomendado:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {lowStockProducts.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--warning)]/25 bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-sm"
                  >
                    <Package className="h-3.5 w-3.5 text-[var(--warning)]" />
                    {p.name}
                    <span className="rounded bg-[var(--warning)]/15 px-1.5 py-0.5 font-semibold text-[var(--warning)]">
                      {p.stock} {p.unit}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowLowStockAlert(false)}
              className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)]"
              aria-label="Cerrar alerta"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Inventario
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Gestiona productos, entradas y salidas. Stock en tiempo real (demo).
          </p>
        </div>
        <button
          onClick={() => setShowAddProduct(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 w-full md:w-auto"
        >
          <Plus className="h-4 w-4" />
          Agregar producto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Buscar por nombre o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <CustomSelect
          value={stockFilter}
          onChange={(v) => setStockFilter(v as StockFilter)}
          placeholder="Ordenar por stock"
          options={[
            { value: "more", label: "Más stock primero" },
            { value: "less", label: "Menos stock primero" },
          ]}
          className="min-w-[180px]"
        />
      </div>

      {/* Tabla de productos */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background)]">
              <th className="px-4 py-3 font-medium text-[var(--foreground)]">Producto</th>
              <th className="px-4 py-3 font-medium text-[var(--foreground)]">Categoría</th>
              <th className="px-4 py-3 font-medium text-[var(--foreground)]">Stock</th>
              <th className="px-4 py-3 font-medium text-[var(--foreground)]">Folio / Factura</th>
              <th className="px-4 py-3 font-medium text-[var(--foreground)]">Entradas</th>
              <th className="px-4 py-3 font-medium text-[var(--foreground)]">Salidas</th>
              <th className="px-4 py-3 font-medium text-[var(--foreground)]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[var(--muted)]">
                  No hay productos que coincidan con los filtros
                </td>
              </tr>
            ) : (
              filtered.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                        <Package className="h-4 w-4 text-[var(--primary)]" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{product.name}</p>
                        <p className="text-xs text-[var(--muted)]">
                          Mín: {product.minStock} {product.unit}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{product.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        product.stock < product.minStock
                          ? "bg-[var(--destructive)]/10 text-[var(--destructive)]"
                          : "bg-[var(--success)]/10 text-[var(--success)]"
                      }`}
                    >
                      {product.stock} {product.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {product.folio ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-2.5 py-1 text-xs font-medium text-[var(--primary)]">
                        <FileText className="h-3.5 w-3.5" />
                        {product.folio}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--success)]">{product.entradas}</td>
                  <td className="px-4 py-3 text-[var(--destructive)]">{product.salidas}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setShowMovementModal({ product, type: "entrada" })
                        }
                        className="flex items-center gap-1 rounded-md border border-[var(--success)]/50 bg-[var(--success)]/5 px-2 py-1 text-xs font-medium text-[var(--success)] hover:bg-[var(--success)]/10"
                        title="Registrar entrada"
                      >
                        <ArrowDownCircle className="h-3.5 w-3.5" />
                        Entrada
                      </button>
                      <button
                        onClick={() =>
                          setShowMovementModal({ product, type: "salida" })
                        }
                        className="flex items-center gap-1 rounded-md border border-[var(--destructive)]/50 bg-[var(--destructive)]/5 px-2 py-1 text-xs font-medium text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                        title="Registrar salida"
                      >
                        <ArrowUpCircle className="h-3.5 w-3.5" />
                        Salida
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal agregar producto */}
      {showAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Agregar producto
            </h3>
            <form onSubmit={handleAddProduct} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                  Nombre
                </label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Ej. Jabón líquido"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                  Categoría
                </label>
                <CustomSelect
                  value={newProduct.category}
                  onChange={(v) =>
                    setNewProduct((p) => ({ ...p, category: v }))
                  }
                  placeholder="Seleccionar categoría"
                  options={[
                    { value: "Aseo", label: "Aseo" },
                    { value: "Ropa de cama", label: "Ropa de cama" },
                    { value: "Desayuno", label: "Desayuno" },
                    { value: "Otros", label: "Otros" },
                  ]}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                    Stock inicial
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newProduct.stock || ""}
                    onChange={(e) =>
                      setNewProduct((p) => ({
                        ...p,
                        stock: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                    Stock mínimo
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newProduct.minStock || ""}
                    onChange={(e) =>
                      setNewProduct((p) => ({
                        ...p,
                        minStock: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                  Unidad
                </label>
                <CustomSelect
                  value={newProduct.unit}
                  onChange={(v) =>
                    setNewProduct((p) => ({ ...p, unit: v }))
                  }
                  placeholder="Seleccionar unidad"
                  options={[
                    { value: "unidad", label: "Unidad" },
                    { value: "kg", label: "Kilogramo" },
                    { value: "rollo", label: "Rollo" },
                    { value: "litro", label: "Litro" },
                  ]}
                  className="w-full"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal entrada/salida */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {showMovementModal.type === "entrada"
                ? "Registrar entrada"
                : "Registrar salida"}
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {showMovementModal.product.name} — Stock actual:{" "}
              {showMovementModal.product.stock}{" "}
              {showMovementModal.product.unit}
            </p>
            <form onSubmit={handleMovement} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                  Cantidad
                </label>
                <input
                  type="number"
                  min={1}
                  value={movementQty || ""}
                  onChange={(e) =>
                    setMovementQty(parseInt(e.target.value, 10) || 0)
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                  Folio / Factura <span className="font-normal text-[var(--muted)]">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={movementFolio}
                  onChange={(e) => setMovementFolio(e.target.value)}
                  placeholder="Ej. B-0001, F-0002"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Vincula este movimiento con una boleta o factura
                </p>
              </div>
              {showMovementModal.type === "salida" &&
                movementQty > showMovementModal.product.stock && (
                  <p className="text-xs text-[var(--destructive)]">
                    La cantidad supera el stock actual. Se permitirá (demo).
                  </p>
                )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowMovementModal(null);
                    setMovementQty(0);
                    setMovementFolio("");
                  }}
                  className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
