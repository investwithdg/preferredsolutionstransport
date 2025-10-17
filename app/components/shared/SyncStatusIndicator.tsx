/**
 * Sync Status Indicator
 * Shows when data was last updated and if it's synced with HubSpot
 */

'use client';

import { Badge } from '@/app/components/ui/badge';
import { Cloud, Clock } from 'lucide-react';

interface SyncStatusIndicatorProps {
  lastUpdated?: Date | string | null;
  hubspotDealId?: string | null;
  hubspotContactId?: string | null;
  className?: string;
  showDetails?: boolean;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function SyncStatusIndicator({
  lastUpdated,
  hubspotDealId,
  hubspotContactId,
  className = '',
  showDetails = false,
}: SyncStatusIndicatorProps) {
  const isSyncedToHubSpot = !!(hubspotDealId || hubspotContactId);
  const lastUpdateDate = lastUpdated ? new Date(lastUpdated) : null;
  const timeAgo = lastUpdateDate ? formatTimeAgo(lastUpdateDate) : 'Never';

  if (!showDetails && !isSyncedToHubSpot) {
    return null; // Don't show anything if not synced and details not requested
  }

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      {isSyncedToHubSpot && (
        <Badge variant="secondary" className="gap-1">
          <Cloud className="h-3 w-3" />
          <span>Synced to HubSpot</span>
        </Badge>
      )}
      
      {showDetails && lastUpdateDate && (
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Updated {timeAgo}
        </span>
      )}
    </div>
  );
}

/**
 * Real-time Update Indicator
 * Shows a pulse animation when data is being updated in real-time
 */
interface RealtimeIndicatorProps {
  isActive: boolean;
  lastUpdate?: Date | null;
}

export function RealtimeIndicator({ isActive, lastUpdate }: RealtimeIndicatorProps) {
  if (!isActive) {
    return null;
  }

  const timeAgo = lastUpdate ? formatTimeAgo(lastUpdate) : null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </div>
        <span>Live</span>
      </div>
      {timeAgo && (
        <span>Last update: {timeAgo}</span>
      )}
    </div>
  );
}

