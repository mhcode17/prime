"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { updateCompanyLogo, removeCompanyLogo } from "./actions";
import { Button } from "@/components/ui/button";
import { ImagePlus, Trash2, Building2 } from "lucide-react";

export function LogoSettings({ logo }: { logo: string | null }) {
  const [state, action, uploading] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(updateCompanyLogo, undefined);
  const [removing, startRemove] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const current = preview ?? logo;

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    // auto-submit once a file is chosen
    formRef.current?.requestSubmit();
  };

  const remove = () => {
    if (!window.confirm("Remove the company logo?")) return;
    setPreview(null);
    startRemove(async () => {
      await removeCompanyLogo();
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  return (
    <form ref={formRef} action={action} className="space-y-3">
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      )}
      {state?.ok && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Logo saved.</div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt="Company logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <Building2 className="h-8 w-8 text-slate-300" />
          )}
        </div>

        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            name="logo"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={onPick}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading || removing}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              {uploading ? "Uploading…" : current ? "Change logo" : "Upload logo"}
            </Button>
            {logo && (
              <Button type="button" size="sm" variant="ghost" disabled={uploading || removing} onClick={remove}>
                <Trash2 className="h-4 w-4" /> {removing ? "Removing…" : "Remove"}
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-400">PNG or JPEG, up to 1.5 MB. Used across the app and on generated PDFs.</p>
        </div>
      </div>
    </form>
  );
}
