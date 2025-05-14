import { StorageDiagnostics } from "@/components/storage-diagnostics";

export default function DiagnosticPage() {
  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-6 text-center">Diagnóstico de Supabase Storage</h1>
      <p className="text-center mb-8 text-muted-foreground">
        Esta herramienta te ayudará a diagnosticar problemas con la conexión a Supabase Storage.
      </p>
      
      <div className="flex justify-center">
        <StorageDiagnostics />
      </div>
    </div>
  );
} 