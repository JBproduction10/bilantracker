"use client";

import React, { useEffect, useState } from "react";
import { Plus, X, Check, Ban, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSchools } from "@/context/SchoolContext";
import { api } from "@/lib/apiClient";
import { money, PERIODS } from "@/lib/utils";
import { EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORIES, PURCHASE_ORDER_STATUS_LABELS, PURCHASE_ORDER_STATUS_PILL } from "@/lib/constants";
import type { PurchaseOrder, ExpenseCategory, PurchaseOrderStatus } from "@/lib/types";

export default function PurchaseOrdersPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  if (role === "school_admin" || role === "super_admin") return <SchoolPurchaseOrders canDecide={role === "super_admin"} />;
  return <NetworkPurchaseOrders canDecide={role === "treasury"} />;
}

/* ---------- school_admin: submit requests to Bonté Service, see their own school's queue ---------- */
/* ---------- super_admin also decides (validate/execute/reject) for the active school ---------- */
function SchoolPurchaseOrders({ canDecide }: { canDecide: boolean }) {
  const { school } = useSchools();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [decideTarget, setDecideTarget] = useState<PurchaseOrder | null>(null);
  const [decideAction, setDecideAction] = useState<"validate" | "reject" | "execute" | null>(null);

  const load = async () => {
    if (!school) return;
    setLoading(true);
    const list = await api.listPurchaseOrders(school.id);
    setOrders(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [school]);

  if (!school) return null;

  const pending = orders.filter((o) => o.status === "pending" || o.status === "validated").length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bons de commande</h1>
          <p className="page-subtitle">Demandes envoyées à Bonté Service pour {school.name}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Nouvelle demande</button>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card stat"><div className="stat-label">En cours</div><div className="stat-value">{pending}</div></div>
        <div className="card stat"><div className="stat-label">Exécutées</div><div className="stat-value">{orders.filter((o) => o.status === "executed").length}</div></div>
        <div className="card stat"><div className="stat-label">Total exécuté</div><div className="stat-value mono">{money(orders.filter((o) => o.status === "executed").reduce((s, o) => s + (o.executedAmount || 0), 0))}</div></div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>Date</th><th>Catégorie</th><th>Libellé</th><th>Montant demandé</th><th>Statut</th><th>Montant exécuté</th>{canDecide && <th></th>}</tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td style={{ color: "var(--muted)" }}>{new Date(o.requestedAt).toLocaleDateString("fr-FR")}</td>
                <td><span className="pill pill-leave">{EXPENSE_CATEGORY_LABELS[o.category]}</span></td>
                <td style={{ fontWeight: 600 }}>{o.label}{o.note ? <span style={{ color: "var(--muted)", fontWeight: 400 }}> — {o.note}</span> : null}</td>
                <td className="mono">{money(o.amountRequested)}</td>
                <td><span className={"pill " + PURCHASE_ORDER_STATUS_PILL[o.status]}>{PURCHASE_ORDER_STATUS_LABELS[o.status]}</span></td>
                <td className="mono">{o.executedAmount ? money(o.executedAmount) : "—"}</td>
                {canDecide && (
                  <td style={{ textAlign: "right", display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    {o.status === "pending" && (
                      <button className="btn btn-ghost btn-sm" title="Valider" onClick={() => { setDecideTarget(o); setDecideAction("validate"); }}><Check size={14} /></button>
                    )}
                    {(o.status === "pending" || o.status === "validated") && (
                      <>
                        <button className="btn btn-ghost btn-sm" title="Exécuter" onClick={() => { setDecideTarget(o); setDecideAction("execute"); }}><Send size={14} /></button>
                        <button className="btn btn-ghost btn-sm" title="Refuser" onClick={() => { setDecideTarget(o); setDecideAction("reject"); }}><Ban size={14} /></button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!loading && orders.length === 0 && <tr><td colSpan={canDecide ? 7 : 6} className="empty">Aucun bon de commande envoyé.</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <PurchaseOrderModal
          schoolId={school.id}
          onClose={() => setShowAdd(false)}
          onSaved={async () => { await load(); setShowAdd(false); }}
        />
      )}

      {decideTarget && decideAction && (
        <DecisionModal
          order={decideTarget} action={decideAction}
          onClose={() => { setDecideTarget(null); setDecideAction(null); }}
          onDone={async () => { await load(); setDecideTarget(null); setDecideAction(null); }}
        />
      )}
    </>
  );
}

function PurchaseOrderModal({ schoolId, onClose, onSaved }: { schoolId: string; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [category, setCategory] = useState<ExpenseCategory>("fuel");
  const [label, setLabel] = useState("");
  const [amountRequested, setAmountRequested] = useState("");
  const [period, setPeriod] = useState(PERIODS[2]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!label.trim() || !amountRequested) {
      setError("Renseignez le libellé et le montant demandé.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.submitPurchaseOrder(schoolId, { category, label: label.trim(), amountRequested: Number(amountRequested), period, note: note.trim() });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-title">Nouvelle demande</p>
            <p className="modal-sub">Envoyée à Bonté Service pour validation et exécution.</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <div>
              <label className="label">Catégorie</label>
              <select className="select-el" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Montant demandé (FC)</label>
              <input className="field" type="number" placeholder="150000" value={amountRequested} onChange={(e) => setAmountRequested(e.target.value)} />
            </div>
          </div>
          <label className="label">Libellé du besoin</label>
          <input className="field" style={{ marginBottom: 14 }} placeholder="ex. Réparation toiture bloc CM2" value={label} onChange={(e) => setLabel(e.target.value)} />
          <label className="label">Période</label>
          <select className="select-el" style={{ marginBottom: 14 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <label className="label">Note (optionnel)</label>
          <input className="field" placeholder="Précision pour Bonté Service" value={note} onChange={(e) => setNote(e.target.value)} />
          {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Envoi…" : "Envoyer à Bonté Service"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- treasury / promoter / super_admin: network-wide queue ---------- */
function NetworkPurchaseOrders({ canDecide }: { canDecide: boolean }) {
  const [status, setStatus] = useState<PurchaseOrderStatus | "">("");
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [decideTarget, setDecideTarget] = useState<PurchaseOrder | null>(null);
  const [decideAction, setDecideAction] = useState<"validate" | "reject" | "execute" | null>(null);

  const load = async () => {
    setLoading(true);
    const list = await api.listAllPurchaseOrders(status || undefined);
    setOrders(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const totalRequested = orders.filter((o) => o.status === "pending" || o.status === "validated").reduce((s, o) => s + o.amountRequested, 0);
  const totalExecuted = orders.filter((o) => o.status === "executed").reduce((s, o) => s + (o.executedAmount || 0), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bons de commande</h1>
          <p className="page-subtitle">File réseau — toutes les écoles</p>
        </div>
        <select className="select-el" style={{ width: 170 }} value={status} onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus | "")}>
          <option value="">Tous les statuts</option>
          {(["pending", "validated", "executed", "rejected"] as PurchaseOrderStatus[]).map((s) => (
            <option key={s} value={s}>{PURCHASE_ORDER_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card stat"><div className="stat-label">Demandes en cours</div><div className="stat-value">{orders.filter((o) => o.status === "pending" || o.status === "validated").length}</div></div>
        <div className="card stat"><div className="stat-label">Montant en attente</div><div className="stat-value mono">{money(totalRequested)}</div></div>
        <div className="card stat"><div className="stat-label">Total exécuté</div><div className="stat-value mono">{money(totalExecuted)}</div></div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead><tr><th>École</th><th>Catégorie</th><th>Libellé</th><th>Demandé</th><th>Statut</th><th>Exécuté</th>{canDecide && <th></th>}</tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td style={{ fontWeight: 600 }}>{o.schoolName}</td>
                <td><span className="pill pill-leave">{EXPENSE_CATEGORY_LABELS[o.category]}</span></td>
                <td>{o.label}</td>
                <td className="mono">{money(o.amountRequested)}</td>
                <td><span className={"pill " + PURCHASE_ORDER_STATUS_PILL[o.status]}>{PURCHASE_ORDER_STATUS_LABELS[o.status]}</span></td>
                <td className="mono">{o.executedAmount ? money(o.executedAmount) : "—"}</td>
                {canDecide && (
                  <td style={{ textAlign: "right", display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    {o.status === "pending" && (
                      <button className="btn btn-ghost btn-sm" title="Valider" onClick={() => { setDecideTarget(o); setDecideAction("validate"); }}><Check size={14} /></button>
                    )}
                    {(o.status === "pending" || o.status === "validated") && (
                      <>
                        <button className="btn btn-ghost btn-sm" title="Exécuter" onClick={() => { setDecideTarget(o); setDecideAction("execute"); }}><Send size={14} /></button>
                        <button className="btn btn-ghost btn-sm" title="Refuser" onClick={() => { setDecideTarget(o); setDecideAction("reject"); }}><Ban size={14} /></button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!loading && orders.length === 0 && <tr><td colSpan={canDecide ? 7 : 6} className="empty">Aucun bon de commande.</td></tr>}
          </tbody>
        </table>
      </div>

      {decideTarget && decideAction && (
        <DecisionModal
          order={decideTarget} action={decideAction}
          onClose={() => { setDecideTarget(null); setDecideAction(null); }}
          onDone={async () => { await load(); setDecideTarget(null); setDecideAction(null); }}
        />
      )}
    </>
  );
}

function DecisionModal({
  order, action, onClose, onDone,
}: { order: PurchaseOrder; action: "validate" | "reject" | "execute"; onClose: () => void; onDone: () => void | Promise<void> }) {
  const [executedAmount, setExecutedAmount] = useState(String(order.amountRequested));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const title = action === "validate" ? "Valider la demande" : action === "reject" ? "Refuser la demande" : "Exécuter le paiement";

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api.decidePurchaseOrder(order.schoolId, order.id, {
        action, note: note.trim() || undefined,
        ...(action === "execute" ? { executedAmount: Number(executedAmount) } : {}),
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-title">{title}</p>
            <p className="modal-sub">{order.schoolName} — {order.label} ({money(order.amountRequested)} demandé)</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {action === "execute" && (
            <>
              <label className="label">Montant réellement décaissé (FC)</label>
              <input className="field" style={{ marginBottom: 14 }} type="number" value={executedAmount} onChange={(e) => setExecutedAmount(e.target.value)} />
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 14 }}>
                Ce montant sera enregistré automatiquement comme dépense de l&apos;école pour la période {order.period}.
              </div>
            </>
          )}
          <label className="label">Note (optionnel)</label>
          <input className="field" placeholder="Précision" value={note} onChange={(e) => setNote(e.target.value)} />
          {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "…" : "Confirmer"}</button>
        </div>
      </div>
    </div>
  );
}
