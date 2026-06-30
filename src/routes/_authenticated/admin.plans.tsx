import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ngn } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, Save, ImagePlus } from "lucide-react";
import { SuccessAnimation, fileToCompressedDataUrl } from "@/components/success-animation";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  component: PlansPage,
});

type Category = "thrift" | "agriculture" | "property" | "finance" | "poultry";
type Plan = {
  id: string; name: string; icon: string; category: Category;
  roi: number; duration_days: number; min_amount: number;
  description: string; active: boolean;
  subtype: string | null; image_url: string | null;
};

const CATS: Category[] = ["thrift","agriculture","property","finance","poultry"];
const POULTRY_SUBTYPES = ["chicken","pig"];

function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [draft, setDraft] = useState<Partial<Plan>>({
    name: "", icon: "💰", category: "thrift", roi: 10, duration_days: 30, min_amount: 5000, description: "", active: true, subtype: null, image_url: null,
  });
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("plans").select("*").order("created_at", { ascending: false });
    setPlans((data ?? []) as Plan[]);
  }
  useEffect(() => { load(); }, []);

  async function save(p: Plan) {
    const { error } = await supabase.from("plans").update({
      name: p.name, icon: p.icon, category: p.category, roi: p.roi,
      duration_days: p.duration_days, min_amount: p.min_amount,
      description: p.description, active: p.active,
      subtype: p.category === "poultry" ? (p.subtype ?? "chicken") : null,
      image_url: p.image_url,
    }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    setSuccess("Plan saved");
  }

  async function del(id: string) {
    if (!confirm("Delete plan?")) return;
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  async function create() {
    if (!draft.name) { toast.error("Name required"); return; }
    const payload = {
      ...draft,
      subtype: draft.category === "poultry" ? (draft.subtype ?? "chicken") : null,
    };
    const { error } = await supabase.from("plans").insert(payload as never);
    if (error) { toast.error(error.message); return; }
    setDraft({ name: "", icon: "💰", category: "thrift", roi: 10, duration_days: 30, min_amount: 5000, description: "", active: true, subtype: null, image_url: null });
    setSuccess("Plan created");
    load();
  }

  async function pickImageForDraft(f: File) {
    try {
      const url = await fileToCompressedDataUrl(f);
      setDraft((d) => ({ ...d, image_url: url }));
    } catch (e) { toast.error("Could not read image"); }
  }
  async function pickImageForPlan(id: string, f: File) {
    try {
      const url = await fileToCompressedDataUrl(f);
      setPlans((arr) => arr.map((x) => x.id === id ? { ...x, image_url: url } : x));
    } catch (e) { toast.error("Could not read image"); }
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-bold">Plans</h1>

      <div className="card-neon rounded-2xl p-5">
        <div className="font-semibold mb-3">Create new plan</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Input label="Name" v={draft.name ?? ""} on={(v) => setDraft({ ...draft, name: v })} />
          <Input label="Icon (emoji)" v={draft.icon ?? ""} on={(v) => setDraft({ ...draft, icon: v })} />
          <Select label="Category" v={draft.category ?? ""} on={(v) => setDraft({ ...draft, category: v as Category })} options={CATS} />
          {draft.category === "poultry" && (
            <Select label="Sub-type" v={draft.subtype ?? "chicken"} on={(v) => setDraft({ ...draft, subtype: v })} options={POULTRY_SUBTYPES} />
          )}
          <Input label="ROI %" type="number" v={String(draft.roi ?? 0)} on={(v) => setDraft({ ...draft, roi: +v })} />
          <Input label="Duration (days)" type="number" v={String(draft.duration_days ?? 0)} on={(v) => setDraft({ ...draft, duration_days: +v })} />
          <Input label="Min amount" type="number" v={String(draft.min_amount ?? 0)} on={(v) => setDraft({ ...draft, min_amount: +v })} />
          <Input label="Description" v={draft.description ?? ""} on={(v) => setDraft({ ...draft, description: v })} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary text-xs font-semibold cursor-pointer hover:bg-primary/10">
            <ImagePlus className="h-4 w-4" />
            {draft.image_url ? "Change image" : "Upload image"}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImageForDraft(f); }} />
          </label>
          {draft.image_url && (
            <img src={draft.image_url} alt="" className="h-12 w-12 rounded-lg object-cover border border-border" />
          )}
          <button onClick={create} className="ml-auto px-4 py-2.5 rounded-xl gradient-sky text-primary-foreground font-semibold flex items-center justify-center gap-2 glow-neon">
            <Plus className="h-4 w-4" /> Create
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {plans.map((p) => (
          <div key={p.id} className="card-3d rounded-2xl p-4">
            <div className="flex gap-4 items-start">
              <div className="shrink-0">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-20 w-20 rounded-xl object-cover border border-border" />
                ) : (
                  <div className="h-20 w-20 rounded-xl bg-secondary grid place-items-center text-3xl">{p.icon}</div>
                )}
                <label className="mt-2 flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-secondary text-[10px] font-semibold cursor-pointer hover:bg-primary/10">
                  <ImagePlus className="h-3 w-3" /> Image
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImageForPlan(p.id, f); }} />
                </label>
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-7 gap-2 items-end">
              <Input label="Icon" v={p.icon} on={(v) => setPlans((arr) => arr.map((x) => x.id === p.id ? { ...x, icon: v } : x))} />
              <Input label="Name" v={p.name} on={(v) => setPlans((arr) => arr.map((x) => x.id === p.id ? { ...x, name: v } : x))} />
              <Select label="Category" v={p.category} on={(v) => setPlans((arr) => arr.map((x) => x.id === p.id ? { ...x, category: v as Category } : x))} options={CATS} />
              {p.category === "poultry" && (
                <Select label="Sub-type" v={p.subtype ?? "chicken"} on={(v) => setPlans((arr) => arr.map((x) => x.id === p.id ? { ...x, subtype: v } : x))} options={POULTRY_SUBTYPES} />
              )}
              <Input label="ROI %" type="number" v={String(p.roi)} on={(v) => setPlans((arr) => arr.map((x) => x.id === p.id ? { ...x, roi: +v } : x))} />
              <Input label="Days" type="number" v={String(p.duration_days)} on={(v) => setPlans((arr) => arr.map((x) => x.id === p.id ? { ...x, duration_days: +v } : x))} />
              <Input label="Min" type="number" v={String(p.min_amount)} on={(v) => setPlans((arr) => arr.map((x) => x.id === p.id ? { ...x, min_amount: +v } : x))} />
              <div className="flex gap-2">
                <button onClick={() => save(p)} className="flex-1 py-2 rounded-xl gradient-sky text-primary-foreground font-semibold text-xs flex items-center justify-center gap-1">
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
                <button onClick={() => del(p.id)} className="py-2 px-3 rounded-xl bg-destructive/20 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              </div>
            </div>
            <Input label="Description" v={p.description} on={(v) => setPlans((arr) => arr.map((x) => x.id === p.id ? { ...x, description: v } : x))} />
            <div className="flex items-center justify-between mt-2 text-xs">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={p.active} onChange={(e) => setPlans((arr) => arr.map((x) => x.id === p.id ? { ...x, active: e.target.checked } : x))} />
                Active (visible to users)
              </label>
              <span className="text-muted-foreground">Min {ngn(p.min_amount)} · +{p.roi}%</span>
            </div>
          </div>
        ))}
      </div>

      <SuccessAnimation show={!!success} message={success ?? ""} onDone={() => setSuccess(null)} />
    </div>
  );
}

function Input({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string; }) {
  return (
    <label className="block text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input type={type} value={v} onChange={(e) => on(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none text-sm" />
    </label>
  );
}
function Select({ label, v, on, options }: { label: string; v: string; on: (v: string) => void; options: string[]; }) {
  return (
    <label className="block text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select value={v} onChange={(e) => on(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none text-sm capitalize">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
