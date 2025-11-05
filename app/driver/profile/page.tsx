import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DriverProfileForm } from '@/app/components/dashboards/driver/DriverProfileForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';

export default async function DriverProfilePage() {
  const supabase = await createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/sign-in?next=/driver/profile');
  }

  const { data: driver, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching driver profile:', error);
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Driver Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <DriverProfileForm driver={driver} />
        </CardContent>
      </Card>
    </div>
  );
}


