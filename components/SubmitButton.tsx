"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import clsx from "clsx";

type SubmitButtonProps = {
  children: ReactNode;
  pendingText?: string;
  className?: string;
};

export default function SubmitButton({
  children,
  pendingText = "Menyimpan...",
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx(
        "inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70",
        className
      )}
    >
      {pending && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {pending ? pendingText : children}
    </button>
  );
}
