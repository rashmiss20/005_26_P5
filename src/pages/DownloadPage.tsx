import { useState } from 'react';
import JSZip from 'jszip';
import { Download, FileCode, FolderTree, CheckCircle2, Loader } from 'lucide-react';
import { Layout, PageHeader } from '@/components/Layout';
import { PROJECT_FILES } from '@/lib/projectFiles';
import { useToast } from '@/components/ui/Toast';

export default function DownloadPage() {
  const toast = useToast();
  const [zipping, setZipping] = useState(false);
  const [done, setDone] = useState(false);

  const handleDownload = async () => {
    setZipping(true);
    setDone(false);
    try {
      const zip = new JSZip();

      // Add all source files
      for (const file of PROJECT_FILES) {
        zip.file(file.path, file.content);
      }

      // Generate a .gitignore entry for node_modules and dist
      // (already included via PROJECT_FILES, but ensure it's complete)

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'city-bus-breakdown-tracker.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDone(true);
      toast.push('success', 'Project zip downloaded successfully.');
    } catch (e) {
      toast.push('error', `Failed to create zip: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
    setZipping(false);
  };

  const totalSize = PROJECT_FILES.reduce((sum, f) => sum + f.content.length, 0);

  return (
    <Layout>
      <PageHeader
        title="Download Project"
        subtitle="Download the complete project source code as a zip file"
        icon={Download}
      />

      <div className="max-w-2xl space-y-6">
        {/* Download card */}
        <div className="card p-8 text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-navy-700 text-white mb-4">
            <Download className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-navy-900 mb-2">City Bus Breakdown Tracker</h3>
          <p className="text-sm text-navy-500 mb-1">
            {PROJECT_FILES.length} files · approximately {(totalSize / 1024).toFixed(0)} KB of source code
          </p>
          <p className="text-xs text-navy-400 mb-6">
            Includes all source files, configuration, and README. Run <code className="font-mono bg-navy-100 px-1.5 py-0.5 rounded">npm install</code> after extracting.
          </p>

          <button
            onClick={handleDownload}
            disabled={zipping}
            className="btn-accent mx-auto"
          >
            {zipping ? (
              <><Loader className="h-4 w-4 animate-spin" /> Creating zip…</>
            ) : done ? (
              <><CheckCircle2 className="h-4 w-4" /> Download again</>
            ) : (
              <><Download className="h-4 w-4" /> Download Project ZIP</>
            )}
          </button>

          {done && (
            <p className="text-xs text-green-600 mt-4 animate-fade-in">
              Download started! Check your downloads folder.
            </p>
          )}
        </div>

        {/* File list */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-navy-100">
            <h3 className="text-sm font-semibold text-navy-800 flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-cyan-500" /> Included Files ({PROJECT_FILES.length})
            </h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-navy-50">
                {PROJECT_FILES.map((f) => (
                  <tr key={f.path} className="hover:bg-navy-50/30">
                    <td className="px-5 py-2 flex items-center gap-2">
                      <FileCode className="h-3.5 w-3.5 text-navy-300 shrink-0" />
                      <span className="font-mono text-xs text-navy-700">{f.path}</span>
                    </td>
                    <td className="px-5 py-2 text-right text-xs text-navy-400 whitespace-nowrap">
                      {f.content.length} bytes
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-navy-800 mb-3">After downloading</h3>
          <ol className="space-y-2 text-sm text-navy-600">
            <li className="flex gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-600 shrink-0">1</span>
              Unzip the file to a folder on your computer
            </li>
            <li className="flex gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-600 shrink-0">2</span>
              Open a terminal in that folder and run <code className="font-mono bg-navy-100 px-1.5 py-0.5 rounded text-xs">npm install</code>
            </li>
            <li className="flex gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-600 shrink-0">3</span>
              Start the dev server with <code className="font-mono bg-navy-100 px-1.5 py-0.5 rounded text-xs">npm run dev</code>
            </li>
            <li className="flex gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-600 shrink-0">4</span>
              Open the URL shown in the terminal (usually <code className="font-mono bg-navy-100 px-1.5 py-0.5 rounded text-xs">http://localhost:5173</code>)
            </li>
          </ol>
        </div>
      </div>
    </Layout>
  );
}
