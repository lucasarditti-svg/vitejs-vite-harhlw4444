import { useState, useEffect } from "react";

const SUPABASE_URL = "https://hgvrucdaqukciachpzug.supabase.co";
const SUPABASE_KEY = "sb_publishable_TsndZuP4zHktXZfJQt_SDw_U1782auq";
const ADMIN_PASSWORD = "admin1234";

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
};

function sanitizeFilename(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

async function sbGet(table: string, filter?: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${filter ? "?" + filter : ""}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function sbPost(table: string, body: object) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST", headers: { ...headers, "Prefer": "return=representation" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function sbPatch(table: string, filter: string, body: object) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH", headers: { ...headers, "Prefer": "return=representation" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function sbDelete(table: string, filter: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, { method: "DELETE", headers });
}
async function uploadFile(clientId: string, docId: string, file: File): Promise<{ url: string; name: string }> {
  const path = `${clientId}/${docId}/${Date.now()}_${sanitizeFilename(file.name)}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/documentos/${path}`, {
    method: "POST", headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "true" }, body: file,
  });
  if (!res.ok) throw new Error(await res.text());
  return { url: `${SUPABASE_URL}/storage/v1/object/public/documentos/${path}`, name: file.name };
}

interface UploadedFile { name: string; url: string; date: string; }
interface Doc { id: string; client_id: string; label: string; icon: string; required: boolean; note: string; files: UploadedFile[]; sort_order: number; }
interface Client { id: string; name: string; description: string; account_type: string; created_at: string; }
interface DocDef { id: string; label: string; icon: string; isSection?: boolean; }

// ─── ALL DOCUMENTS MASTER LIST ────────────────────────────────────────────────
const ALL_DOCS: DocDef[] = [
  { id: "pasaporte", label: "Pasaporte", icon: "📘" },
  { id: "dni", label: "DNI (frente y dorso)", icon: "🪪" },
  { id: "extractos", label: "Últimos 3 extractos bancarios", icon: "🏦" },
  { id: "cuit", label: "Constancia de CUIT", icon: "📄" },
  { id: "direccion", label: "Prueba de dirección física (factura de luz, agua, cable emitido a su nombre y con la dirección del domicilio)", icon: "🏠" },
  { id: "direccion90", label: "Prueba de dirección física con vigencia mínima de 90 días (factura de luz, agua, cable emitido a su nombre y con la dirección del domicilio)", icon: "🏠" },
  { id: "pasaporte_ext", label: "Pasaporte extranjero", icon: "📗" },
  { id: "visa", label: "VISA estadounidense", icon: "✈️" },
  { id: "cv", label: "Curriculum / descargar perfil de LinkedIn en PDF", icon: "📝" },
  { id: "cv10", label: "Breve resumen de trayectoria profesional de los pasados 10 años (Curriculum / descargar perfil de LinkedIn en PDF)", icon: "📝" },
  { id: "pasaporte_ben", label: "Pasaporte beneficiario", icon: "📙" },
  { id: "form_personal_info", label: 'Formulario "Personal Account Information"', icon: "📋" },
  { id: "form_authorized", label: 'Formulario "Authorized Signer Information"', icon: "📋" },
  { id: "estado_fin_personal", label: "Estado financiero personal (en dólares)", icon: "💵" },
  { id: "form_perfil_personal", label: 'Formulario "Perfil del Cliente - Relación Personal"', icon: "📋" },
  { id: "form_new_personal", label: 'Formulario "New Personal Relationship Form"', icon: "📋" },
  { id: "form_business", label: 'Formulario "Business Account Information"', icon: "📋" },
  { id: "cert_registro", label: "Certificado de Registro de la empresa", icon: "🏢" },
  { id: "carta_irs", label: "Carta del IRS confirmando el número de EIN asignado", icon: "📬" },
  { id: "cert_incorporacion", label: "Certificado de Incorporación", icon: "📜" },
  { id: "articulos_inc", label: "Artículos de Incorporación", icon: "📜" },
  { id: "operating", label: "Operating Agreement", icon: "📜" },
  { id: "resumen_empresa", label: "Breve resumen de la operación de la empresa, incluyendo el origen de su creación (fuente de fondos) y trayectoria de negocios", icon: "📊" },
  { id: "organigrama", label: "Organigrama de la estructura accionaria", icon: "🗂️" },
  { id: "acta_activa", label: "Copia de acta reciente (no mayor de un año) o carta de abogado que certifique que la empresa está activa y en cumplimiento", icon: "⚖️" },
  { id: "ref_bancaria", label: "Carta de referencia bancaria", icon: "🏦" },
  { id: "estado_fin_empresa", label: "Último estado financiero (o proyección financiera si es empresa recién constituida a través del Perfil Relación Corporativa)", icon: "💵" },
  { id: "extractos_empresa", label: "Últimos 3 estados de cuenta bancarios (o del banco de origen del depósito inicial si nunca tuvo cuenta)", icon: "🏦" },
  { id: "form_new_corporate", label: 'Formulario "New Corporate Relationship Form"', icon: "📋" },
  { id: "estatutos", label: "Estatutos originales de incorporación (si la empresa tiene como accionista a otra empresa)", icon: "📜" },
  { id: "asamblea", label: "Última asamblea de accionistas confirmando directores y accionistas actuales (si la empresa tiene como accionista a otra empresa)", icon: "📋" },
  { id: "form_perfil_personal2", label: 'Formulario "Perfil Relación Personal"', icon: "📋" },
  { id: "num_impuestos", label: "Copia de número de identificación de impuestos", icon: "📋" },
  { id: "registro_accionistas", label: "Copia del registro de accionistas y de las acciones emitidas", icon: "📋" },
  { id: "cert_registro_inc", label: "Certificado de Registro e incorporación", icon: "🏢" },
  { id: "otros", label: "Otros documentos", icon: "📎" },
];

const ALL_DOCS_MAP = Object.fromEntries(ALL_DOCS.map(d => [d.id, d]));

const SECTION_ACCIONISTAS: DocDef = { id: "__section_acc__", label: "── SECCIÓN ACCIONISTAS ──", icon: "👥", isSection: true };

// Docs per account type (in order). Use "__section_acc__" as separator.
const ACCOUNT_PRESETS: Record<string, { label: string; color: string; docs: string[] }> = {
  banesco_personal: {
    label: "Cuenta Personal Banesco", color: "#1d4ed8",
    docs: ["pasaporte", "dni", "extractos", "cuit", "direccion", "pasaporte_ext", "visa", "cv", "pasaporte_ben", "form_personal_info", "form_authorized", "estado_fin_personal", "otros"],
  },
  ocean_personal: {
    label: "Cuenta Personal Ocean Bank", color: "#0369a1",
    docs: ["pasaporte", "dni", "extractos", "cuit", "direccion", "pasaporte_ext", "visa", "cv", "pasaporte_ben", "form_perfil_personal", "form_new_personal", "otros"],
  },
  banesco_empresa_intl: {
    label: "Empresa Internacional Banesco", color: "#7c3aed",
    docs: ["form_business", "cert_registro", "cert_incorporacion", "num_impuestos", "registro_accionistas", "direccion90", "resumen_empresa", "organigrama", "acta_activa", "ref_bancaria", "__section_acc__", "pasaporte", "dni", "visa", "direccion90", "cv10", "ref_bancaria", "form_authorized", "estado_fin_personal", "otros"],
  },
  ocean_empresa_intl: {
    label: "Empresa Internacional Ocean Bank", color: "#0e7490",
    docs: ["cert_registro_inc", "num_impuestos", "registro_accionistas", "direccion90", "estado_fin_empresa", "extractos_empresa", "form_new_corporate", "estatutos", "asamblea", "__section_acc__", "pasaporte", "dni", "visa", "direccion90", "form_perfil_personal2", "otros"],
  },
  banesco_empresa_dom: {
    label: "Empresa Doméstica Banesco", color: "#b45309",
    docs: ["form_business", "cert_registro", "carta_irs", "cert_incorporacion", "articulos_inc", "operating", "resumen_empresa", "organigrama", "__section_acc__", "pasaporte", "dni", "visa", "direccion", "cv10", "form_authorized", "estado_fin_personal", "otros"],
  },
  ocean_empresa_dom: {
    label: "Empresa Doméstica Ocean Bank", color: "#047857",
    docs: ["articulos_inc", "operating", "carta_irs", "estado_fin_empresa", "extractos_empresa", "form_new_corporate", "estatutos", "asamblea", "__section_acc__", "pasaporte", "dni", "visa", "direccion90", "form_perfil_personal2", "otros"],
  },
  personalizada: { label: "Documentación personalizada", color: "#6366f1", docs: [] },
};

function generateId(): string { return Math.random().toString(36).substr(2, 9); }

function parseDocs(raw: (Doc & { files: string | UploadedFile[] })[]): Doc[] {
  return raw.map(d => ({ ...d, files: typeof d.files === "string" ? JSON.parse(d.files || "[]") : (d.files || []) }));
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState(""); const [error, setError] = useState(false);
  const attempt = () => { if (pw === ADMIN_PASSWORD) { sessionStorage.setItem("admin_auth", "1"); onLogin(); } else { setError(true); setPw(""); } };
  return (
    <div style={{ minHeight: "100vh", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: "white", borderRadius: 16, padding: 40, width: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: 32, textAlign: "center", marginBottom: 8 }}>🔐</div>
        <div style={{ fontWeight: 700, fontSize: 20, textAlign: "center", marginBottom: 4, color: "#1a1a2e" }}>Panel de administración</div>
        <div style={{ fontSize: 13, color: "#888", textAlign: "center", marginBottom: 28 }}>Ingresá tu contraseña para continuar</div>
        <input type="password" value={pw} onChange={e => { setPw(e.target.value); setError(false); }} onKeyDown={e => { if (e.key === "Enter") attempt(); }} placeholder="Contraseña"
          style={{ width: "100%", padding: "12px 14px", border: "1.5px solid " + (error ? "#f87171" : "#ddd"), borderRadius: 8, fontSize: 15, boxSizing: "border-box", marginBottom: 8, outline: "none" }} autoFocus />
        {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>Contraseña incorrecta</div>}
        <button onClick={attempt} style={{ width: "100%", background: "#6366f1", color: "white", border: "none", padding: "13px", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 4 }}>Entrar</button>
      </div>
    </div>
  );
}

// ─── UPLOAD AREA ──────────────────────────────────────────────────────────────
function UploadArea({ onFiles, uploading }: { onFiles: (f: FileList) => void; uploading: boolean }) {
  const [drag, setDrag] = useState(false);
  return (
    <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files); }}
      style={{ border: "2px dashed " + (drag ? "#6366f1" : "#e0e3f0"), borderRadius: 10, padding: "14px", textAlign: "center", background: drag ? "#eef0ff" : "#fafafa", cursor: "pointer", position: "relative" }}>
      <input type="file" multiple style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} onChange={e => { if (e.target.files?.length) onFiles(e.target.files); }} />
      {uploading ? <div style={{ color: "#6366f1", fontSize: 13 }}>⏳ Subiendo...</div> : (
        <><div style={{ fontSize: 18, marginBottom: 3 }}>📎</div>
          <div style={{ fontSize: 12, color: "#666" }}>Arrastrá o <span style={{ color: "#6366f1", fontWeight: 600 }}>hacé clic para seleccionar</span></div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>PDF, JPG, PNG — podés subir varios</div></>
      )}
    </div>
  );
}

// ─── FILE LIST ────────────────────────────────────────────────────────────────
function FileList({ files, onRemove }: { files: UploadedFile[]; onRemove?: (i: number) => void }) {
  if (!files.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
      {files.map((f, i) => (
        <div key={i} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 15 }}>📁</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: "#166534", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
            <div style={{ fontSize: 11, color: "#555" }}>Subido el {f.date}</div>
          </div>
          <a href={f.url} download={f.name} target="_blank" rel="noreferrer" style={{ background: "#16a34a", color: "white", fontSize: 11, fontWeight: 600, textDecoration: "none", padding: "4px 10px", borderRadius: 6, whiteSpace: "nowrap" }}>⬇️ Descargar</a>
          {onRemove && <button onClick={() => onRemove(i)} style={{ background: "none", border: "none", color: "#bbb", cursor: "pointer", fontSize: 18, padding: "0 2px" }}>×</button>}
        </div>
      ))}
    </div>
  );
}

// ─── DOC FORM (smart) ─────────────────────────────────────────────────────────
interface FormDoc { id: string; label: string; icon: string; required: boolean; note: string; isSection: boolean; files?: UploadedFile[]; }

function DocForm({ initialDocs, accountType, onSave, onCancel, saveLabel }: {
  initialDocs: Doc[]; accountType: string; onSave: (docs: FormDoc[]) => void; onCancel: () => void; saveLabel: string;
}) {
  const buildFromPreset = (at: string): FormDoc[] => {
    const p = ACCOUNT_PRESETS[at] || ACCOUNT_PRESETS.personalizada;
    const seen = new Set<string>();
    return p.docs.map(id => {
      if (id === "__section_acc__") return { id: "__section_acc__", label: SECTION_ACCIONISTAS.label, icon: "👥", required: false, note: "", isSection: true };
      const def = ALL_DOCS_MAP[id];
      if (!def) return null;
      const uniqueId = seen.has(id) ? id + "_" + generateId() : id;
      seen.add(id);
      return { id: uniqueId, label: def.label, icon: def.icon, required: true, note: "", isSection: false };
    }).filter(Boolean) as FormDoc[];
  };

  const buildFromExisting = (): FormDoc[] => {
    return initialDocs.map(d => ({
      id: d.id, label: d.label, icon: d.icon, required: d.required, note: d.note,
      isSection: d.label.startsWith("──"), files: d.files,
    }));
  };

  const [docs, setDocs] = useState<FormDoc[]>(() => initialDocs.length > 0 ? buildFromExisting() : buildFromPreset(accountType));
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [newCustomLabel, setNewCustomLabel] = useState("");

  // When account type changes (only on new client form)
  useEffect(() => {
    if (initialDocs.length > 0) return;
    setDocs(buildFromPreset(accountType));
  }, [accountType]);

  const usedIds = new Set(docs.map(d => d.id.replace(/_[a-z0-9]+$/, "")));
  const availableDocs = ALL_DOCS.filter(d => !usedIds.has(d.id));
  const filteredPicker = availableDocs.filter(d => d.label.toLowerCase().includes(pickerSearch.toLowerCase()));

  const addFromPicker = (doc: DocDef) => {
    setDocs(prev => [...prev, { id: doc.id, label: doc.label, icon: doc.icon, required: true, note: "", isSection: false }]);
    setShowPicker(false);
    setPickerSearch("");
  };

  const addCustom = () => {
    if (!newCustomLabel.trim()) return;
    setDocs(prev => [...prev, { id: generateId(), label: newCustomLabel.trim(), icon: "📎", required: true, note: "", isSection: false }]);
    setNewCustomLabel("");
  };

  const toggle = (i: number, key: keyof FormDoc, val: unknown) => setDocs(prev => { const n = [...prev]; n[i] = { ...n[i], [key]: val }; return n; });
  const remove = (i: number) => setDocs(prev => prev.filter((_, j) => j !== i));

  const nonSectionDocs = docs.filter(d => !d.isSection);

  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e", marginBottom: 12 }}>
        Documentos a solicitar <span style={{ fontWeight: 400, color: "#888", fontSize: 12 }}>({nonSectionDocs.length} documentos)</span>
      </div>

      <div style={{ maxHeight: 420, overflowY: "auto", paddingRight: 4, marginBottom: 12 }}>
        {docs.map((doc, i) => {
          if (doc.isSection) return (
            <div key={i} style={{ background: "#1a1a2e", color: "white", borderRadius: 8, padding: "10px 14px", marginBottom: 6, marginTop: 4, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <span>👥</span>
              <span style={{ flex: 1 }}>Documentación de accionistas (10%+) y firmantes autorizados</span>
              <button onClick={() => remove(i)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
          );
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#fafafa", borderRadius: 8, marginBottom: 5, border: "1px solid #e5e7eb" }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{doc.icon}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "#1a1a2e", lineHeight: 1.3 }}>{doc.label}</span>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#666", flexShrink: 0, whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={doc.required} onChange={e => toggle(i, "required", e.target.checked)} />Obligatorio
              </label>
              <input value={doc.note} onChange={e => toggle(i, "note", e.target.value)} placeholder="Aclaración" style={{ width: 130, padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6, fontSize: 11, flexShrink: 0 }} />
              <button onClick={() => remove(i)} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 18, padding: "0 2px", flexShrink: 0 }}>×</button>
            </div>
          );
        })}
      </div>

      {/* Picker de documentos disponibles */}
      {!showPicker ? (
        <button onClick={() => setShowPicker(true)}
          style={{ width: "100%", padding: "10px", border: "1.5px dashed #c7c9f0", borderRadius: 8, background: "#fafbff", color: "#6366f1", fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: 8 }}>
          + Seleccionar otro documento
        </button>
      ) : (
        <div style={{ border: "1.5px solid #c7c9f0", borderRadius: 10, background: "white", marginBottom: 8, overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 8 }}>
            <input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder="Buscar documento..." autoFocus
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#333" }} />
            <button onClick={() => { setShowPicker(false); setPickerSearch(""); }} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filteredPicker.length === 0 && <div style={{ padding: "14px", fontSize: 13, color: "#888", textAlign: "center" }}>No hay más documentos disponibles</div>}
            {filteredPicker.map(doc => (
              <div key={doc.id} onClick={() => addFromPicker(doc)}
                style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #f5f5f5" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f5f5ff")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                <span>{doc.icon}</span><span>{doc.label}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #eee", padding: "8px 12px" }}>
              <div style={{ fontSize: 11, color: "#aaa", marginBottom: 6 }}>O escribí un documento personalizado:</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newCustomLabel} onChange={e => setNewCustomLabel(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addCustom(); }} placeholder="Nombre del documento..."
                  style={{ flex: 1, padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, outline: "none" }} />
                <button onClick={addCustom} style={{ background: "#6366f1", color: "white", border: "none", padding: "7px 14px", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button onClick={() => onSave(docs)} style={{ background: "#6366f1", color: "white", border: "none", padding: "12px 24px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>{saveLabel}</button>
        <button onClick={onCancel} style={{ background: "#eee", color: "#555", border: "none", padding: "12px 24px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── VISTA CLIENTE ────────────────────────────────────────────────────────────
function ClientView({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<Client | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const clients = await sbGet("clients", `id=eq.${clientId}`);
        if (!clients?.length) { setNotFound(true); setLoading(false); return; }
        setClient(clients[0]);
        const d = await sbGet("documents", `client_id=eq.${clientId}&order=sort_order.asc`);
        setDocs(parseDocs(d || []));
      } catch { setNotFound(true); }
      setLoading(false);
    })();
  }, [clientId]);

  const handleFiles = async (docId: string, fileList: FileList) => {
    setUploading(docId);
    try {
      const newFiles: UploadedFile[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const { url, name } = await uploadFile(clientId, docId, fileList[i]);
        newFiles.push({ name, url, date: new Date().toLocaleString("es-AR") });
      }
      const doc = docs.find(d => d.id === docId)!;
      const updated = [...(doc.files || []), ...newFiles];
      await sbPatch("documents", `id=eq.${docId}`, { files: JSON.stringify(updated) });
      fetch(`${SUPABASE_URL}/functions/v1/notify-upload`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}` 
        },
        body: JSON.stringify({
          client_name: client!.name,
          doc_label: doc.label,
          file_name: newFiles.map(f => f.name).join(", "),
          client_id: clientId,
        })
      }).catch(() => {})
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, files: updated } : d));
    } catch { alert("Error al subir el archivo. Intentá de nuevo."); }
    setUploading(null);
  };

  const removeFile = async (docId: string, idx: number) => {
    const doc = docs.find(d => d.id === docId)!;
    const updated = doc.files.filter((_, i) => i !== idx);
    await sbPatch("documents", `id=eq.${docId}`, { files: JSON.stringify(updated) });
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, files: updated } : d));
  };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#888" }}>Cargando...</div>;
  if (notFound) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", flexDirection: "column", gap: 12, color: "#888" }}><div style={{ fontSize: 48 }}>🔍</div><div style={{ fontSize: 18, fontWeight: 600 }}>Página no encontrada</div></div>;

  const visibleDocs = docs.filter(d => !d.label.startsWith("──"));
  const required = visibleDocs.filter(d => d.required);
  const done = required.filter(d => d.files?.length > 0).length;
  const pct = required.length ? Math.round((done / required.length) * 100) : 0;
  const at = ACCOUNT_PRESETS[client!.account_type];

  return (
    <div style={{ minHeight: "100vh", background: "#f7f8fa", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: "#1a1a2e", padding: "28px 32px", color: "white" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: 12, color: "#7b7fa3", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Portal de documentación</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{client!.name}</div>
          {at && <div style={{ display: "inline-block", marginTop: 6, background: at.color, color: "white", fontSize: 12, fontWeight: 600, padding: "3px 12px", borderRadius: 20 }}>{at.label}</div>}
          {client!.description && <div style={{ fontSize: 14, color: "#a0a4c8", marginTop: 6 }}>{client!.description}</div>}
        </div>
      </div>
      <div style={{ background: "#eef0f7", borderBottom: "1px solid #dde0f0" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1, height: 8, background: "#d4d7ec", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ width: pct + "%", height: "100%", background: pct === 100 ? "#22c55e" : "#6366f1", borderRadius: 8, transition: "width 0.5s" }} />
          </div>
          <div style={{ fontSize: 13, color: "#555", whiteSpace: "nowrap" }}>{done} de {required.length} obligatorios</div>
        </div>
      </div>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px" }}>
        {docs.map(doc => {
          if (doc.label.startsWith("──")) return (
            <div key={doc.id} style={{ background: "#1a1a2e", color: "white", borderRadius: 10, padding: "12px 18px", marginBottom: 12, marginTop: 4, fontSize: 13, fontWeight: 700 }}>
              👥 Documentación requerida de cada accionista con 10% o más y de cada firmante autorizado
            </div>
          );
          const hasFiles = doc.files?.length > 0;
          return (
            <div key={doc.id} style={{ background: "white", borderRadius: 14, marginBottom: 10, border: "2px solid " + (hasFiles ? "#d1fae5" : "#e5e7eb"), overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 22 }}>{doc.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e", lineHeight: 1.4 }}>
                    {doc.label}
                    {doc.required && <span style={{ marginLeft: 8, fontSize: 11, background: "#fef3c7", color: "#b45309", padding: "2px 7px", borderRadius: 20, fontWeight: 600 }}>Obligatorio</span>}
                  </div>
                  {doc.note && <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{doc.note}</div>}
                </div>
                <div style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: hasFiles ? "#d1fae5" : "#fef9ec", color: hasFiles ? "#15803d" : "#b45309", whiteSpace: "nowrap" }}>
                  {hasFiles ? `✓ ${doc.files.length} archivo${doc.files.length > 1 ? "s" : ""}` : "Pendiente"}
                </div>
              </div>
              <div style={{ padding: "0 18px 14px" }}>
                <FileList files={doc.files || []} onRemove={idx => removeFile(doc.id, idx)} />
                <UploadArea onFiles={fl => handleFiles(doc.id, fl)} uploading={uploading === doc.id} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ADMIN FILES VIEW ─────────────────────────────────────────────────────────
function AdminFilesView({ client, docs, onBack, onUpload, onRemove, uploading }: {
  client: Client; docs: Doc[]; onBack: () => void;
  onUpload: (docId: string, fl: FileList) => void;
  onRemove: (docId: string, idx: number) => void;
  uploading: string | null;
}) {
  const at = ACCOUNT_PRESETS[client.account_type];
  return (
    <div style={{ minHeight: "100vh", background: "#f7f8fa", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: "#1a1a2e", padding: "18px 28px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>← Volver</button>
        <div>
          <span style={{ color: "white", fontWeight: 600, fontSize: 18 }}>{client.name}</span>
          {at && <span style={{ marginLeft: 10, background: at.color, color: "white", fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20 }}>{at.label}</span>}
        </div>
      </div>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
        {docs.map(doc => {
          if (doc.label.startsWith("──")) return (
            <div key={doc.id} style={{ background: "#1a1a2e", color: "white", borderRadius: 10, padding: "12px 18px", marginBottom: 12, marginTop: 4, fontSize: 13, fontWeight: 700 }}>
              👥 Documentación de accionistas (10%+) y firmantes autorizados
            </div>
          );
          const hasFiles = doc.files?.length > 0;
          return (
            <div key={doc.id} style={{ background: "white", borderRadius: 14, marginBottom: 10, border: "2px solid " + (hasFiles ? "#d1fae5" : "#e5e7eb"), overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 20 }}>{doc.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e", lineHeight: 1.4 }}>{doc.label}</div>
                  {doc.note && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{doc.note}</div>}
                </div>
                <div style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: hasFiles ? "#d1fae5" : "#fef9ec", color: hasFiles ? "#15803d" : "#b45309", whiteSpace: "nowrap" }}>
                  {hasFiles ? `✓ ${doc.files.length} archivo${doc.files.length > 1 ? "s" : ""}` : "Pendiente"}
                </div>
              </div>
              <div style={{ padding: "0 18px 14px" }}>
                <FileList files={doc.files || []} onRemove={idx => onRemove(doc.id, idx)} />
                <UploadArea onFiles={fl => onUpload(doc.id, fl)} uploading={uploading === doc.id} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [allDocs, setAllDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", account_type: "banesco_personal" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [adminUploading, setAdminUploading] = useState<string | null>(null);

  const load = async () => {
    try {
      const c = await sbGet("clients", "order=created_at.desc");
      const d = await sbGet("documents", "order=sort_order.asc");
      setClients(c || []);
      setAllDocs(parseDocs(d || []));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const docsForClient = (cid: string) => allDocs.filter(d => d.client_id === cid);

  const handleCreate = async (docRows: FormDoc[]) => {
    if (!form.name.trim()) { setSaveError("El nombre del cliente es requerido."); return; }
    setSaving(true); setSaveError("");
    try {
      const clientId = generateId();
      await sbPost("clients", { id: clientId, name: form.name.trim(), description: form.description.trim(), account_type: form.account_type, created_at: new Date().toLocaleString("es-AR") });
      for (let i = 0; i < docRows.length; i++) {
        const d = docRows[i];
        await sbPost("documents", { id: d.isSection ? generateId() : d.id, client_id: clientId, label: d.label, icon: d.icon, required: d.required, note: d.note, files: "[]", sort_order: i });
      }
      await load();
      setForm({ name: "", description: "", account_type: "banesco_personal" });
      setShowForm(false);
    } catch (e: unknown) { setSaveError("Error al guardar: " + (e instanceof Error ? e.message : String(e))); }
    setSaving(false);
  };

  const handleEdit = async (docRows: FormDoc[]) => {
    if (!editing) return;
    setSaving(true);
    try {
      await sbDelete("documents", `client_id=eq.${editing}`);
      for (let i = 0; i < docRows.length; i++) {
        const d = docRows[i];
        await sbPost("documents", { id: d.isSection ? generateId() : d.id, client_id: editing, label: d.label, icon: d.icon, required: d.required, note: d.note, files: JSON.stringify(d.files || []), sort_order: i });
      }
      await load();
      setEditing(null);
    } catch (e) { alert("Error al guardar: " + e); }
    setSaving(false);
  };

  const handleDelete = async (cid: string) => {
    await sbDelete("documents", `client_id=eq.${cid}`);
    await sbDelete("clients", `id=eq.${cid}`);
    await load();
    setConfirmDelete(null);
  };

  const handleAdminUpload = async (cid: string, docId: string, fl: FileList) => {
    setAdminUploading(docId);
    try {
      const newFiles: UploadedFile[] = [];
      for (let i = 0; i < fl.length; i++) {
        const { url, name } = await uploadFile(cid, docId, fl[i]);
        newFiles.push({ name, url, date: new Date().toLocaleString("es-AR") });
      }
      const doc = allDocs.find(d => d.id === docId)!;
      const updated = [...(doc.files || []), ...newFiles];
      await sbPatch("documents", `id=eq.${docId}`, { files: JSON.stringify(updated) });
      await load();
    } catch { alert("Error al subir el archivo."); }
    setAdminUploading(null);
  };

  const handleAdminRemove = async (docId: string, idx: number) => {
    const doc = allDocs.find(d => d.id === docId)!;
    const updated = doc.files.filter((_, i) => i !== idx);
    await sbPatch("documents", `id=eq.${docId}`, { files: JSON.stringify(updated) });
    await load();
  };

  const copyLink = (cid: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/?c=${cid}`);
    setCopiedId(cid); setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#888" }}>Cargando...</div>;

  if (viewing) {
    const client = clients.find(c => c.id === viewing);
    if (!client) { setViewing(null); return null; }
    return <AdminFilesView client={client} docs={docsForClient(viewing)} onBack={() => setViewing(null)} onUpload={(did, fl) => handleAdminUpload(viewing, did, fl)} onRemove={handleAdminRemove} uploading={adminUploading} />;
  }

  if (editing) {
    const client = clients.find(c => c.id === editing);
    if (!client) { setEditing(null); return null; }
    return (
      <div style={{ minHeight: "100vh", background: "#f7f8fa", fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ background: "#1a1a2e", padding: "18px 28px", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => setEditing(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>← Volver</button>
          <span style={{ color: "white", fontWeight: 600, fontSize: 18 }}>Editar documentos: {client.name}</span>
        </div>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, border: "2px solid #6366f1", boxShadow: "0 4px 24px rgba(99,102,241,0.1)" }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#1a1a2e", marginBottom: 4 }}>{client.name}</div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>⚠️ Los archivos ya recibidos se conservarán.</div>
            {saving ? <div style={{ color: "#6366f1" }}>Guardando...</div> :
              <DocForm initialDocs={docsForClient(editing)} accountType={client.account_type} saveLabel="Guardar cambios" onSave={handleEdit} onCancel={() => setEditing(null)} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f7f8fa", fontFamily: "'Segoe UI', sans-serif" }}>
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 32, width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 28, textAlign: "center", marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: 18, textAlign: "center", marginBottom: 8 }}>¿Eliminar cliente?</div>
            <div style={{ fontSize: 13, color: "#666", textAlign: "center", marginBottom: 24 }}>Se eliminará <strong>{clients.find(c => c.id === confirmDelete)?.name}</strong> y todos sus documentos. No se puede deshacer.</div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, background: "#eee", color: "#555", border: "none", padding: "12px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{ flex: 1, background: "#ef4444", color: "white", border: "none", padding: "12px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "#1a1a2e", padding: "24px 32px", color: "white" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "#7b7fa3", letterSpacing: 2, textTransform: "uppercase" }}>Panel de administración</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>Mis Clientes</div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => { setSaveError(""); setShowForm(true); }} style={{ background: "#6366f1", color: "white", border: "none", padding: "12px 22px", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>+ Nuevo cliente</button>
            <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "none", padding: "12px 18px", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>Salir</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
        {showForm && (
          <div style={{ background: "white", borderRadius: 16, padding: 28, marginBottom: 28, border: "2px solid #6366f1", boxShadow: "0 4px 24px rgba(99,102,241,0.1)" }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20, color: "#1a1a2e" }}>Nuevo cliente</div>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 10 }}>TIPO DE CUENTA</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8, marginBottom: 24 }}>
              {Object.entries(ACCOUNT_PRESETS).map(([key, at]) => (
                <button key={key} onClick={() => setForm(f => ({ ...f, account_type: key }))}
                  style={{ padding: "10px 14px", borderRadius: 10, border: "2px solid " + (form.account_type === key ? at.color : "#e5e7eb"), background: form.account_type === key ? at.color : "white", color: form.account_type === key ? "white" : "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                  {at.label}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>NOMBRE DEL CLIENTE *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: María González"
                  style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>DESCRIPCIÓN / NOTA (opcional)</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ej: Referido por Juan"
                  style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>

            {saveError && <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>{saveError}</div>}
            {saving ? <div style={{ color: "#6366f1", padding: "10px 0" }}>Guardando...</div> :
              <DocForm initialDocs={[]} accountType={form.account_type} saveLabel="Crear cliente" onSave={handleCreate} onCancel={() => { setShowForm(false); setSaveError(""); setForm({ name: "", description: "", account_type: "banesco_personal" }); }} />}
          </div>
        )}

        {clients.length === 0 && !showForm && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Sin clientes aún</div>
            <div style={{ fontSize: 14 }}>Creá el primer cliente para empezar</div>
          </div>
        )}

        {clients.map((client: Client) => {
          const docs = docsForClient(client.id).filter(d => !d.label.startsWith("──"));
          const received = docs.filter(d => d.files?.length > 0).length;
          const pct = docs.length ? Math.round((received / docs.length) * 100) : 0;
          const allDone = received === docs.length && docs.length > 0;
          const at = ACCOUNT_PRESETS[client.account_type];
          return (
            <div key={client.id} style={{ background: "white", borderRadius: 14, marginBottom: 16, padding: "20px 24px", border: "1.5px solid " + (allDone ? "#d1fae5" : "#e5e7eb"), boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, fontSize: 17, color: "#1a1a2e" }}>{client.name}</div>
                    {at && <span style={{ fontSize: 11, fontWeight: 700, background: at.color, color: "white", padding: "2px 10px", borderRadius: 20 }}>{at.label}</span>}
                  </div>
                  {client.description && <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>{client.description}</div>}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {docs.map(doc => (
                      <span key={doc.id} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: doc.files?.length > 0 ? "#d1fae5" : "#fef9ec", color: doc.files?.length > 0 ? "#15803d" : "#b45309" }}>
                        {doc.files?.length > 0 ? "✓" : "⏳"} {doc.label.length > 22 ? doc.label.slice(0, 22) + "…" : doc.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "center", minWidth: 68 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: allDone ? "#16a34a" : "#6366f1" }}>{pct}%</div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>{received}/{docs.length}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <button onClick={() => copyLink(client.id)} style={{ background: copiedId === client.id ? "#d1fae5" : "#f3f4f6", color: copiedId === client.id ? "#15803d" : "#374151", border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>
                    {copiedId === client.id ? "✓ Copiado" : "📋 Copiar link"}
                  </button>
                  <button onClick={() => setViewing(client.id)} style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 12 }}>📁 Ver archivos</button>
                  <button onClick={() => setEditing(client.id)} style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 12 }}>✏️ Editar docs</button>
                  <button onClick={() => setConfirmDelete(client.id)} style={{ background: "#fff5f5", color: "#ef4444", border: "1px solid #fecaca", padding: "8px 12px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 12 }}>🗑️ Eliminar</button>
                </div>
              </div>
              <div style={{ marginTop: 10, padding: "7px 12px", background: "#f8f9ff", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#888" }}>Link del cliente:</span>
                <span style={{ fontSize: 11, color: "#6366f1", fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{window.location.origin}/?c={client.id}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const clientId = params.get("c");
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("admin_auth") === "1");
  if (clientId) return <ClientView clientId={clientId} />;
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  return <AdminPanel onLogout={() => { sessionStorage.removeItem("admin_auth"); setAuthed(false); }} />;
}
