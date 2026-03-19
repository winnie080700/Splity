import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      className={className ?? "h-5 w-5"}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5.25 9.75V20a1 1 0 0 0 1 1h11.5a1 1 0 0 0 1-1V9.75" />
      <path d="M9.5 21v-6.5h5V21" />
    </IconBase>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M16.5 20a3.5 3.5 0 0 0-3.5-3.5h-2A3.5 3.5 0 0 0 7.5 20" />
      <circle cx="12" cy="9" r="3.5" />
      <path d="M19.5 19a3 3 0 0 0-2.5-2.95" />
      <path d="M17 5.5a3 3 0 0 1 0 6" />
      <path d="M4.5 19A3 3 0 0 1 7 16.05" />
      <path d="M7 5.5a3 3 0 0 0 0 6" />
    </IconBase>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </IconBase>
  );
}

export function ArrowsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 7h10" />
      <path d="M13 3l4 4-4 4" />
      <path d="M17 17H7" />
      <path d="M11 21l-4-4 4-4" />
    </IconBase>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14.5 14.5 0 0 1 0 18" />
      <path d="M12 3a14.5 14.5 0 0 0 0 18" />
    </IconBase>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10 13.5 8.5 15a3 3 0 1 1-4.25-4.25L7 8" />
      <path d="m14 10.5 1.5-1.5a3 3 0 1 1 4.25 4.25L17 16" />
      <path d="M8.5 15.5 15.5 8.5" />
    </IconBase>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 12 4 4L19 6" />
    </IconBase>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path d="M4 8h14.5A1.5 1.5 0 0 1 20 9.5v5A1.5 1.5 0 0 1 18.5 16H4" />
      <circle cx="15.5" cy="12" r="1" />
    </IconBase>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 3v3" />
      <path d="M17 3v3" />
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 10h16" />
    </IconBase>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
      <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
      <path d="m5 14 .9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14Z" />
    </IconBase>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20Z" />
      <path d="m12.5 7 4.5 4.5" />
    </IconBase>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16" />
      <path d="M9.5 3h5" />
      <path d="M6.5 7 7.5 20a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9L17.5 7" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </IconBase>
  );
}
