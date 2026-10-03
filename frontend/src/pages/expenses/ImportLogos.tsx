/** Abstract badge, not the trademarked logo — a colored mark that identifies the bank at a glance. */
export function BankLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#820AD1" />
      <text
        x="12" y="17" textAnchor="middle"
        fontSize="14" fontWeight="700" fontFamily="Arial, sans-serif"
        fill="#fff"
      >
        N
      </text>
    </svg>
  );
}

/** Marks a file as coming from this app's own "Exportar dados", not a bank — same badge shape as BankLogo, own color. */
export function InternalLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="var(--mantine-color-petrol-6)" />
      <text
        x="12" y="16" textAnchor="middle"
        fontSize="10" fontWeight="700" fontFamily="Arial, sans-serif"
        fill="#fff"
      >
        NC
      </text>
    </svg>
  );
}
