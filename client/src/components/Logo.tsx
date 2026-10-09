export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-label="Blitz Slip"
    >
      {/* ticket / slip outline with notched corner */}
      <path
        d="M4 8C4 5.79 5.79 4 8 4H24C26.21 4 28 5.79 28 8V13C26.34 13 25 14.34 25 16C25 17.66 26.34 19 28 19V24C28 26.21 26.21 28 24 28H8C5.79 28 4 26.21 4 24V19C5.66 19 7 17.66 7 16C7 14.34 5.66 13 4 13V8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* perforated divider */}
      <path
        d="M16 4V9M16 13.5V18.5M16 23V28"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* blitz bolt */}
      <path
        d="M20 10L15 16.5H18.5L15.5 22L22 15H18.2L20 10Z"
        fill="currentColor"
      />
    </svg>
  );
}
