import { ContainerIcon, MagicWand01Icon, PackageIcon } from "@hugeicons/core-free-icons";
import { AppIcon } from "./primitives";

export type BuildMethod = "auto" | "railpack" | "dockerfile";

const buildMethodOptions: Array<{ value: BuildMethod; label: string; icon: unknown }> = [
  { value: "auto", label: "Auto", icon: MagicWand01Icon },
  { value: "railpack", label: "Railpack", icon: PackageIcon },
  { value: "dockerfile", label: "Dockerfile", icon: ContainerIcon }
];

export function BuildMethodControl({ value, onChange, disabled = false }: { value: BuildMethod; onChange: (method: BuildMethod) => void; disabled?: boolean }) {
  return (
    <div className="inline-grid w-full max-w-sm grid-cols-3 gap-2">
      {buildMethodOptions.map((method) => (
        <button
          key={method.value}
          type="button"
          className={`inline-flex h-10 min-w-0 items-center justify-center gap-2 border px-3 text-sm transition disabled:opacity-60 ${
            value === method.value
              ? "border-[#4FB8B2]/60 bg-[#4FB8B2]/10 text-zinc-100"
              : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          }`}
          disabled={disabled}
          onClick={() => onChange(method.value)}
        >
          <AppIcon icon={method.icon} size={16} className="shrink-0" />
          <span className="truncate">{method.label}</span>
        </button>
      ))}
    </div>
  );
}
