'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function GoogleDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({
    env: {},
    googleMaps: {},
    supabase: {},
    errors: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    checkEnvironmentVariables();
    checkGoogleMapsAPI();
    checkSupabaseConfig();
  }, []);

  const checkEnvironmentVariables = () => {
    const envVars = {
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };

    setDebugInfo(prev => ({
      ...prev,
      env: {
        ...envVars,
        mapsKeyPresent: !!envVars.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        mapsKeyLength: envVars.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.length || 0,
        supabaseUrlPresent: !!envVars.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKeyPresent: !!envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    }));
  };

  const checkGoogleMapsAPI = async () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setDebugInfo(prev => ({
        ...prev,
        googleMaps: { error: 'No API key found' },
        errors: [...prev.errors, 'Google Maps API key is missing']
      }));
      return;
    }

    // Check if Google Maps is loaded
    const isLoaded = typeof window !== 'undefined' && window.google?.maps;
    
    // Try to load Google Maps
    if (!isLoaded) {
      try {
        await loadGoogleMapsScript(apiKey);
        setDebugInfo(prev => ({
          ...prev,
          googleMaps: {
            ...prev.googleMaps,
            scriptLoaded: true,
            librariesAvailable: {
              maps: !!window.google?.maps,
              places: !!window.google?.maps?.places,
              geometry: !!window.google?.maps?.geometry
            }
          }
        }));
      } catch (error) {
        setDebugInfo(prev => ({
          ...prev,
          googleMaps: {
            ...prev.googleMaps,
            scriptLoaded: false,
            loadError: error.message
          },
          errors: [...prev.errors, `Failed to load Google Maps: ${error.message}`]
        }));
      }
    } else {
      setDebugInfo(prev => ({
        ...prev,
        googleMaps: {
          alreadyLoaded: true,
          librariesAvailable: {
            maps: !!window.google?.maps,
            places: !!window.google?.maps?.places,
            geometry: !!window.google?.maps?.geometry
          }
        }
      }));
    }

    // Test API key validity
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=Function.prototype`
      );
      
      if (!response.ok) {
        const text = await response.text();
        if (text.includes('InvalidKeyMapError')) {
          setDebugInfo(prev => ({
            ...prev,
            googleMaps: {
              ...prev.googleMaps,
              keyValid: false,
              keyError: 'Invalid API key'
            },
            errors: [...prev.errors, 'Google Maps API key is invalid']
          }));
        } else if (text.includes('RefererNotAllowedMapError')) {
          setDebugInfo(prev => ({
            ...prev,
            googleMaps: {
              ...prev.googleMaps,
              keyValid: true,
              keyError: 'Referrer not allowed'
            },
            errors: [...prev.errors, 'Current domain is not allowed for this API key']
          }));
        }
      } else {
        setDebugInfo(prev => ({
          ...prev,
          googleMaps: {
            ...prev.googleMaps,
            keyValid: true
          }
        }));
      }
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        googleMaps: {
          ...prev.googleMaps,
          testError: error.message
        }
      }));
    }
  };

  const checkSupabaseConfig = async () => {
    try {
      // Get Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      setDebugInfo(prev => ({
        ...prev,
        supabase: {
          connected: true,
          hasSession: !!session,
          sessionError: sessionError?.message,
          user: session?.user ? {
            id: session.user.id,
            email: session.user.email,
            provider: session.user.app_metadata?.provider
          } : null
        }
      }));
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        supabase: {
          connected: false,
          error: error.message
        },
        errors: [...prev.errors, `Supabase connection error: ${error.message}`]
      }));
    }
  };

  const testGoogleOAuth = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/debug/google?oauth_test=true`,
        },
      });

      if (error) {
        setDebugInfo(prev => ({
          ...prev,
          errors: [...prev.errors, `OAuth error: ${error.message}`]
        }));
      }
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        errors: [...prev.errors, `OAuth test failed: ${error.message}`]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google?.maps) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      document.head.appendChild(script);
    });
  };

  const testMapCreation = async () => {
    try {
      const div = document.createElement('div');
      div.style.width = '100px';
      div.style.height = '100px';
      document.body.appendChild(div);

      const map = new google.maps.Map(div, {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 8,
      });

      document.body.removeChild(div);

      setDebugInfo(prev => ({
        ...prev,
        googleMaps: {
          ...prev.googleMaps,
          mapCreationTest: 'Success'
        }
      }));
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        googleMaps: {
          ...prev.googleMaps,
          mapCreationTest: `Failed: ${error.message}`
        },
        errors: [...prev.errors, `Map creation failed: ${error.message}`]
      }));
    }
  };

  const testPlacesAutocomplete = async () => {
    try {
      const input = document.createElement('input');
      document.body.appendChild(input);

      const autocomplete = new google.maps.places.Autocomplete(input);
      
      document.body.removeChild(input);

      setDebugInfo(prev => ({
        ...prev,
        googleMaps: {
          ...prev.googleMaps,
          placesTest: 'Success'
        }
      }));
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        googleMaps: {
          ...prev.googleMaps,
          placesTest: `Failed: ${error.message}`
        },
        errors: [...prev.errors, `Places API test failed: ${error.message}`]
      }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Google Integration Debug Page</h1>

      {/* Environment Variables */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {debugInfo.env.mapsKeyPresent ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <X className="h-5 w-5 text-red-500" />
            )}
            <span>Google Maps API Key: {debugInfo.env.mapsKeyPresent ? `Present (${debugInfo.env.mapsKeyLength} chars)` : 'Missing'}</span>
          </div>
          <div className="flex items-center gap-2">
            {debugInfo.env.supabaseUrlPresent ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <X className="h-5 w-5 text-red-500" />
            )}
            <span>Supabase URL: {debugInfo.env.supabaseUrlPresent ? 'Present' : 'Missing'}</span>
          </div>
          <div className="flex items-center gap-2">
            {debugInfo.env.supabaseKeyPresent ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <X className="h-5 w-5 text-red-500" />
            )}
            <span>Supabase Anon Key: {debugInfo.env.supabaseKeyPresent ? 'Present' : 'Missing'}</span>
          </div>
        </div>
      </Card>

      {/* Google Maps Status */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Google Maps API Status</h2>
        <div className="space-y-2">
          {debugInfo.googleMaps.scriptLoaded !== undefined && (
            <div className="flex items-center gap-2">
              {debugInfo.googleMaps.scriptLoaded ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <X className="h-5 w-5 text-red-500" />
              )}
              <span>Script Loaded: {debugInfo.googleMaps.scriptLoaded ? 'Yes' : 'No'}</span>
            </div>
          )}
          
          {debugInfo.googleMaps.keyValid !== undefined && (
            <div className="flex items-center gap-2">
              {debugInfo.googleMaps.keyValid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <X className="h-5 w-5 text-red-500" />
              )}
              <span>API Key Valid: {debugInfo.googleMaps.keyValid ? 'Yes' : 'No'}</span>
              {debugInfo.googleMaps.keyError && (
                <span className="text-red-500 text-sm">({debugInfo.googleMaps.keyError})</span>
              )}
            </div>
          )}

          {debugInfo.googleMaps.librariesAvailable && (
            <div className="ml-4 space-y-1">
              <div className="flex items-center gap-2">
                {debugInfo.googleMaps.librariesAvailable.maps ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Maps Library</span>
              </div>
              <div className="flex items-center gap-2">
                {debugInfo.googleMaps.librariesAvailable.places ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Places Library</span>
              </div>
              <div className="flex items-center gap-2">
                {debugInfo.googleMaps.librariesAvailable.geometry ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Geometry Library</span>
              </div>
            </div>
          )}

          {debugInfo.googleMaps.scriptLoaded && (
            <div className="mt-4 space-x-2">
              <Button onClick={testMapCreation} size="sm">
                Test Map Creation
              </Button>
              <Button onClick={testPlacesAutocomplete} size="sm">
                Test Places Autocomplete
              </Button>
            </div>
          )}

          {debugInfo.googleMaps.mapCreationTest && (
            <div className="mt-2 text-sm">
              Map Creation Test: <span className={debugInfo.googleMaps.mapCreationTest === 'Success' ? 'text-green-600' : 'text-red-600'}>
                {debugInfo.googleMaps.mapCreationTest}
              </span>
            </div>
          )}

          {debugInfo.googleMaps.placesTest && (
            <div className="mt-2 text-sm">
              Places API Test: <span className={debugInfo.googleMaps.placesTest === 'Success' ? 'text-green-600' : 'text-red-600'}>
                {debugInfo.googleMaps.placesTest}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Supabase Status */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Supabase OAuth Status</h2>
        <div className="space-y-2">
          {debugInfo.supabase.connected !== undefined && (
            <div className="flex items-center gap-2">
              {debugInfo.supabase.connected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <X className="h-5 w-5 text-red-500" />
              )}
              <span>Supabase Connected: {debugInfo.supabase.connected ? 'Yes' : 'No'}</span>
            </div>
          )}

          {debugInfo.supabase.hasSession !== undefined && (
            <div className="flex items-center gap-2">
              {debugInfo.supabase.hasSession ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <span>Active Session: {debugInfo.supabase.hasSession ? 'Yes' : 'No'}</span>
            </div>
          )}

          {debugInfo.supabase.user && (
            <div className="ml-4 text-sm space-y-1">
              <div>Email: {debugInfo.supabase.user.email}</div>
              <div>Provider: {debugInfo.supabase.user.provider}</div>
            </div>
          )}

          <div className="mt-4">
            <Button 
              onClick={testGoogleOAuth} 
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? 'Testing...' : 'Test Google OAuth'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Errors */}
      {debugInfo.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Errors Found:</div>
            <ul className="list-disc list-inside space-y-1">
              {debugInfo.errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Debug Info */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Raw Debug Information</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </Card>

      {/* Instructions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Troubleshooting Guide</h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold">Google Maps Issues:</h3>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Ensure your API key has Maps JavaScript API and Places API enabled</li>
              <li>Check API key restrictions match your domain (localhost:3000 for dev)</li>
              <li>Verify billing is enabled on your Google Cloud project</li>
              <li>Check browser console for specific error messages</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold">Google OAuth Issues:</h3>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Verify OAuth consent screen is configured in Google Cloud Console</li>
              <li>Check authorized redirect URIs include your Supabase callback URL</li>
              <li>Ensure Client ID and Secret are correctly added to Supabase</li>
              <li>Verify Supabase redirect URLs include your app's auth callback</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
