import { useState } from 'react';
import { ReceiptProof } from '../types';
export async function prepareReceiptProof(file: File): Promise<ReceiptProof> {
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 8 * 1024 * 1024)
    throw new Error('Choose a JPEG or PNG image smaller than 8 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image preview is unavailable in this browser.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.65, 0.5, 0.35, 0.2]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if ((dataUrl.split(',')[1].length * 3) / 4 <= 64000)
        return { name: file.name.slice(0, 140), dataUrl };
    }
    throw new Error(
      'This photo is too detailed. Crop it to the relevant waybill or damaged item and try again.'
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function ReceiptProofField({
  value,
  onChange,
  onBusyChange,
}: {
  value?: ReceiptProof;
  onChange: (proof?: ReceiptProof) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="sm-inset">
      <label className="sm-field">
        Photo proof / signed waybill
        <input
          type="file"
          accept="image/jpeg,image/png"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            setBusy(true);
            onBusyChange?.(true);
            setError('');
            try {
              onChange(await prepareReceiptProof(file));
            } catch (error) {
              setError(error instanceof Error ? error.message : 'Unable to read photo');
            } finally {
              setBusy(false);
              onBusyChange?.(false);
            }
          }}
        />
      </label>
      <p className="sm-muted">
        {busy ? 'Preparing image...' : 'JPEG or PNG. A compact image is saved with the receipt.'}
      </p>
      {value && (
        <>
          <img className="sm-proof-image" src={value.dataUrl} alt="Receipt proof preview" />
          <p>{value.name}</p>
          <button type="button" className="sm-small-btn" onClick={() => onChange(undefined)}>
            Remove photo
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="sm-error">
          {error}
        </p>
      )}
    </div>
  );
}
