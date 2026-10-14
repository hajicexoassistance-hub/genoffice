import React from 'react'

export interface IconProps {
  size?: number
  className?: string
  color?: string
}

const defaultProps = {
  size: 16,
  strokeWidth: 1.75,
}

/* 📜 Manuscript / Scroll Icon */
export const IconManuscript: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M15 15.5A2.5 2.5 0 0 1 12.5 18H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7.5A2.5 2.5 0 0 1 15 4.5v11Z" />
    <path d="M15 4.5a2.5 2.5 0 0 1 2.5-2.5h0A2.5 2.5 0 0 1 20 4.5V14a2 2 0 0 1-2 2h-3" />
    <path d="M6 6h6M6 9.5h6M6 13h4" />
  </svg>
)

/* 🚀 Workbench / Split View Icon */
export const IconWorkbench: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
    <path d="M9.5 3.5v13" />
    <path d="M12.5 7.5h3M12.5 10.5h3" />
  </svg>
)

/* 📑 Sidebar Icon */
export const IconSidebar: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
    <path d="M13.5 3.5v13" />
  </svg>
)

/* ⌨️ Keyboard Icon */
export const IconKeyboard: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
    <path d="M5.5 8h.01M8.5 8h.01M11.5 8h.01M14.5 8h.01M5.5 11h.01M7.5 12.5h5M14.5 11h.01" />
  </svg>
)

/* 📖 Open Book / Guide Icon */
export const IconBookOpen: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M10 5.5c-2-1.5-5.5-1.5-7.5-1v11c2-.5 5.5-.5 7.5 1 2-1.5 5.5-1.5 7.5-1v-11c-2-.5-5.5-.5-7.5 1Z" />
    <path d="M10 5.5v11" />
  </svg>
)

/* ⚙️ Settings Gear Icon */
export const IconSettings: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <circle cx="10" cy="10" r="3" />
    <path d="M16.2 12.3a1.2 1.2 0 0 0 .25 1.34l.05.05a1.45 1.45 0 0 1-2.05 2.05l-.05-.05a1.2 1.2 0 0 0-1.34-.25 1.2 1.2 0 0 0-.74 1.11V17a1.45 1.45 0 0 1-2.9 0v-.45a1.2 1.2 0 0 0-.74-1.11 1.2 1.2 0 0 0-1.34.25l-.05.05a1.45 1.45 0 0 1-2.05-2.05l.05-.05a1.2 1.2 0 0 0 .25-1.34 1.2 1.2 0 0 0-1.11-.74H3.8a1.45 1.45 0 0 1 0-2.9h.45a1.2 1.2 0 0 0 1.11-.74 1.2 1.2 0 0 0-.25-1.34l-.05-.05a1.45 1.45 0 0 1 2.05-2.05l.05.05a1.2 1.2 0 0 0 1.34.25 1.2 1.2 0 0 0 .74-1.11V3.8a1.45 1.45 0 0 1 2.9 0v.45a1.2 1.2 0 0 0 .74 1.11 1.2 1.2 0 0 0 1.34-.25l.05-.05a1.45 1.45 0 0 1 2.05 2.05l-.05.05a1.2 1.2 0 0 0-.25 1.34 1.2 1.2 0 0 0 1.11.74h.45a1.45 1.45 0 0 1 0 2.9h-.45a1.2 1.2 0 0 0-1.11.74Z" />
  </svg>
)

/* 📥 Apply to Word / Insert Document Icon */
export const IconApplyWord: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M4 14.5v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1" />
    <path d="M10 2.5v10M6.5 9 10 12.5 13.5 9" />
  </svg>
)

/* 📂 Open Folder Icon */
export const IconFolderOpen: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M2.5 6.5a2 2 0 0 1 2-2h3l2 2h6a2 2 0 0 1 2 2v1h-13v-3Z" />
    <path d="M2.5 9.5h15l-1.5 7a1.5 1.5 0 0 1-1.5 1.2h-11a1.5 1.5 0 0 1-1.5-1.2l-1-7Z" />
  </svg>
)

/* 💾 Save Project Icon */
export const IconSave: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M15.5 17.5h-11a1.5 1.5 0 0 1-1.5-1.5v-12a1.5 1.5 0 0 1 1.5-1.5h8.5l4 4V16a1.5 1.5 0 0 1-1.5 1.5Z" />
    <path d="M13.5 17.5v-5h-7v5M6.5 2.5v4h6v-4" />
  </svg>
)

/* 📄 Document / PDF File Icon */
export const IconDocument: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M12.5 2.5h-7a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5V6.5l-3.5-4Z" />
    <path d="M12.5 2.5v4h4" />
    <path d="M6.5 10.5h7M6.5 13.5h5" />
  </svg>
)

/* ✨ Sparkles / AI Vision Icon */
export const IconSparkles: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="m10 2.5 1.5 4.5 4.5 1.5-4.5 1.5L10 14.5l-1.5-4.5L4 8.5l4.5-1.5L10 2.5Z" />
    <path d="m15.5 13 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2ZM4.5 12l.75 1.5 1.5.75-1.5.75-.75 1.5-.75-1.5-1.5-.75 1.5-.75.75-1.5Z" />
  </svg>
)

/* 🎤 Microphone / Dictation Icon */
export const IconMic: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <rect x="7" y="2.5" width="6" height="10" rx="3" />
    <path d="M4.5 8.5v1.5a5.5 5.5 0 0 0 11 0V8.5M10 15.5v3M7.5 18.5h5" />
  </svg>
)

/* ✓ Checkmark / Verified Icon */
export const IconCheck: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M4.5 10.5 8 14l7.5-8" />
  </svg>
)

/* ○ Circle / Unverified Icon */
export const IconCircle: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <circle cx="10" cy="10" r="6" />
  </svg>
)

/* 📋 Copy / Clipboard Icon */
export const IconCopy: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <rect x="6.5" y="6.5" width="10" height="10" rx="1.5" />
    <path d="M4.5 13.5h-1a1.5 1.5 0 0 1-1.5-1.5V4a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5v1" />
  </svg>
)

/* ✕ Dismiss / Close Icon */
export const IconDismiss: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M5 5l10 10M15 5L5 15" />
  </svg>
)

/* ➕ Plus / Add Icon */
export const IconPlus: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M10 4.5v11M4.5 10h11" />
  </svg>
)

/* 🗑️ Trash / Delete Icon */
export const IconTrash: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M3.5 5.5h13M7.5 5.5V3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M5.5 5.5l1 11a1.5 1.5 0 0 0 1.5 1.4h4a1.5 1.5 0 0 0 1.5-1.4l1-11" />
    <path d="M8.5 9v5M11.5 9v5" />
  </svg>
)

/* 🔍 Zoom In Icon */
export const IconZoomIn: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <circle cx="9" cy="9" r="6" />
    <path d="m13.5 13.5 4 4M9 6.5v5M6.5 9h5" />
  </svg>
)

/* 🔍 Zoom Out Icon */
export const IconZoomOut: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <circle cx="9" cy="9" r="6" />
    <path d="m13.5 13.5 4 4M6.5 9h5" />
  </svg>
)

/* 🔍 Search / Focus Icon */
export const IconSearch: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <circle cx="9" cy="9" r="6" />
    <path d="m13.5 13.5 4 4" />
  </svg>
)

/* 📋 List View Icon */
export const IconList: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M4 6h1M4 10h1M4 14h1M7.5 6h9M7.5 10h9M7.5 14h9" />
  </svg>
)

/* ◀ Chevron Left */
export const IconChevronLeft: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M12.5 15l-5-5 5-5" />
  </svg>
)

/* ▶ Chevron Right */
export const IconChevronRight: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M7.5 5l5 5-5 5" />
  </svg>
)

/* ▲ Chevron Up */
export const IconChevronUp: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M15 12.5l-5-5-5 5" />
  </svg>
)

/* ▼ Chevron Down */
export const IconChevronDown: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M5 7.5l5 5 5-5" />
  </svg>
)

/* ⬅ Arrow Left (Back to Word) */
export const IconArrowLeft: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M16 10H4M9 5l-5 5 5 5" />
  </svg>
)

/* 🔊 Sound Speaker On */
export const IconSoundOn: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M3.5 8h3l4-3.5v11l-4-3.5h-3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
    <path d="M14 7a4 4 0 0 1 0 6M16.5 4.5a7 7 0 0 1 0 11" />
  </svg>
)

/* 🔇 Sound Mute */
export const IconSoundMute: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M3.5 8h3l4-3.5v11l-4-3.5h-3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
    <path d="m14 8 4 4M18 8l-4 4" />
  </svg>
)

/* ⚡ Lightning / Transliteration */
export const IconLightning: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M11 2.5 4.5 11h5.5l-1 6.5 6.5-8.5h-5.5l1-6.5Z" />
  </svg>
)

/* 🕌 Arabic Script / Dome Icon */
export const IconArabic: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M10 2.5c1 1.5 3 3 4 5v9.5H6V7.5c1-2 3-3.5 4-5Z" />
    <path d="M10 12.5a2 2 0 0 1 2 2v2.5H8v-2.5a2 2 0 0 1 2-2Z" />
    <path d="M3.5 17h13" />
  </svg>
)

/* 💡 Lightbulb / Tips Icon */
export const IconBulb: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M7.5 15.5h5M8.5 17.5h3" />
    <path d="M6 7.5a4 4 0 1 1 8 0c0 1.7-.9 2.7-1.7 3.5-.7.7-.8 1.5-.8 2.5H8.5c0-1-.1-1.8-.8-2.5C6.9 10.2 6 9.2 6 7.5Z" />
  </svg>
)

/* 📜 History / Counter-Clockwise Clock Icon */
export const IconHistory: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M2.5 4v4h4" />
    <path d="M3.5 12a7 7 0 1 0 1.7-6.2L2.5 8" />
    <path d="M10 6.5v4l2.5 1.5" />
  </svg>
)

/* 🔄 Refresh / Reload Icon */
export const IconRefresh: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M17.5 3.5v4h-4" />
    <path d="M2.5 16.5v-4h4" />
    <path d="M16.5 7.5A6.5 6.5 0 0 0 4.8 5.8L2.5 8M17.5 12l-2.3 2.2a6.5 6.5 0 0 1-11.7-1.7" />
  </svg>
)

/* 📄 Fit Page Icon */
export const IconFitPage: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <rect x="4.5" y="3" width="11" height="14" rx="1.5" />
    <path d="M7 6.5h6M7 9.5h6M7 12.5h4" />
  </svg>
)

/* ↔ Fit Width Icon */
export const IconFitWidth: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M2 10h16M5 7l-3 3 3 3M15 7l3 3-3 3" />
  </svg>
)

/* 📑 Thumbnail List Icon */
export const IconDocumentBulletList: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <rect x="3" y="3.5" width="4.5" height="4.5" rx="1" />
    <rect x="3" y="11.5" width="4.5" height="4.5" rx="1" />
    <path d="M10.5 5.5h6.5M10.5 13.5h6.5" />
  </svg>
)

/* 👁️ Eye Hide Icon */
export const IconEyeHide: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M3 3l14 14M8.7 8.7a2.5 2.5 0 0 0 3.5 3.5M15.4 13.4C13.8 14.4 12 15 10 15c-4.5 0-7.8-3.3-8.8-5a13.3 13.3 0 0 1 4.2-4.2M6.5 4.6A11.2 11.2 0 0 1 10 4c4.5 0 7.8 3.3 8.8 5a13.3 13.3 0 0 1-2.8 3.4" />
  </svg>
)

/* ℹ️ Info Icon */
export const IconInfo: React.FC<IconProps> = ({ size = defaultProps.size, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <circle cx="10" cy="10" r="7.5" />
    <path d="M10 9v5M10 6.5h.01" />
  </svg>
)

