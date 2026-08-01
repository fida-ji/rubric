// The Rubric mark: a grading rubric grid with the editor's red check in the
// passing cell. Reused in the header and footer.
export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Rubric"
      className={className}
    >
      <rect x="1" y="1" width="30" height="30" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="16" y1="4" x2="16" y2="28" stroke="currentColor" strokeWidth="1.4" />
      <line x1="4" y1="12" x2="28" y2="12" stroke="currentColor" strokeWidth="1.4" />
      <line x1="4" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M6.5 8.6 L9 11 L13.6 5.6"
        fill="none"
        stroke="#E4491C"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <Mark size={size} />
      <span className="font-serif text-xl font-600 tracking-tight" style={{ fontWeight: 600 }}>
        Rubric
      </span>
    </span>
  );
}
