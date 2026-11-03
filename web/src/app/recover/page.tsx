import type { Metadata } from "next";
import { RecoverForm } from "./recover-form";

export const metadata: Metadata = { title: "Restore your pass" };

export default function RecoverPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Restore your pass</h1>
      <p className="mt-3 text-muted">
        Enter the recovery code you saved at checkout. This browser gets access; any other browser using the same pass is
        signed out.
      </p>
      <RecoverForm />
    </div>
  );
}
