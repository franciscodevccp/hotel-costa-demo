"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  X,
  FileText,
  Trash2,
} from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { deleteProduct as deleteProductAction } from "@/app/dashboard/inventory/actions";

export interface InventoryProduct {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  entradas?: number;
  salidas?: number;
  folio?: string;
}

type StockFilter = "" | "more" | "less";

/** Normaliza texto para búsqueda: minúsculas y sin tildes (azúcar → azucar) */
function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

type ProductRow = Awaited<ReturnType<typeof import("@/lib/queries/inventory").getProducts>>[number];

function toInventoryProduct(p: ProductRow): InventoryProduct {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    stock: p.stock,
    minStock: p.minStock,
    unit: p.unit,
    entradas: p.entradas ?? 0,
    salidas: p.salidas ?? 0,
    folio: p.folio ?? undefined,
  };
}

export function InventoryView({ products: initialProducts }: { products: ProductRow[] }) {
  const router = useRouter();
  const [products, setProducts] = useState<InventoryProduct[]>(() => initialProducts.map(toInventoryProduct));
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState<{
    product: InventoryProduct;
    type: "entrada" | "salida";
  } | null>(null);
  const [productToDelete, setProductToDelete] = useState<InventoryProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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

  // Alerta de bajo stock al entrar (se muestra al montar el componente)
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
    const q = normalizeForSearch(search);
    filtered = filtered.filter(
      (p) =>
        normalizeForSearch(p.name).includes(q) ||
        normalizeForSearch(p.category).includes(q)
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
    if (type === "salida" && movementQty > product.stock) return;
    const folioToSave = movementFolio.trim() || undefined;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== product.id) return p;
        const qty = type === "entrada" ? movementQty : -movementQty;
        const newStock = Math.max(0, p.stock + qty);
        return {
          ...p,
          stock: newStock,
          entradas: type === "entrada" ? (p.entradas ?? 0) + movementQty : (p.entradas ?? 0),
          salidas: type === "salida" ? (p.salidas ?? 0) + movementQty : (p.salidas ?? 0),
          folio: folioToSave ?? p.folio,
        };
      })
    );
    setShowMovementModal(null);
    setMovementQty(0);
    setMovementFolio("");
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteProductAction(productToDelete.id);
    setDeleting(false);
    if (result.error) {
      setDeleteError(result.error);
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
    setProductToDelete(null);
    router.refresh();
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
            Gestiona productos, entradas y salidas. Stock en tiempo real.
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
                          Stock total: {product.stock} {product.unit}
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
                      <button
                        onClick={() => setProductToDelete(product)}
                        className="flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] p-1.5 text-[var(--muted)] hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] hover:border-[var(--destructive)]/30"
                        title="Eliminar producto"
                        type="button"
                        aria-label="Eliminar producto"
                      >
                        <X className="h-3.5 w-3.5" />
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
                  <p className="text-sm font-medium text-[var(--destructive)]">
                    La cantidad no puede superar el stock actual ({showMovementModal.product.stock} {showMovementModal.product.unit}).
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
                  disabled={
                    showMovementModal.type === "salida" &&
                    movementQty > showMovementModal.product.stock
                  }
                  className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar producto */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <div className="flex items-center gap-3 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--destructive)]/20">
                <Trash2 className="h-5 w-5 text-[var(--destructive)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--foreground)]">
                  ¿Eliminar producto?
                </h3>
                <p className="text-sm text-[var(--muted)]">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-[var(--foreground)]">
              Estás a punto de eliminar <strong className="text-[var(--foreground)]">&quot;{productToDelete.name}&quot;</strong> del inventario. Se borrarán también todos los movimientos y referencias en boletas/facturas asociados a este producto.
            </p>
            {deleteError && (
              <p className="mt-2 text-sm text-[var(--destructive)]" role="alert">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setProductToDelete(null);
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-[var(--destructive)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
