"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PdfCanvas, type PageSize } from "@/components/pdf/pdf-canvas";
import { FIELD_META, type FieldType } from "@/lib/fields";
import { Button } from "@/components/ui/button";
import { signWithFields } from "../actions";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";
import { PenLine } from "lucide-react";

export interface SignerField {
  id: string;
  type: FieldType;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string | null;
  required: boolean;
}

export function FieldSigner({
  assignmentId,
  dataUrl,
  fields,
  autoValues,
}: {
  assignmentId: string;
  dataUrl: string;
  fields: SignerField[];
  autoValues: Record<string, string>;
}) {
  const router = useRouter();
  const [sigs, setSigs] = useState<Record<string, string>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Signature modal
  const [signingId, setSigningId] = useState<string | null>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  const confirmSignature = () => {
    const png = padRef.current?.toDataURL();
    if (!png) {
      setError("Please draw your signature");
      return;
    }
    if (signingId) setSigs((p) => ({ ...p, [signingId]: png }));
    setSigningId(null);
    setError(null);
  };

  const requiredSigs = fields.filter(
    (f) => FIELD_META[f.type].category === "signature" && f.required,
  );
  const allSigned = requiredSigs.every((f) => sigs[f.id]);

  const submit = () => {
    if (!allSigned) return setError("Please complete all signature fields");
    if (!consent) return setError("You must agree to sign electronically");
    setError(null);
    start(async () => {
      const inputs: Record<string, { text?: string; signaturePng?: string }> = {};
      for (const f of fields) {
        const cat = FIELD_META[f.type].category;
        if (cat === "signature" && sigs[f.id]) inputs[f.id] = { signaturePng: sigs[f.id] };
        else if (cat === "input") inputs[f.id] = { text: texts[f.id] ?? "" };
      }
      const res = await signWithFields(assignmentId, inputs);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  };

  const renderOverlay = (pageIndex: number, _size: PageSize) => (
    <div className="h-full w-full">
      {fields
        .filter((f) => f.page === pageIndex)
        .map((f) => {
          const cat = FIELD_META[f.type].category;
          const style = {
            left: `${f.x * 100}%`,
            top: `${f.y * 100}%`,
            width: `${f.w * 100}%`,
            height: `${f.h * 100}%`,
          } as const;

          if (cat === "signature") {
            const png = sigs[f.id];
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSigningId(f.id)}
                className={`absolute flex items-center justify-center overflow-hidden rounded border-2 ${
                  png ? "border-green-500 bg-white" : "border-brand-500 bg-brand-50/80 hover:bg-brand-100"
                }`}
                style={style}
              >
                {png ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={png} alt="signature" className="h-full w-full object-contain" />
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-brand-700">
                    <PenLine className="h-3 w-3" /> Sign
                  </span>
                )}
              </button>
            );
          }

          if (cat === "input") {
            return (
              <input
                key={f.id}
                value={texts[f.id] ?? ""}
                onChange={(e) => setTexts((p) => ({ ...p, [f.id]: e.target.value }))}
                placeholder={f.label ?? "Type here"}
                className="absolute rounded border-2 border-amber-500 bg-amber-50/80 px-1 text-[11px] text-slate-800 outline-none"
                style={style}
              />
            );
          }

          // auto
          return (
            <div
              key={f.id}
              className="absolute flex items-center overflow-hidden rounded border-2 border-emerald-500 bg-emerald-50/80 px-1 text-[11px] text-emerald-800"
              style={style}
              title="Auto-filled from your profile"
            >
              <span className="truncate">{autoValues[f.id] || FIELD_META[f.type].label}</span>
            </div>
          );
        })}
    </div>
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-100 p-3">
        <p className="mb-3 text-xs text-slate-500">
          <span className="font-medium text-brand-700">Blue</span> = sign ·{" "}
          <span className="font-medium text-emerald-700">Green</span> = auto-filled from your profile ·{" "}
          <span className="font-medium text-amber-700">Amber</span> = type in
        </p>
        <div className="overflow-x-auto">
          <PdfCanvas dataUrl={dataUrl} maxWidth={720} renderPageOverlay={renderOverlay} />
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
        />
        <span>
          I agree that my electronic signature is the legal equivalent of my
          handwritten signature and consent to sign this document electronically.
        </span>
      </label>

      <Button onClick={submit} disabled={pending} size="lg" className="w-full sm:w-auto">
        {pending ? "Finalizing…" : "Finish & sign"}
      </Button>

      {signingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold text-slate-900">Draw your signature</h3>
            <SignaturePad ref={padRef} />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSigningId(null)}>
                Cancel
              </Button>
              <Button onClick={confirmSignature}>Apply signature</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
