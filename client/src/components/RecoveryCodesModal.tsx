import { useState } from "react";
import { Check, Copy, ShieldAlert } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export function RecoveryCodesModal({
  codes,
  onClose,
}: {
  codes: string[];
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(codes.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Modal title="Save your recovery codes" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-3 text-xs text-[#8a5a00] dark:text-warning">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Each code can be used once to sign in if you lose access to your authenticator app.
            Store them somewhere safe — this is the only time they'll be shown.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-4 font-mono text-sm dark:border-neutral-800 dark:bg-neutral-900/60">
          {codes.map((code) => (
            <div key={code} className="text-neutral-700 dark:text-neutral-300">
              {code}
            </div>
          ))}
        </div>

        <Button variant="secondary" className="w-full" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 text-good" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy all codes"}
        </Button>

        <Button className="w-full" onClick={onClose}>
          I've saved these codes
        </Button>
      </div>
    </Modal>
  );
}
