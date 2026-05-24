import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function RencontreQrCode({ value, size = 220, className = '' }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!value) {
      setDataUrl('');
      return undefined;
    }

    let cancelled = false;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-50 text-slate-400 text-xs font-semibold ${className}`}
        style={{ width: size, height: size }}
      >
        Génération…
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="QR code de la session"
      width={size}
      height={size}
      className={`block ${className}`}
    />
  );
}
