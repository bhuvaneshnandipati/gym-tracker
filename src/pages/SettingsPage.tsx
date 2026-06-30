import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileText, LogOut, Upload } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useWorkouts, useSaveWorkout } from '@/hooks/useWorkouts';
import { env } from '@/lib/env';
import { workoutsToCSV, downloadTextFile, parseWorkoutsCSV } from '@/utils/csv';
import { exportWorkoutsPDF } from '@/utils/pdf';
import { todayISODate } from '@/utils/datetime';

export function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: workouts } = useWorkouts();
  const saveWorkout = useSaveWorkout();
  const fileInput = useRef<HTMLInputElement>(null);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const name = profile?.full_name ?? (user?.user_metadata?.full_name as string | undefined) ?? '—';
  const unit = profile?.weight_unit ?? 'lbs';
  const count = workouts?.length ?? 0;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const handleExportCSV = () => {
    if (!workouts || workouts.length === 0) {
      toast.info('No workouts to export yet');
      return;
    }
    downloadTextFile(`gym-tracker-${todayISODate()}.csv`, workoutsToCSV(workouts), 'text/csv');
    toast.success('CSV exported');
  };

  const handleExportPDF = async () => {
    if (!workouts || workouts.length === 0) {
      toast.info('No workouts to export yet');
      return;
    }
    setPdfLoading(true);
    try {
      await exportWorkoutsPDF(workouts, unit);
      toast.success('PDF exported');
    } catch {
      toast.error('Could not generate the PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const { workouts: parsed, errors } = parseWorkoutsCSV(text);
      if (parsed.length === 0) {
        toast.error('No valid workouts found in that file');
        return;
      }
      let saved = 0;
      for (const w of parsed) {
        await saveWorkout.mutateAsync(w);
        saved += 1;
      }
      toast.success(
        `Imported ${saved} workout${saved === 1 ? '' : 's'}${errors.length ? ` (${errors.length} rows skipped)` : ''}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <>
      <PageHeader title="Settings" description="Personalize the app and manage your account." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-iron-500 dark:text-iron-400">Name</dt>
              <dd className="truncate font-medium text-iron-800 dark:text-iron-200">{name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-iron-500 dark:text-iron-400">Email</dt>
              <dd className="truncate font-medium text-iron-800 dark:text-iron-200">
                {user?.email ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-iron-500 dark:text-iron-400">Default unit</dt>
              <dd className="font-medium uppercase text-iron-800 dark:text-iron-200">{unit}</dd>
            </div>
          </dl>
          <div className="mt-5">
            <Button variant="danger" onClick={handleSignOut} className="w-full sm:w-auto">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-sm text-iron-600 dark:text-iron-400">Theme</span>
            <ThemeToggle />
          </div>
          <div className="mt-6 border-t border-iron-100 pt-4 dark:border-iron-800">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-iron-500 dark:text-iron-400">App</dt>
                <dd className="font-medium text-iron-800 dark:text-iron-200">{env.appName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-iron-500 dark:text-iron-400">Version</dt>
                <dd className="font-medium text-iron-800 dark:text-iron-200">0.6.0</dd>
              </div>
            </dl>
          </div>
        </Card>

        {/* Data */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Your data</CardTitle>
            <span className="text-sm text-iron-400">{count} workouts</span>
          </CardHeader>
          <p className="mb-4 text-sm text-iron-500 dark:text-iron-400">
            Export everything you&apos;ve logged, or import workouts from a CSV in the same format.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleExportCSV}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="secondary" onClick={handleExportPDF} disabled={pdfLoading}>
              {pdfLoading ? <Spinner className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              Export PDF
            </Button>
            <Button
              variant="secondary"
              onClick={() => fileInput.current?.click()}
              disabled={importing}
            >
              {importing ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              Import CSV
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImport(file);
              }}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
