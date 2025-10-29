'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { IconFilePlus, IconFileImport, IconDownload, IconTrash, IconTag } from '@tabler/icons-react';

export type ToolbarAction = {
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'destructive';
  node?: React.ReactNode;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, React.ComponentType<any>> = {
  Add: IconFilePlus,
  Import: IconFileImport,
  Export: IconDownload,
  Delete: IconTrash,
};

function LabelWithIcon({ label }: { label: string }) {
  const Icon = iconMap[label] ?? IconTag;
  return (
    <>
      <Icon className="mr-1.5 size-4" />
      {label}
    </>
  );
}

export default function ResourcePage({
  children,
  searchPlaceholder = 'Search...',
  toolbarActions = [],
  onSearch,
}: React.PropsWithChildren<{
  searchPlaceholder?: string;
  toolbarActions?: ToolbarAction[];
  onSearch?: (q: string) => void;
}>) {
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    if (onSearch) onSearch(query);
  }, [query, onSearch]);

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <input type="search" placeholder={searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-md border border-input bg-background px-4 h-9 text-sm shadow-sm" aria-label={searchPlaceholder} />
          </div>

          <div className="flex items-center gap-2">
            {toolbarActions.map((a, i) =>
              a.node ? (
                <React.Fragment key={`${a.label}-${i}`}>{a.node}</React.Fragment>
              ) : (
                <Button key={`${a.label}-${i}`} size="sm" variant={a.variant === 'destructive' ? 'destructive' : a.variant === 'outline' ? 'outline' : undefined} onClick={a.onClick}>
                  <LabelWithIcon label={a.label} />
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      {/* table/content goes here */}
      <div>{children}</div>
    </div>
  );
}
