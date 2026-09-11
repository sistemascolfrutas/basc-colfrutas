"use client";

import { useFormStatus } from "react-dom";

export function AuthSubmitButton({ label, pendingLabel, className }: {
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  );
}
