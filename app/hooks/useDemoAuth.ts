import { useDemo } from '@/app/contexts/DemoContext';

interface DemoUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

export function useDemoAuth() {
  const { isDemoMode, currentRole, currentDriverId } = useDemo();

  if (!isDemoMode) {
    return { demoUser: null };
  }

  // Generate demo user based on current role
  const demoUser: DemoUser = {
    id: `demo-${currentRole}-user`,
    email: `demo-${currentRole}@test.com`,
    role: currentRole === 'customer' ? 'RECIPIENT' : currentRole.toUpperCase(),
    name: `Demo ${currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}`,
  };

  // For driver role, use the selected driver ID
  if (currentRole === 'driver' && currentDriverId) {
    demoUser.id = currentDriverId;
    const driverName = currentDriverId === 'demo-driver-1' ? 'John Smith' :
                      currentDriverId === 'demo-driver-2' ? 'Sarah Johnson' :
                      currentDriverId === 'demo-driver-3' ? 'Mike Davis' : 'Demo Driver';
    demoUser.name = driverName;
  }

  return { demoUser };
}
