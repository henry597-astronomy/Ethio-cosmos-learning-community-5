import { useEffect, useState } from 'react';
import { ShieldAlert, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/supabase';

// Current app version matching the latest build
const CURRENT_APP_VERSION = 45; // v1.10.16 stale-room and Admin room management fix

export default function AppVersionCheck({ children }: { children: React.ReactNode }) {
  const [updateRequired, setUpdateRequired] = useState(false);
  const [minVersion, setMinVersion] = useState(CURRENT_APP_VERSION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkVersion() {
      // The web deployment must remain available; enforce retirement only in native APKs.
      if (!Capacitor.isNativePlatform()) {
        setLoading(false);
        return;
      }

      try {
        // Fetch minimum required version from Supabase site_content
        const { data, error } = await supabase
          .from('site_content')
          .select('value')
          .eq('key', 'min_apk_version')
          .maybeSingle();

        if (!error && data?.value) {
          const required = Number(data.value);
          if (!isNaN(required) && required > CURRENT_APP_VERSION) {
            setMinVersion(required);
            setUpdateRequired(true);
          }
        }
      } catch (err) {
        console.error('Error checking app version:', err);
      } finally {
        setLoading(false);
      }
    }

    // Only run on mobile/capacitor or always
    void checkVersion();
  }, []);

  if (loading) {
    return <>{children}</>;
  }

  if (updateRequired) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 p-6 text-center">
        <div className="max-w-md rounded-2xl border border-orange-500/30 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-400">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-xl font-bold text-white">Update Required</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-300">
            A newer, more secure version of EthioCosmos is required to continue. Previous versions have been retired. Please download the latest update.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => {
                window.location.href = '/api/download/apk';
              }}
              className="w-full bg-orange-500 text-white hover:bg-orange-600 flex items-center justify-center gap-2 py-3"
            >
              <Download size={18} />
              Download Latest APK
            </Button>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Current version: v1.{CURRENT_APP_VERSION} (Required: v1.{minVersion})
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
