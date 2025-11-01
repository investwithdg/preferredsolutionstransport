'use client';

import { ExternalLink } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface HubSpotLinkProps {
  orderId?: string;
  customerId?: string;
  hubspotDealId?: string;
  hubspotContactId?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showFreshData?: boolean;
}

export function HubSpotLink({
  orderId,
  customerId,
  hubspotDealId,
  hubspotContactId,
  variant = 'outline',
  size = 'sm',
  showFreshData = false,
}: HubSpotLinkProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [freshDataLoading, setFreshDataLoading] = useState(false);
  const [freshData, setFreshData] = useState<any>(null);

  const portalId = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID;

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', user.id)
        .single();

      setIsAdmin(userData?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchFreshData = async () => {
    if (!orderId || freshDataLoading) return;

    setFreshDataLoading(true);
    try {
      const response = await fetch(`/api/admin/hubspot/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setFreshData(data);
      }
    } catch (error) {
      console.error('Error fetching fresh HubSpot data:', error);
    } finally {
      setFreshDataLoading(false);
    }
  };

  // Don't render if not admin or still loading
  if (loading || !isAdmin) {
    return null;
  }

  // Don't render if no HubSpot IDs
  if (!hubspotDealId && !hubspotContactId && !orderId && !customerId) {
    return null;
  }

  const getDealUrl = () => {
    if (hubspotDealId) {
      return `https://app.hubspot.com/contacts/${portalId}/deal/${hubspotDealId}`;
    }
    return null;
  };

  const getContactUrl = () => {
    if (hubspotContactId) {
      return `https://app.hubspot.com/contacts/${portalId}/contact/${hubspotContactId}`;
    }
    return null;
  };

  const dealUrl = getDealUrl();
  const contactUrl = getContactUrl();

  if (!dealUrl && !contactUrl) {
    return <div className="text-sm text-muted-foreground">Not synced to HubSpot</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {dealUrl && (
          <Button
            variant={variant}
            size={size}
            onClick={() => window.open(dealUrl, '_blank')}
            className="gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            View Deal in HubSpot
          </Button>
        )}

        {contactUrl && (
          <Button
            variant={variant}
            size={size}
            onClick={() => window.open(contactUrl, '_blank')}
            className="gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            View Contact in HubSpot
          </Button>
        )}

        {showFreshData && orderId && hubspotDealId && (
          <Button
            variant="ghost"
            size={size}
            onClick={fetchFreshData}
            disabled={freshDataLoading}
            className="gap-1"
          >
            {freshDataLoading ? 'Loading...' : 'Fetch Latest Data'}
          </Button>
        )}
      </div>

      {freshData && (
        <div className="mt-2 p-3 bg-muted rounded-md text-sm">
          <div className="font-semibold mb-1">Fresh HubSpot Data</div>
          {freshData.cached_vs_fresh_comparison?.has_differences ? (
            <div className="space-y-1">
              <div className="text-orange-600">Differences detected:</div>
              {Object.entries(freshData.cached_vs_fresh_comparison.differences).map(
                ([key, diff]: [string, any]) => (
                  <div key={key} className="pl-2">
                    <span className="font-medium">{key}:</span>
                    <div className="pl-2 text-xs">
                      <div>Cached: {JSON.stringify(diff.cached)}</div>
                      <div>Fresh: {JSON.stringify(diff.fresh)}</div>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="text-green-600">Cache is up to date</div>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            Fetched at: {new Date(freshData.fetched_at).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
