import { TemplateListSidebar } from '@/components/template-list-sidebar';

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1">
      <TemplateListSidebar />
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
