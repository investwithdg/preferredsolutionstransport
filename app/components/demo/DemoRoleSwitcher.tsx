'use client';

import { useState } from 'react';
import { useDemo, type DemoRole } from '@/app/contexts/DemoContext';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { 
  User, 
  Truck, 
  Shield, 
  Package,
  ChevronUp,
  ChevronDown,
  Zap,
  AlertTriangle,
  X
} from 'lucide-react';

const roleConfig = {
  customer: { icon: User, label: 'Customer', color: 'bg-blue-500' },
  dispatcher: { icon: Package, label: 'Dispatcher', color: 'bg-purple-500' },
  driver: { icon: Truck, label: 'Driver', color: 'bg-green-500' },
  admin: { icon: Shield, label: 'Admin', color: 'bg-orange-500' },
};

export function DemoRoleSwitcher() {
  const { isDemoMode, currentRole, currentDriverId, setRole, setDriverId, demoDrivers } = useDemo();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(false);

  if (!isDemoMode) return null;

  const CurrentIcon = roleConfig[currentRole].icon;

  return (
    <>
      {/* Demo Mode Banner */}
      <div className="fixed top-0 left-0 right-0 bg-warning/90 backdrop-blur-sm text-warning-foreground py-2 px-4 text-center text-sm font-medium z-50 border-b border-warning">
        <div className="flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          DEMO MODE - This is for testing only. Data shown is not real.
          <AlertTriangle className="h-4 w-4" />
        </div>
      </div>

      {/* Floating Role Switcher */}
      <div className="fixed bottom-6 right-6 z-40">
        <Card className={`shadow-lg transition-all duration-300 ${isExpanded ? 'w-80' : 'w-auto'}`}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-full ${roleConfig[currentRole].color}`}>
                  <CurrentIcon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">Demo Mode</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Current: {roleConfig[currentRole].label}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          
          {isExpanded && (
            <CardContent className="p-4 pt-2">
              {/* Role Selector */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Switch Role</label>
                  <Select
                    value={currentRole}
                    onValueChange={(value) => setRole(value as DemoRole)}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleConfig).map(([role, config]) => {
                        const Icon = config.icon;
                        return (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {config.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Driver Selection (only shown when driver role is selected) */}
                {currentRole === 'driver' && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Select Driver</label>
                    <Select
                      value={currentDriverId || ''}
                      onValueChange={setDriverId}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Choose a demo driver..." />
                      </SelectTrigger>
                      <SelectContent>
                        {demoDrivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Separator />

                {/* Quick Actions */}
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowQuickActions(!showQuickActions)}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Quick Actions
                  </Button>
                  
                  {showQuickActions && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Demo Flows:</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => {
                          setRole('customer');
                          window.location.href = '/quote';
                        }}
                      >
                        1. Start as Customer → Quote
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => {
                          setRole('dispatcher');
                          window.location.href = '/dispatcher';
                        }}
                      >
                        2. View as Dispatcher → Assign
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => {
                          setRole('driver');
                          if (!currentDriverId) {
                            setDriverId('demo-driver-1');
                          }
                          window.location.href = '/driver';
                        }}
                      >
                        3. View as Driver → Update Status
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => {
                          setRole('admin');
                          window.location.href = '/admin';
                        }}
                      >
                        4. View as Admin → Manage
                      </Button>
                      <Separator className="my-2" />
                      <p className="text-xs font-medium text-muted-foreground">Quick Actions:</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => {
                          // Create a test order by adding to localStorage
                          const testOrders = JSON.parse(localStorage.getItem('demo-test-orders') || '[]');
                          testOrders.push({
                            id: `test-order-${Date.now()}`,
                            createdAt: new Date().toISOString(),
                          });
                          localStorage.setItem('demo-test-orders', JSON.stringify(testOrders));
                          window.location.reload();
                        }}
                      >
                        Create Test Order
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => {
                          localStorage.clear();
                          window.location.reload();
                        }}
                      >
                        Reset All Demo Data
                      </Button>
                    </div>
                  )}
                </div>

                {/* Current Context Info */}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Demo ID: demo-{currentRole}
                    {currentRole === 'driver' && currentDriverId && (
                      <span className="block">Driver: {currentDriverId}</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </>
  );
}
