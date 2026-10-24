"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { SelectField, TextField } from "@/components/fields";
import { RuleRow } from "@/components/RuleRow";
import { StatusBadge } from "@/components/StatusBadge";
import { exampleStudent } from "@/lib/fixtures/section5";
import { formatINR, formatLakh } from "@/lib/format";
import { match, type RuleCheck } from "@/lib/match";
import {
  APPLIES_VIA,
  BENEFIT_TYPES,
  DOCUMENTS,
  EDITOR_OPERATORS,
  editorFields,
  OPERATOR_LABELS,
  PROVIDER_OPTIONS,
  sourceOptions,
  type FieldInfo,
} from "@/lib/registry/options";
import { publishProblems, type SchemeDraft } from "@/lib/registry/scheme-input";
import type { SchemeBadge } from "@/lib/registry/status";
import type { PublishableRule } from "@/lib/rules/schema";
import { ruleValueSchema } from "@/lib/rules/schema";
import type { SnapshotScheme } from "@/lib/rules/snapshot";
import { STATES } from "@/lib/states";
import { publishSchemeAction, saveSchemeAction, withdrawSchemeAction } from "./actions";

type Op = (typeof EDITOR_OPERATORS)[number] | "PERCENTILE_GTE";

interface UiRule {
  key: number;
  group: number;
  field: string;
  op: Op | string;
  value: unknown;
  quote: string;
  sourceUrl: string;
  ambiguous: boolean;
}

export interface EditorScheme {
  id: number;
  badge: SchemeBadge;
  lastVerifiedAt: string | null;
  draft: Omit<SchemeDraft, "trackerId" | "stateCode" | "source" | "appliesVia" | "sourceFormat" | "amountText" | "reviewNotes" | "opensOn" | "deadline" | "rules"> & {
    trackerId: string;
    stateCode: string;
    source: string;
    appliesVia: string;
    sourceFormat: "HTML" | "PDF" | "";
    amountText: string;
    reviewNotes: string;
    opensOn: string;
    deadline: string;
    rules: Omit<UiRule, "key">[];
  };
}

type Draft = Omit<EditorScheme["draft"], "rules"> & { rules: UiRule[] };

const EMPTY: EditorScheme["draft"] = {
  trackerId: "",
  slug: "",
  name: "",
  provider: "CENTRAL",
  stateCode: "",
  source: "",
  appliesVia: "",
  sourceFormat: "",
  officialUrl: "",
  amountText: "",
  reviewNotes: "",
  benefitTypes: [],
  documents: [],
  cannotCombineWith: [],
  opensOn: "",
  deadline: "",
  rules: [],
};

let nextKey = 1;
const withKeys = (rules: Omit<UiRule, "key">[]): UiRule[] => rules.map((r) => ({ ...r, key: nextKey++ }));
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function opsFor(f: FieldInfo | undefined): Op[] {
  if (!f) return ["EQ"];
  if (f.kind === "number") return ["LTE", "GTE", "BETWEEN", "EQ"];
  if (f.kind === "boolean") return ["IS_TRUE"];
  return f.options.some((o) => o.value === "yes") ? ["IS_TRUE", "EQ", "IN"] : ["EQ", "IN"];
}

function defaultValue(f: FieldInfo | undefined, op: string): unknown {
  if (op === "IS_TRUE") return true;
  if (op === "BETWEEN") return [null, null];
  if (op === "IN") return [];
  if (f?.kind === "number") return null;
  return f?.options[0]?.value ?? "";
}

// What the save action receives: the draft with rule keys dropped.
const toInput = (d: Draft) => ({
  ...d,
  rules: d.rules.map((r) => ({
    group: r.group,
    field: r.field,
    op: r.op,
    value: r.value,
    quote: r.quote,
    sourceUrl: r.sourceUrl,
    ambiguous: r.ambiguous,
  })),
});

export function SchemeEditor({ initial }: { initial?: EditorScheme }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => ({
    ...(initial?.draft ?? EMPTY),
    rules: withKeys(initial?.draft.rules ?? []),
  }));
  const [saved, setSaved] = useState(() => JSON.stringify(toInput(draft)));
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "warning" | "success" | "info"; title: string; body?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const id = initial?.id;
  const badge = initial?.badge ?? "draft";
  const isLive = badge !== "draft" && badge !== "onHold" && badge !== "retired";
  const dirty = JSON.stringify(toInput(draft)) !== saved;
  const fields = useMemo(() => editorFields(draft.provider === "STATE" ? draft.stateCode || null : null), [draft.provider, draft.stateCode]);
  const fieldInfo = (key: string) => fields.find((f) => f.key === key);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setRule = (key: number, patch: Partial<UiRule>) =>
    setDraft((d) => ({ ...d, rules: d.rules.map((r) => (r.key === key ? { ...r, ...patch } : r)) }));
  const toggle = (key: "benefitTypes" | "documents", item: string) =>
    set(key, draft[key].includes(item) ? draft[key].filter((x) => x !== item) : [...draft[key], item]);

  const addRule = () => {
    const field = fields[0];
    const op = opsFor(field)[0];
    const group = Math.max(0, ...draft.rules.map((r) => r.group)) + 1;
    set("rules", [
      ...draft.rules,
      { key: nextKey++, group, field: field.key, op, value: defaultValue(field, op), quote: "", sourceUrl: draft.officialUrl, ambiguous: false },
    ]);
  };

  const quoted = draft.rules.filter((r) => r.quote.trim() && r.sourceUrl.trim()).length;
  const problems = publishProblems({
    officialUrl: draft.officialUrl,
    rules: draft.rules as unknown as SchemeDraft["rules"],
  });

  // Live test against the PRD section 5 student, using every rule that is complete enough to run.
  const test = useMemo(() => {
    const runnable = draft.rules.filter((r) => ruleValueSchema.safeParse(r).success) as unknown as PublishableRule[];
    if (runnable.length === 0) return null;
    return match(exampleStudent, { rules: runnable } as unknown as SnapshotScheme);
  }, [draft.rules]);

  const save = () =>
    startTransition(async () => {
      setMessage(null);
      const result = await saveSchemeAction(toInput(draft), id);
      if (!result.ok) {
        setErrors(result.errors);
        setMessage({ tone: "warning", title: result.message });
        return;
      }
      setErrors({});
      if (id === undefined) {
        // Next keeps this page alive in the background, so clear it for the next "Add scheme".
        const blank = { ...EMPTY, rules: [] };
        setDraft(blank);
        setSaved(JSON.stringify(toInput(blank)));
        setSlugTouched(false);
        router.replace(`/admin/schemes/${result.id}`);
        return;
      }
      setSaved(JSON.stringify(toInput(draft)));
      setMessage({ tone: "success", title: "Saved" });
      router.refresh();
    });

  const publish = () =>
    startTransition(async () => {
      setMessage(null);
      const result = await publishSchemeAction(id!);
      if (!result.ok) {
        setMessage({ tone: "warning", title: "Not published", body: result.problems.join(" · ") });
        return;
      }
      setMessage({
        tone: "success",
        title: `Published. Students get rules version ${result.version}.`,
        body: result.note,
      });
      router.refresh();
    });

  const withdraw = (status: "ON_HOLD" | "RETIRED") =>
    startTransition(async () => {
      const { version } = await withdrawSchemeAction(id!, status);
      setMessage({ tone: "info", title: `${status === "ON_HOLD" ? "On hold" : "Retired"}. Students get rules version ${version} without it.` });
      router.refresh();
    });

  return (
    <>
      <Link href="/admin" className="flex min-h-8 items-center gap-1 text-sm font-semibold text-navy">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        Registry
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[28px] leading-[34px] font-bold">{draft.name || "New scheme"}</h1>
        <StatusBadge status={badge} />
        {dirty && <StatusBadge status="draft" label="Unsaved changes" />}
      </div>
      {message && (
        <Alert tone={message.tone} title={message.title}>
          {message.body}
        </Alert>
      )}
      {initial?.draft.reviewNotes && (
        <Alert tone="warning" title="Gaps to close before publishing">
          <ul className="list-disc pl-5">
            {initial.draft.reviewNotes.split("\n").filter(Boolean).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-5">
          <Section title="Scheme">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-3.5">
              <TextField fieldId="name" label="Name" value={draft.name} error={errors.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value, slug: slugTouched ? d.slug : slugify(e.target.value) }))} />
              <TextField fieldId="slug" label="Slug (scheme page address)" value={draft.slug} error={errors.slug}
                onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} />
              <TextField fieldId="tracker" label="Tracker id" placeholder="C1, M4, P2 …" hint="Row in the Phase 0 tracker" value={draft.trackerId} error={errors.trackerId}
                onChange={(e) => set("trackerId", e.target.value.toUpperCase())} />
              <SelectField fieldId="provider" label="Type" groups={[{ options: PROVIDER_OPTIONS }]} value={draft.provider} error={errors.provider}
                onChange={(e) => setDraft((d) => ({ ...d, provider: e.target.value as Draft["provider"], stateCode: e.target.value === "STATE" ? d.stateCode : "" }))} />
              {draft.provider === "STATE" && (
                <SelectField fieldId="state" label="State" placeholder="Pick a state" groups={[{ options: STATES.map((s) => ({ value: s.code, label: s.name })) }]}
                  value={draft.stateCode} error={errors.stateCode} onChange={(e) => set("stateCode", e.target.value)} />
              )}
              <SelectField fieldId="source" label="Source" placeholder="Pick a source" groups={sourceOptions()} value={draft.source} error={errors.source}
                onChange={(e) => set("source", e.target.value)} />
              <SelectField fieldId="applies" label="Applies via" placeholder="Pick one" groups={[{ options: APPLIES_VIA }]} value={draft.appliesVia}
                onChange={(e) => set("appliesVia", e.target.value)} />
              <TextField fieldId="url" label="Official page or PDF" inputMode="url" value={draft.officialUrl} error={errors.officialUrl}
                onChange={(e) => set("officialUrl", e.target.value)} />
              <TextField fieldId="amount" label="Amount, as students see it" value={draft.amountText}
                onChange={(e) => set("amountText", e.target.value)} />
              <TextField fieldId="opens" label="Opens (this cycle)" type="date" value={draft.opensOn} error={errors.opensOn}
                onChange={(e) => set("opensOn", e.target.value)} />
              <TextField fieldId="deadline" label="Deadline (this cycle)" type="date" value={draft.deadline} error={errors.deadline}
                onChange={(e) => set("deadline", e.target.value)} />
              <TextField fieldId="combine" label="Cannot be combined with" placeholder="C2, M4" hint="Tracker ids, comma-separated"
                value={draft.cannotCombineWith.join(", ")}
                onChange={(e) => set("cannotCombineWith", e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold">Source format</span>
              {(["HTML", "PDF"] as const).map((f) => (
                <Chip key={f} label={f === "HTML" ? "HTML page" : "PDF"} selected={draft.sourceFormat === f}
                  onClick={() => set("sourceFormat", draft.sourceFormat === f ? "" : f)} />
              ))}
            </div>
            <Checklist legend="Benefit" items={BENEFIT_TYPES} selected={draft.benefitTypes} onToggle={(i) => toggle("benefitTypes", i)} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-[13px] font-semibold">Gaps to close before publishing</label>
              <textarea id="notes" rows={3} value={draft.reviewNotes} placeholder="One per line. Students never see this."
                onChange={(e) => set("reviewNotes", e.target.value)}
                className="w-full rounded-lg border border-field px-2.5 py-2 text-sm leading-5 outline-none focus:border-navy" />
            </div>
          </Section>

          <Section
            title="Eligibility rules"
            intro={`Rules in the same group: any one passes. Different groups: all must pass.${draft.provider === "STATE" && draft.stateCode ? ` State fields (${draft.stateCode}.*) come from the ${draft.stateCode} config.` : ""}`}
            action={<Button variant="secondary" onClick={addRule}>Add rule</Button>}
          >
            {draft.rules.length === 0 && <p className="text-sm text-slate">No rules yet.</p>}
            <ol className="flex flex-col gap-3">
              {draft.rules.map((r, i) => (
                <RuleEditor key={r.key} index={i} rule={r} fields={fields} info={fieldInfo(r.field)} errors={errors}
                  officialUrl={draft.officialUrl}
                  onChange={(patch) => setRule(r.key, patch)}
                  onRemove={() => set("rules", draft.rules.filter((x) => x.key !== r.key))} />
              ))}
            </ol>
          </Section>

          <Section title="Documents for the student checklist" intro="Ticked items appear on the scheme page.">
            <Checklist items={DOCUMENTS} selected={draft.documents} onToggle={(i) => toggle("documents", i)} />
          </Section>
        </div>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-xl border border-line bg-white p-[18px]">
            <h2 className="text-base leading-[22px] font-semibold">Test with the example student</h2>
            <div className="font-mono text-xs leading-[17px] text-slate">
              {exampleStudent.domicile_state} · {formatINR(exampleStudent.family_income!)} · B.Tech yr {exampleStudent.year} · Class 12{" "}
              {exampleStudent.class12_pct}% · gender, category, CAP unknown
            </div>
            {test ? (
              <>
                <span className="self-start">
                  <StatusBadge status={test.status} />
                </span>
                <ul className="flex flex-col gap-2">
                  {test.groups.flatMap((g) =>
                    g.checks.map((c, j) => (
                      <RuleRow key={`${g.group}-${j}`} result={g.outcome === "confirm" && c.outcome !== "pass" ? "confirm" : c.outcome}
                        text={`${c.rule.field} ${OPERATOR_LABELS[c.rule.op]} ${showValue(c.rule)}`} detail={gapNote(c, test.failed === c)} />
                    )),
                  )}
                </ul>
              </>
            ) : (
              <p className="text-sm text-slate">Add a complete rule to see how the matcher reads it.</p>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-line bg-white p-[18px]">
            <h2 className="text-base leading-[22px] font-semibold">Before publishing</h2>
            <ul className="flex flex-col gap-2">
              <RuleRow result={draft.officialUrl ? "pass" : "fail"} text="Official link added" detail="Checked to open when you publish" />
              <RuleRow result={draft.amountText && draft.deadline ? "pass" : "unknown"} text="Amount and deadline filled in" />
              <RuleRow result={draft.reviewNotes.trim() ? "unknown" : "pass"} text="Gaps closed"
                detail={draft.reviewNotes.trim() ? "Clear the gaps note once each item is checked" : undefined} />
              <RuleRow result={draft.rules.length > 0 && quoted === draft.rules.length ? "pass" : "fail"}
                text={`Every rule has a quote and link (${quoted} of ${draft.rules.length})`} />
              <RuleRow result={!dirty && id !== undefined ? "pass" : "fail"} text="Changes saved" />
            </ul>
            <Button onClick={publish} disabled={pending || dirty || id === undefined || problems.length > 0}>
              {isLive ? "Re-verify and publish" : "Mark verified and publish"}
            </Button>
            <Button variant="secondary" onClick={save} disabled={pending || (!dirty && id !== undefined)}>
              {isLive ? "Save changes" : "Save draft"}
            </Button>
            {id !== undefined && badge !== "draft" && badge !== "retired" && (
              <div className="flex flex-wrap gap-2">
                {badge !== "onHold" && <Button variant="secondary" className="flex-1" disabled={pending} onClick={() => withdraw("ON_HOLD")}>Put on hold</Button>}
                <Button variant="secondary" className="flex-1" disabled={pending} onClick={() => withdraw("RETIRED")}>Retire</Button>
              </div>
            )}
            <p className="text-xs leading-[17px] text-slate">
              Publishing stamps today as the last-verified date
              {initial?.lastVerifiedAt && ` (now ${new Date(initial.lastVerifiedAt).toLocaleDateString("en-IN")})`}. Students
              stop seeing it 90 days later unless you re-verify.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

function showValue(r: PublishableRule): string {
  if (r.op === "IS_TRUE") return "";
  if (r.op === "BETWEEN") return `${r.value[0]}–${r.value[1]}`;
  if (r.op === "IN") return r.value.join(", ");
  return String(r.value);
}

function gapNote(c: RuleCheck, isNearMiss: boolean): string | undefined {
  if (!c.gap) return undefined;
  const amount = c.rule.field === "family_income" ? formatLakh(c.gap.amount) : String(c.gap.amount);
  const pct = `${(c.gap.ratio * 100).toFixed(1).replace(/\.0$/, "")}%`;
  return `${amount} off the limit (${pct})${isNearMiss ? ", inside the 20% near-miss band" : ""}`;
}

function Section({ title, intro, action, children }: { title: string; intro?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[17px] leading-6 font-semibold">{title}</h2>
          {intro && <p className="text-[13px] leading-[18px] text-slate">{intro}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Checklist({ legend, items, selected, onToggle }: { legend?: string; items: string[]; selected: string[]; onToggle: (item: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      {legend && <legend className="mb-2 text-[13px] font-semibold">{legend}</legend>}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-x-4 gap-y-1 text-sm leading-5">
        {items.map((item) => (
          <label key={item} className="flex min-h-9 items-center gap-2.5">
            <input type="checkbox" className="size-[18px] accent-navy" checked={selected.includes(item)} onChange={() => onToggle(item)} />
            {item}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RuleEditor({
  index,
  rule,
  fields,
  info,
  errors,
  officialUrl,
  onChange,
  onRemove,
}: {
  index: number;
  rule: UiRule;
  fields: FieldInfo[];
  info: FieldInfo | undefined;
  errors: Record<string, string>;
  officialUrl: string;
  onChange: (patch: Partial<UiRule>) => void;
  onRemove: () => void;
}) {
  const p = `rules.${index}`;
  const id = `rule-${rule.key}`;
  const ops = opsFor(info);
  const missingQuote = !rule.quote.trim() || !rule.sourceUrl.trim();
  const err = (k: string) => errors[`${p}.${k}`];

  return (
    <li className={`flex flex-col gap-3 rounded-lg border p-3 ${missingQuote ? "border-warn-tint bg-warn-row" : "border-line"}`}>
      <div className="grid grid-cols-[80px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)] items-start gap-3 max-md:grid-cols-2">
        <TextField fieldId={`${id}-group`} label="Group" type="number" min={1} value={rule.group} error={err("group")}
          onChange={(e) => onChange({ group: Number(e.target.value) })} />
        <SelectField fieldId={`${id}-field`} label="Field" error={err("field")}
          groups={[{ options: fields.map((f) => ({ value: f.key, label: f.key })) }, ...(info ? [] : [{ options: [{ value: rule.field, label: `${rule.field} (not allowed here)` }] }])]}
          value={rule.field}
          onChange={(e) => {
            const f = fields.find((x) => x.key === e.target.value);
            const op = opsFor(f).includes(rule.op as Op) ? rule.op : opsFor(f)[0];
            onChange({ field: e.target.value, op, value: defaultValue(f, op) });
          }} />
        <SelectField fieldId={`${id}-op`} label="Operator" error={err("op")}
          groups={[{ options: ops.map((o) => ({ value: o, label: `${o} · ${OPERATOR_LABELS[o]}` })) }]}
          value={rule.op} onChange={(e) => onChange({ op: e.target.value, value: defaultValue(info, e.target.value) })} />
        <ValueEditor id={id} rule={rule} info={info} error={err("value")} onChange={(value) => onChange({ value })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-quote`} className="text-[13px] font-semibold">
          Exact quote from source {missingQuote && <b className="ml-1 font-semibold text-warn">Quote required to publish</b>}
        </label>
        <textarea id={`${id}-quote`} rows={2} value={rule.quote} onChange={(e) => onChange({ quote: e.target.value })}
          className="w-full rounded-lg border border-field px-2.5 py-2 font-mono text-[13px] leading-[18px] outline-none focus:border-navy" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 max-sm:grid-cols-1">
        <TextField fieldId={`${id}-src`} label="Quote's official page" inputMode="url" value={rule.sourceUrl} error={err("sourceUrl")}
          onChange={(e) => onChange({ sourceUrl: e.target.value })} />
        <Button variant="secondary" disabled={!officialUrl || rule.sourceUrl === officialUrl} onClick={() => onChange({ sourceUrl: officialUrl })}>
          Same as official link
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" className="size-[18px] accent-navy" checked={rule.ambiguous} onChange={(e) => onChange({ ambiguous: e.target.checked })} />
          Sources disagree: tell students to confirm on the official site
        </label>
        <button type="button" onClick={onRemove} className="min-h-9 text-sm text-warn underline">
          Remove rule {index + 1}
        </button>
      </div>
    </li>
  );
}

function ValueEditor({ id, rule, info, error, onChange }: { id: string; rule: UiRule; info: FieldInfo | undefined; error?: string; onChange: (v: unknown) => void }) {
  const num = (v: string) => (v === "" ? null : Number(v));
  if (rule.op === "IS_TRUE") {
    return <TextField fieldId={`${id}-value`} label="Value" value="yes" disabled readOnly />;
  }
  if (rule.op === "BETWEEN") {
    const [lo, hi] = Array.isArray(rule.value) ? rule.value : [null, null];
    return (
      <div className="grid grid-cols-2 gap-2">
        <TextField fieldId={`${id}-lo`} label="From" type="number" step="any" value={lo ?? ""} error={error} onChange={(e) => onChange([num(e.target.value), hi])} />
        <TextField fieldId={`${id}-hi`} label="To" type="number" step="any" value={hi ?? ""} onChange={(e) => onChange([lo, num(e.target.value)])} />
      </div>
    );
  }
  if (info?.kind === "number") {
    return (
      <TextField fieldId={`${id}-value`} label={rule.field === "family_income" ? "Value (₹ a year)" : "Value"} type="number" step="any"
        value={(rule.value as number | null) ?? ""} error={error} onChange={(e) => onChange(num(e.target.value))} />
    );
  }
  const options = info?.options ?? [];
  if (rule.op === "IN") {
    const values = Array.isArray(rule.value) ? (rule.value as string[]) : [];
    return (
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-semibold">Values</legend>
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => (
            <Chip key={o.value} label={o.label} selected={values.includes(o.value)}
              onClick={() => onChange(values.includes(o.value) ? values.filter((v) => v !== o.value) : [...values, o.value])} />
          ))}
        </div>
        {error && <span className="text-[13px] text-warn">{error}</span>}
      </fieldset>
    );
  }
  return (
    <SelectField fieldId={`${id}-value`} label="Value" error={error} groups={[{ options }]} value={String(rule.value ?? "")}
      onChange={(e) => onChange(e.target.value)} />
  );
}
