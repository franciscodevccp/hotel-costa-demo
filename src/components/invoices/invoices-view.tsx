"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Search,
  Link2,
  X,
  Trash2,
  Upload,
} from "lucide-react";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { createInvoice, syncInvoiceWithInventory } from "@/app/dashboard/invoices/actions";

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
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

type ProductOption = Awaited<ReturnType<typeof import("@/lib/queries/invoices").getProductsForInvoices>>[number];

export function InvoicesView({
  invoices: initialInvoices,
  products,
}: {
  invoices: Invoice[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState("");
  const [folioFilter, setFolioFilter] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  // Form state
  const [formFolio, setFormFolio] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formTotal, setFormTotal] = useState(0);
  const [formType, setFormType] = useState<"boleta" | "factura">("boleta");
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formItems, setFormItems] = useState<InvoiceItem[]>([]);
  const [newItemProduct, setNewItemProduct] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUnitPrice, setNewItemUnitPrice] = useState(0);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);

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

  const formatTotalInput = (n: number) =>
    n === 0 ? "" : new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(n);

  const parseTotalInput = (s: string) => {
    const digits = s.replace(/\D/g, "");
    return digits === "" ? 0 : parseInt(digits, 10);
  };

  const formatPriceInput = (n: number) =>
    n === 0 ? "" : new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(n);
  const parsePriceInput = (s: string) => {
    const digits = s.replace(/\D/g, "");
    return digits === "" ? 0 : parseInt(digits, 10);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const total = formPhotos.length + files.length;
    if (total > 5) {
      setPhotoUploadError(`Máximo 5 fotos. Ya tienes ${formPhotos.length}.`);
      e.target.value = "";
      return;
    }
    setPhotoUploadError(null);
    setUploadingPhotos(true);
    try {
      const formData = new FormData();
      const toAdd = Math.min(files.length, 5 - formPhotos.length);
      for (let i = 0; i < toAdd; i++) formData.append("photos", files[i]);
      const res = await fetch("/api/upload/invoice-photos", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPhotoUploadError(data?.error ?? "Error al subir fotos");
        e.target.value = "";
        return;
      }
      if (data?.urls?.length) {
        setFormPhotos((prev) => [...prev, ...data.urls].slice(0, 5));
      }
    } finally {
      setUploadingPhotos(false);
      e.target.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setFormPhotos((prev) => {
      const url = prev[index];
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      setPhotoUploadError(null);
      return prev.filter((_, i) => i !== index);
    });
  };

  const addItem = () => {
    const product = products.find((p) => p.id === newItemProduct);
    if (!product) return;
    const existing = formItems.find((i) => i.productId === product.id);
    if (existing) {
      setFormItems((prev) =>
        prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + newItemQty, unitPrice: newItemUnitPrice || i.unitPrice }
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
          unitPrice: newItemUnitPrice,
        },
      ]);
    }
    setNewItemProduct("");
    setNewItemQty(1);
    setNewItemUnitPrice(0);
  };

  const removeItem = (productId: string) => {
    setFormItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFolio.trim()) return;
    setSubmitError(null);
    setSaving(true);
    const total = formTotal || formItems.reduce((s, i) => s + i.quantity * (i.unitPrice || 0), 0);
    const result = await createInvoice({}, {
      folio: formFolio.trim().toUpperCase(),
      type: formType,
      date: formDate,
      total,
      photoUrls: formPhotos,
      items: formItems.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice || 0 })),
    });
    setSaving(false);
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    router.refresh();
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
    setNewItemUnitPrice(0);
  };

  const handleSync = async (invoice: Invoice) => {
    setSyncingId(invoice.id);
    const result = await syncInvoiceWithInventory({}, invoice.id);
    setSyncingId(null);
    if (result.error) return;
    setInvoices((prev) =>
      prev.map((i) =>
        i.id === invoice.id ? { ...i, syncedWithInventory: true } : i
      )
    );
    setSelectedInvoice((prev) =>
      prev?.id === invoice.id ? { ...prev, syncedWithInventory: true } : prev
    );
    router.refresh();
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
            Gestiona documentos, ingresa fotos y sincroniza con inventario por folio.
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
                  <DatePickerInput
                    value={formDate}
                    onChange={setFormDate}
                    className="w-full"
                    aria-label="Fecha de la boleta o factura"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                    Total (CLP)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatTotalInput(formTotal)}
                    onChange={(e) => setFormTotal(parseTotalInput(e.target.value))}
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
                  disabled={uploadingPhotos || formPhotos.length >= 5}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--background)] py-6 text-sm text-[var(--muted)] transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5 hover:text-[var(--foreground)] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Upload className="h-5 w-5" />
                  {uploadingPhotos
                    ? "Subiendo y convirtiendo a WebP..."
                    : `Agregar fotos (hasta 5)${formPhotos.length > 0 ? ` — ${formPhotos.length}/5` : ""}`}
                </button>
                {photoUploadError && (
                  <p className="mt-1.5 text-sm text-[var(--destructive)]">
                    {photoUploadError}
                  </p>
                )}
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
                <div className="flex flex-wrap gap-2">
                  <select
                    value={newItemProduct}
                    onChange={(e) => setNewItemProduct(e.target.value)}
                    className="min-w-[140px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="">Seleccionar producto</option>
                    {products.map((p) => (
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
                    className="w-16 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="Cant."
                    aria-label="Cantidad"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatPriceInput(newItemUnitPrice)}
                    onChange={(e) => setNewItemUnitPrice(parsePriceInput(e.target.value))}
                    placeholder="Precio unit."
                    className="w-28 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    aria-label="Precio unitario CLP"
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
                        className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm"
                      >
                        <span className="text-[var(--foreground)]">
                          {item.productName} · {item.quantity} {item.unit}
                          {item.unitPrice > 0 && (
                            <> · {formatCLP(item.unitPrice)} = {formatCLP(item.quantity * item.unitPrice)}</>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="shrink-0 rounded p-1 text-[var(--muted)] hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {submitError && (
                <p className="text-sm text-[var(--destructive)]">{submitError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitError(null);
                    resetForm();
                    setShowAddModal(false);
                  }}
                  disabled={saving}
                  className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)] disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Guardar"}
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
                      {item.unitPrice > 0 && (
                        <> · {formatCLP(item.unitPrice)} = {formatCLP(item.quantity * item.unitPrice)}</>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {!selectedInvoice.syncedWithInventory && (
                <button
                  type="button"
                  onClick={() => handleSync(selectedInvoice)}
                  disabled={syncingId === selectedInvoice.id}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--success)]/50 bg-[var(--success)]/5 py-2.5 text-sm font-medium text-[var(--success)] hover:bg-[var(--success)]/10 disabled:opacity-50"
                >
                  <Link2 className="h-4 w-4" />
                  {syncingId === selectedInvoice.id ? "Sincronizando…" : "Sincronizar con inventario"}
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
