import React from 'react'

export interface HarakatIconProps {
  size?: number
  className?: string
  color?: string
}

const defaultProps = {
  size: 24,
  tatweelColor: 'currentColor',
}

// Garis Tatweel Horizontal dasar di tengah (y = 14)
const BaseTatweel: React.FC<{ color?: string }> = ({ color = 'currentColor' }) => (
  <line
    x1="4.5"
    y1="14"
    x2="19.5"
    y2="14"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    opacity="0.38"
  />
)

/* 1. ـَ Fathah */
export const HarokatFathah: React.FC<HarakatIconProps> = ({
  size = defaultProps.size,
  className,
  color = 'currentColor',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <BaseTatweel color={color} />
    {/* Garis miring fathah di atas tatweel */}
    <line
      x1="15.5"
      y1="5.5"
      x2="8.5"
      y2="9.8"
      stroke={color}
      strokeWidth="2.8"
      strokeLinecap="round"
    />
  </svg>
)

/* 2. ـِ Kasroh */
export const HarokatKasroh: React.FC<HarakatIconProps> = ({
  size = defaultProps.size,
  className,
  color = 'currentColor',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <BaseTatweel color={color} />
    {/* Garis miring kasroh di bawah tatweel */}
    <line
      x1="15.5"
      y1="18.2"
      x2="8.5"
      y2="22.5"
      stroke={color}
      strokeWidth="2.8"
      strokeLinecap="round"
    />
  </svg>
)

/* 3. ـُ Dhumah */
export const HarokatDhumah: React.FC<HarakatIconProps> = ({
  size = defaultProps.size,
  className,
  color = 'currentColor',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <BaseTatweel color={color} />
    {/* Wau kecil dhumah di atas tatweel */}
    <path
      d="M12.5 7.8a2.1 2.1 0 1 1 2.1-2.1c0 1.2-1 2.1-2.2 2.7L9.2 10"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/* 4. ـْ Sukun */
export const HarokatSukun: React.FC<HarakatIconProps> = ({
  size = defaultProps.size,
  className,
  color = 'currentColor',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <BaseTatweel color={color} />
    {/* Lingkaran sukun bulat di atas tatweel */}
    <circle cx="12" cy="7.2" r="3.2" stroke={color} strokeWidth="2.2" fill="none" />
  </svg>
)

/* 5. ـّ Tasydid / Shaddah */
export const HarokatTasydid: React.FC<HarakatIconProps> = ({
  size = defaultProps.size,
  className,
  color = 'currentColor',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <BaseTatweel color={color} />
    {/* 3 Gigi Tasydid Kaligrafi Terbuka ke Atas */}
    <path
      d="M7.5 6.5 Q8.6 10.2 9.8 10.2 Q11 10.2 12 7 Q13 10.2 14.2 10.2 Q15.4 10.2 16.5 6.5"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/* 6. ـٓ Pepet Pegon / Maddah */
export const HarokatPepet: React.FC<HarakatIconProps> = ({
  size = defaultProps.size,
  className,
  color = 'currentColor',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <BaseTatweel color={color} />
    {/* Gelombang Maddah Pepet */}
    <path
      d="M7 8c2-2.5 4.5-2.5 6 0s4 2.5 6 0"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
)

/* 7. ـٰ Fathah Tegak / Alif Khanjariyah */
export const HarokatFathahTegak: React.FC<HarakatIconProps> = ({
  size = defaultProps.size,
  className,
  color = 'currentColor',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <BaseTatweel color={color} />
    {/* Garis vertikal tegak lurus pendek */}
    <line
      x1="12"
      y1="4.5"
      x2="12"
      y2="10.8"
      stroke={color}
      strokeWidth="2.6"
      strokeLinecap="round"
    />
  </svg>
)

/* 8. ـً Tanwin Fathah (Fathatan) */
export const HarokatTanwinFathah: React.FC<HarakatIconProps> = ({
  size = defaultProps.size,
  className,
  color = 'currentColor',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <BaseTatweel color={color} />
    <line
      x1="15.5"
      y1="4.5"
      x2="8.5"
      y2="8.2"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <line
      x1="15.5"
      y1="8.5"
      x2="8.5"
      y2="12.2"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
)

/* 9. ـٍ Tanwin Kasroh (Kasratan) */
export const HarokatTanwinKasroh: React.FC<HarakatIconProps> = ({
  size = defaultProps.size,
  className,
  color = 'currentColor',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <BaseTatweel color={color} />
    <line
      x1="15.5"
      y1="16.5"
      x2="8.5"
      y2="20.2"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <line
      x1="15.5"
      y1="20.5"
      x2="8.5"
      y2="24.2"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
)

/* 10. ـٌ Tanwin Dhumah (Dammatan) */
export const HarokatTanwinDhumah: React.FC<HarakatIconProps> = ({
  size = defaultProps.size,
  className,
  color = 'currentColor',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <BaseTatweel color={color} />
    {/* Dhumah utama */}
    <path
      d="M10.8 7.5a1.8 1.8 0 1 1 1.8-1.8c0 1-.8 1.8-1.8 2.3l-2.2 1.2"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Busur penutup tanwin di atas */}
    <path
      d="M14.5 4.8c.8.5 1.5 1.3 1 2.3-.5 1-1.7 1.2-2.7 1"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
)

/* 11. ـٖ Kasrah Tegak (Subscript Alef) */
export const HarokatKasrohTegak: React.FC<HarakatIconProps> = ({
  size = defaultProps.size,
  className,
  color = 'currentColor',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <BaseTatweel color={color} />
    <line
      x1="12"
      y1="17.2"
      x2="12"
      y2="23.5"
      stroke={color}
      strokeWidth="2.6"
      strokeLinecap="round"
    />
  </svg>
)

/* 12. ـٗ Dhommah Terbalik (Inverted Damma) */
export const HarokatDhumahTerbalik: React.FC<HarakatIconProps> = ({
  size = defaultProps.size,
  className,
  color = 'currentColor',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <BaseTatweel color={color} />
    {/* Dhumah terbalik */}
    <path
      d="M12.8 5.2a2 2 0 1 0-2 2c0-1.2 1-2.2 2.2-2.8l2.6-1.4"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * Helper untuk mengambil komponen icon SVG harakat berdasarkan ID tombol & status Shift
 */
export function renderHarokatIcon(keyId: string, isShift: boolean, size = 24): React.ReactNode {
  switch (keyId) {
    case 'bracket_r': // ]
      return isShift ? <HarokatTanwinFathah size={size} /> : <HarokatFathah size={size} />
    case 'bracket_l': // [
      return isShift ? <HarokatTanwinKasroh size={size} /> : <HarokatKasroh size={size} />
    case 'p':
      return isShift ? <HarokatTanwinDhumah size={size} /> : <HarokatDhumah size={size} />
    case 'o':
      return <HarokatSukun size={size} />
    case 'l':
      return <HarokatTasydid size={size} />
    case 'semicolon': // ;
      return isShift ? <HarokatKasrohTegak size={size} /> : <HarokatPepet size={size} />
    case 'quote': // '
      return isShift ? <HarokatDhumahTerbalik size={size} /> : <HarokatFathahTegak size={size} />
    default:
      return null
  }
}
