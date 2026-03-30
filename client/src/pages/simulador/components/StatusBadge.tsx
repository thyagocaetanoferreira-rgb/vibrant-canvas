import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { STATUS_META, StatusVerificacao } from "../constants";

export default function StatusBadge({ status }: { status: StatusVerificacao }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
      style={{ color: m.textColor, backgroundColor: m.bgColor, borderColor: m.borderColor }}
    >
      {status === "consistente"   && <CheckCircle2  className="w-3 h-3" />}
      {status === "inconsistente" && <XCircle       className="w-3 h-3" />}
      {status === "aviso"         && <AlertTriangle className="w-3 h-3" />}
      {m.label}
    </span>
  );
}
