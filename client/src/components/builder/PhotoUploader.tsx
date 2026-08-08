import { ChangeEvent, useRef, useState } from "react";
import { fileToResizedDataUrl } from "../../utils/image";

interface Props {
  value: string;
  onChange: (dataUrl: string) => void;
}

/** File-picker + preview for the "Portrait" template's header photo. Resizes/compresses client-side (see utils/image.ts) before handing the result up as a data: URL. */
export function PhotoUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be re-selected later (e.g. after removing it)
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process that image.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="field">
      <label>Photo</label>
      <div className="photo-uploader">
        {value ? (
          <img src={value} alt="Uploaded profile" className="photo-uploader-preview" />
        ) : (
          <div className="photo-uploader-placeholder" aria-hidden="true">
            No photo
          </div>
        )}
        <div className="photo-uploader-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()} disabled={processing}>
            {processing ? "Processing…" : value ? "Change photo" : "Upload photo"}
          </button>
          {value && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange("")}>
              Remove
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} hidden />
      </div>
      {error && <p className="form-error photo-uploader-error">{error}</p>}
    </div>
  );
}
