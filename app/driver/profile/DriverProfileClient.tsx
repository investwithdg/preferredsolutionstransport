'use client';

import { useState } from 'react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Separator } from '@/app/components/ui/separator';
import { Badge } from '@/app/components/ui/badge';
import { User, Truck, Package, DollarSign, Calendar, Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  vehicle_details: any;
  created_at: string | null;
  is_available: boolean;
}

interface DriverProfileClientProps {
  driver: Driver;
  totalDeliveries: number;
  totalEarnings: number;
}

export default function DriverProfileClient({ 
  driver: initialDriver, 
  totalDeliveries,
  totalEarnings 
}: DriverProfileClientProps) {
  const [driver, setDriver] = useState(initialDriver);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const memberSince = driver.created_at
    ? new Date(driver.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A';
  const [formData, setFormData] = useState({
    name: driver.name,
    phone: driver.phone || '',
    vehicleType: driver.vehicle_details?.type || '',
    vehicleMake: driver.vehicle_details?.make || '',
    vehicleModel: driver.vehicle_details?.model || '',
    vehiclePlate: driver.vehicle_details?.plate || '',
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/drivers/${driver.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          vehicle_details: {
            type: formData.vehicleType,
            make: formData.vehicleMake,
            model: formData.vehicleModel,
            plate: formData.vehiclePlate,
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const { driver: updatedDriver } = await response.json();
      setDriver(updatedDriver);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: driver.name,
      phone: driver.phone || '',
      vehicleType: driver.vehicle_details?.type || '',
      vehicleMake: driver.vehicle_details?.make || '',
      vehicleModel: driver.vehicle_details?.model || '',
      vehiclePlate: driver.vehicle_details?.plate || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="container max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Driver Profile"
        description="Manage your profile information and view delivery statistics"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Driver', href: '/driver' },
          { label: 'Profile' },
        ]}
        action={
          !isEditing ? (
            <Button variant="accent" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Deliveries</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{totalDeliveries}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    ${totalEarnings.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={driver.is_available ? "success" : "secondary"} className="mt-2">
                    {driver.is_available ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
                <Truck className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-heading-md flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                  className="rounded-2xl"
                />
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Account Information
              </h4>
              <p className="text-sm text-muted-foreground">
                Member since {memberSince}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-md flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Vehicle Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicleType">Vehicle Type</Label>
              <Input
                id="vehicleType"
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                disabled={!isEditing}
                placeholder="e.g., Van, Truck, Car"
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleMake">Make</Label>
              <Input
                id="vehicleMake"
                value={formData.vehicleMake}
                onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                disabled={!isEditing}
                placeholder="e.g., Ford, Toyota"
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleModel">Model</Label>
              <Input
                id="vehicleModel"
                value={formData.vehicleModel}
                onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                disabled={!isEditing}
                placeholder="e.g., Transit, Camry"
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehiclePlate">License Plate</Label>
              <Input
                id="vehiclePlate"
                value={formData.vehiclePlate}
                onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                disabled={!isEditing}
                placeholder="e.g., ABC-1234"
                className="rounded-2xl"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Mode Actions */}
      {isEditing && (
        <Card className="mt-6 border-accent/20 bg-accent/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground">
                Make changes to your profile and click save when done
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  variant="accent"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
