import Link from "next/link";
import { Card, CardContent } from "@/app/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { MapPin, User, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderCardProps {
  order: {
    id: string;
    status: string;
    price_total: number;
    created_at: string;
    quotes?: {
      pickup_address?: string;
      dropoff_address?: string;
      distance_mi?: number;
    } | null;
    drivers?: {
      name?: string;
      phone?: string;
    } | null;
  };
  href?: string;
  className?: string;
  testId?: string;
}

export function OrderCard({ order, href, className, testId }: OrderCardProps) {
  const content = (
    <Card className={cn("hover:shadow-soft-lg transition-shadow", className)} data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono text-muted-foreground">
            #{order.id.slice(-8)}
          </span>
          <StatusBadge status={order.status} />
        </div>

        <div className="space-y-3 mb-4">
          {order.quotes?.pickup_address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-sm font-medium text-foreground truncate">
                  {order.quotes.pickup_address.split(',')[0]}
                </p>
              </div>
            </div>
          )}
          {order.quotes?.dropoff_address && (
            <div className="flex items-start gap-2">
              <Package className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">To</p>
                <p className="text-sm font-medium text-foreground truncate">
                  {order.quotes.dropoff_address.split(',')[0]}
                </p>
              </div>
            </div>
          )}
          {order.drivers && (
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Driver</p>
                <p className="text-sm font-medium text-foreground">
                  {order.drivers.name}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <span className="text-lg font-bold text-foreground">
            ${order.price_total.toFixed(2)}
          </span>
          {href && (
            <span className="text-sm text-accent hover:text-accent/80 font-medium">
              View Details →
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

