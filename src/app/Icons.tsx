import type { SVGProps } from "react";

type IconName = "arrow" | "back" | "box" | "check" | "close" | "customers" | "download" | "history" | "invoice" | "minus" | "plus" | "search" | "share" | "spark";

const paths: Record<IconName, React.ReactNode> = {
  arrow: <path d="m9 5 7 7-7 7" />,
  back: <><path d="m15 5-7 7 7 7" /><path d="M8 12h11" /></>,
  box: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  customers: <><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M18 9a3 3 0 1 0 0-6M22 20v-2a4 4 0 0 0-3-3.87" /></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5" /><path d="M5 20h14" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  invoice: <><path d="M6 3h9l3 3v15l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></>,
  minus: <path d="M6 12h12" />,
  plus: <><path d="M12 6v12M6 12h12" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  share: <><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5M8 13l8 5" /></>,
  spark: <><path d="M12 3c.6 4 2 5.4 6 6-4 .6-5.4 2-6 6-.6-4-2-5.4-6-6 4-.6 5.4-2 6-6Z" /><path d="M19 15c.2 1.6.8 2.2 2.5 2.5-1.7.3-2.3.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5Z" /></>,
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand${compact ? " compact" : ""}`}><img src="/brand/logo.png" alt="Ria Noel Shop" /></div>;
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return <div className="skeleton" role="status" aria-label="Memuat data">{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div>;
}

export function EmptyState({ icon = "spark", children }: { icon?: IconName; children: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-illustration"><Icon name={icon} /></span><p>{children}</p></div>;
}
