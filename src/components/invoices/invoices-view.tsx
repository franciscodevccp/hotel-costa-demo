"use client";

import { useState, useRef } from "react";
import {
  FileText,
  Plus,
  Search,
  Link2,
  X,
  Trash2,
  Upload,
} from "lucide-react";
import { MOCK_PRODUCTS } from "@/lib/mock-inventory-products";

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

export interface Invoice {
  id: string;
  folio: string;
  date: string;
  total: number;
  type: "boleta" | "factura";
  photoUrls: string[];
  items: InvoiceItem[];
  syncedWithInventory: boolean;
}

const MOCK_INVOICES: Invoice[] = [
  {
    id: "1",
    folio: "B-0001",
    date: "2026-02-12",
    total: 45000,
    type: "boleta",
    photoUrls: [],
    items: [
      { productId: "1", productName: "Jabón de tocador", quantity: 10, unit: "unidad" },
      { productId: "2", productName: "Papel higiénico", quantity: 5, unit: "rollo" },
    ],
    syncedWithInventory: true,
  },
  {
    id: "2",
    folio: "F-0002",
    date: "2026-02-11",
    total: 125000,
    type: "factura",
    photoUrls: [],
    items: [
      { productId: "4", productName: "Toalla grande", quantity: 8, unit: "unidad" },
      { productId: "3", productName: "Shampoo", quantity: 15, unit: "unidad" },
    ],
    syncedWithInventory: true,
  },
  {
    id: "3",
    folio: "B-0003",
    date: "2026-02-10",
    total: 28000,
    type: "boleta",
    photoUrls: [],
    items: [
      { productId: "5", productName: "Café molido", quantity: 2, unit: "kg" },
    ],
    syncedWithInventory: false,
  },
];

export function InvoicesView() {
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState("");
  const [folioFilter, setFolioFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formFolio, setFormFolio] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formTotal, setFormTotal] = useState(0);
  const [formType, setFormType] = useState<"boleta" | "factura">("boleta");
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formItems, setFormItems] = useState<InvoiceItem[]>([]);
  const [newItemProduct, setNewItemProduct] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);

  const filteredInvoices = invoices.filter((inv) => {
    const matchSearch =
      !search ||
      inv.folio.toLowerCase().includes(search.toLowerCase()) ||
      inv.type.toLowerCase().includes(search.toLowerCase());
    const matchFolio =
      !folioFilter || inv.folio.toLowerCase().includes(folioFilter.toLowerCase());
    return matchSearch && matchFolio;
  });

  const formatCLP = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const newUrls: string[] = [];
    for (let i = 0; i < Math.min(files.length, 5); i++) {
      newUrls.push(URL.createObjectURL(files[i]));
    }
    setFormPhotos((prev) => [...prev, ...newUrls].slice(0, 5));
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setFormPhotos((prev) => {
      const url = prev[index];
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const addItem = () => {
    const product = MOCK_PRODUCTS.find((p) => p.id === newItemProduct);
    if (!product) return;
    const existing = formItems.find((i) => i.productId === product.id);
    if (existing) {
      setFormItems((prev) =>
        prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + newItemQty }
            : i
        )
      );
    } else {
      setFormItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: newItemQty,
          unit: product.unit,
        },
      ]);
    }
    setNewItemProduct("");
    setNewItemQty(1);
  };

  const removeItem = (productId: string) => {
    setFormItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFolio.trim()) return;
    const inv: Invoice = {
      id: String(Date.now()),
      folio: formFolio.trim().toUpperCase(),
      date: formDate,
      total: formTotal || formItems.reduce((s, i) => s + i.quantity * 1000, 0),
      type: formType,
      photoUrls: formPhotos,
      items: [...formItems],
      syncedWithInventory: false,
    };
    setInvoices((prev) => [inv, ...prev]);
    resetForm();
    setShowAddModal(false);
  };

  const resetForm = () => {
    setFormFolio("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormTotal(0);
    setFormType("boleta");
    formPhotos.forEach((u) => {
      if (u.startsWith("blob:")) URL.revokeObjectURL(u);
    });
    setFormPhotos([]);
    setFormItems([]);
    setNewItemProduct("");
    setNewItemQty(1);
  };

  const handleSync = (invoice: Invoice) => {
    setInvoices((prev) =>
      prev.map((i) =>
        i.id === invoice.id ? { ...i, syncedWithInventory: true } : i
      )
    );
    setSelectedInvoice((prev) =>
      prev?.id === invoice.id
        ? { ...prev, syncedWithInventory: true }
        : prev
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Boletas y Facturas
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Gestiona documentos, ingresa fotos y sincroniza con inventario por folio (demo).
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 w-full md:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nueva boleta / factura
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Buscar por folio o tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <input
          type="text"
          placeholder="Filtrar por folio"
          value={folioFilter}
          onChange={(e) => setFolioFilter(e.target.value)}
          className="min-w-[160px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>

      {/* Lista de boletas/facturas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredInvoices.map((inv) => (
          <div
            key={inv.id}
            onClick={() => setSelectedInvoice(inv)}
            className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-all hover:shadow-md hover:border-[var(--primary)]/30"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                  <FileText className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{inv.folio}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {inv.type === "boleta" ? "Boleta" : "Factura"} · {inv.date}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  inv.syncedWithInventory
                    ? "bg-[var(--success)]/10 text-[var(--success)]"
                    : "bg-[var(--warning)]/10 text-[var(--warning)]"
                }`}
              >
                {inv.syncedWithInventory ? "Sincronizado" : "Pendiente"}
              </span>
            </div>
            <p className="mt-3 text-lg font-bold text-[var(--foreground)]">
              {formatCLP(inv.total)}
            </p>
            {inv.photoUrls.length > 0 && (
              <div className="mt-2 flex gap-1">
                {inv.photoUrls.slice(0, 3).map((url, i) => (
                  <div
                    key={i}
                    className="h-12 w-12 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)]"
                  >
                    <img
                      src={url}
                      alt={`Foto ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
                {inv.photoUrls.length > 3 && (
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--muted)]">
                    +{inv.photoUrls.length - 3}
                  </span>
                )}
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
              <Link2 className="h-3.5 w-3.5" />
              {inv.items.length} producto(s) vinculado(s) al inventario
            </div>
          </div>
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center text-[var(--muted)]">
          No hay boletas o facturas que coincidan con los filtros
        </div>
      )}

      {/* Modal agregar */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Nueva boleta / factura
            </h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                    Folio *
                  </label>
                  <input
                    type="text"
                    value={formFolio}
                    onChange={(e) => setFormFolio(e.target.value)}
                    placeholder="B-0001 o F-0001"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                    Tipo
                  </label>
                  <select
                    value={formType}
                    onChange={(e) =>
                      setFormType(e.target.value as "boleta" | "factura")
                    }
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="boleta">Boleta</option>
                    <option value="factura">Factura</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                    Total (CLP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formTotal || ""}
                    onChange={(e) =>
                      setFormTotal(parseInt(e.target.value, 10) || 0)
                    }
                    placeholder="Opcional"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Fotos */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                  Fotos del documento
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--background)] py-6 text-sm text-[var(--muted)] transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5 hover:text-[var(--foreground)]"
                >
                  <Upload className="h-5 w-5" />
                  Agregar fotos (hasta 5)
                </button>
                {formPhotos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formPhotos.map((url, i) => (
                      <div
                        key={i}
                        className="relative h-20 w-20 overflow-hidden rounded-lg border border-[var(--border)]"
                      >
                        <img
                          src={url}
                          alt={`Preview ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute right-1 top-1 rounded bg-[var(--destructive)]/90 p-1 text-white hover:bg-[var(--destructive)]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items vinculados al inventario */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                  Productos (vincula con inventario)
                </label>
                <div className="flex gap-2">
                  <select
                    value={newItemProduct}
                    onChange={(e) => setNewItemProduct(e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="">Seleccionar producto</option>
                    {MOCK_PRODUCTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={newItemQty}
                    onChange={(e) =>
                      setNewItemQty(parseInt(e.target.value, 10) || 1)
                    }
                    className="w-20 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={!newItemProduct}
                    className="rounded-lg bg-[var(--primary)] px-3 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Agregar
                  </button>
                </div>
                {formItems.length > 0 && (
                  <ul className="mt-2 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-2">
                    {formItems.map((item) => (
                      <li
                        key={item.productId}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm"
                      >
                        <span className="text-[var(--foreground)]">
                          {item.productName} · {item.quantity} {item.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="rounded p-1 text-[var(--muted)] hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowAddModal(false);
                  }}
                  className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  {selectedInvoice.folio}
                </h3>
                <p className="text-sm text-[var(--muted)]">
                  {selectedInvoice.type === "boleta" ? "Boleta" : "Factura"} ·{" "}
                  {selectedInvoice.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
              {formatCLP(selectedInvoice.total)}
            </p>
            {selectedInvoice.photoUrls.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
                  Fotos
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedInvoice.photoUrls.map((url, i) => (
                    <div
                      key={i}
                      className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]"
                    >
                      <img
                        src={url}
                        alt={`Foto ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
                Sincronización con inventario (folio: {selectedInvoice.folio})
              </p>
              <ul className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                {selectedInvoice.items.map((item) => (
                  <li
                    key={item.productId}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-[var(--foreground)]">{item.productName}</span>
                    <span className="font-medium text-[var(--muted)]">
                      {item.quantity} {item.unit}
                    </span>
                  </li>
                ))}
              </ul>
              {!selectedInvoice.syncedWithInventory && (
                <button
                  type="button"
                  onClick={() => handleSync(selectedInvoice)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--success)]/50 bg-[var(--success)]/5 py-2.5 text-sm font-medium text-[var(--success)] hover:bg-[var(--success)]/10"
                >
                  <Link2 className="h-4 w-4" />
                  Sincronizar con inventario
                </button>
              )}
              {selectedInvoice.syncedWithInventory && (
                <p className="mt-3 flex items-center gap-2 text-sm text-[var(--success)]">
                  <Link2 className="h-4 w-4" />
                  Sincronizado con inventario
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
