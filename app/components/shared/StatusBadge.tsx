import { Badge } from "@/app/components/ui/badge";

type OrderStatus = 
  | "Draft"
  | "AwaitingPayment"
  | "ReadyForDispatch"
  | "Assigned"
  | "Accepted"
  | "PickedUp"
  | "InTransit"
  | "Delivered"
  | "Canceled";

interface StatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

const statusConfig: Record<string, { variant: "success" | "warning" | "destructive" | "accent" | "secondary" | "default", label: string }> = {
  Draft: { variant: "secondary", label: "Draft" },
  AwaitingPayment: { variant: "warning", label: "Awaiting Payment" },
  ReadyForDispatch: { variant: "warning", label: "Ready for Dispatch" },
  Assigned: { variant: "accent", label: "Assigned" },
  Accepted: { variant: "accent", label: "Accepted" },
  PickedUp: { variant: "accent", label: "Picked Up" },
  InTransit: { variant: "accent", label: "In Transit" },
  Delivered: { variant: "success", label: "Delivered" },
  Canceled: { variant: "destructive", label: "Canceled" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { variant: "default" as const, label: status };
  
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

