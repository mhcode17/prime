export function DocumentViewer({
  content,
  fileType,
  fileName,
}: {
  content: string | null;
  fileType: string | null;
  fileName: string | null;
}) {
  if (!content) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No content.
      </div>
    );
  }

  const isData = content.startsWith("data:");
  const isPdf = fileType === "application/pdf" || content.startsWith("data:application/pdf");
  const isImage = fileType?.startsWith("image/") || content.startsWith("data:image/");

  if (isData && isPdf) {
    return (
      <object
        data={content}
        type="application/pdf"
        className="h-[600px] w-full rounded-lg border border-slate-200"
      >
        <a href={content} download={fileName ?? "document.pdf"} className="text-brand-600 underline">
          Download {fileName ?? "PDF"}
        </a>
      </object>
    );
  }

  if (isData && isImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={content} alt={fileName ?? "document"} className="max-h-[600px] w-full rounded-lg border border-slate-200 object-contain" />;
  }

  // Plain text
  return (
    <div className="max-h-[600px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-800">
      {content}
    </div>
  );
}
