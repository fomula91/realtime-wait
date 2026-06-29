import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** 주어진 값을 실제 스캔 가능한 QR 데이터 URL(PNG)로 렌더한다 */
export function QrCode({
  value,
  size = 120,
  alt,
}: {
  value: string;
  size?: number;
  alt?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { margin: 1, width: size * 2 })
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(null));
    return () => {
      active = false;
    };
  }, [value, size]);

  return (
    <div
      className="qr-img"
      style={{ width: size, height: size }}
      aria-label={alt}
    >
      {src && <img src={src} width={size} height={size} alt={alt ?? "QR 코드"} />}
    </div>
  );
}

/** 부스 로그인 딥링크 — 스캔하면 /booth/:id?token= 로 진입 */
export function boothLoginUrl(boothId: string, token: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/booth/${boothId}?token=${encodeURIComponent(token)}`;
}

/** 행사 어드민 로그인 딥링크 — 스캔/클릭하면 /admin/:id?token= 로 진입 */
export function eventLoginUrl(eventId: string, token: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/admin/${eventId}?token=${encodeURIComponent(token)}`;
}
