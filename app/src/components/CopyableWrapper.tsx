import React, {useState} from 'react';
import {CopyIcon, CheckIcon, CodeIcon, BarChartIcon} from '@radix-ui/react-icons';
import Papa from 'papaparse';
import Button from './ui/Button';
import SQLViewer from './SQLViewer';

interface CopyableWrapperProps {
  children: React.ReactNode;
  data: unknown[];
  filename?: string;
  className?: string;
  /** Optional SQL query that generates this data. When provided, shows a toggle to view the SQL. */
  sql?: string;
}

export default function CopyableWrapper({
  children,
  data,
  filename = 'data',
  className = '',
  sql,
}: CopyableWrapperProps) {
  const [copied, setCopied] = useState(false);
  const [showSQL, setShowSQL] = useState(false);

  const handleCopy = async () => {
    try {
      if (showSQL && sql) {
        await navigator.clipboard.writeText(sql);
      } else {
        const csv = Papa.unparse(data);
        await navigator.clipboard.writeText(csv);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy data:', err);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      {showSQL && sql ? <SQLViewer sql={sql} className="min-h-[200px]" hideCopyButton /> : children}
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {sql && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSQL(!showSQL)}
            className="bg-white/90 backdrop-blur-sm shadow-sm"
            title={showSQL ? 'Show chart' : 'Show SQL'}
          >
            {showSQL ? (
              <>
                <BarChartIcon className="h-3 w-3 mr-1" />
                Chart
              </>
            ) : (
              <>
                <CodeIcon className="h-3 w-3 mr-1" />
                SQL
              </>
            )}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="bg-white/90 backdrop-blur-sm shadow-sm"
          title={showSQL ? 'Copy SQL' : `Copy ${filename} as CSV`}
        >
          {copied ? (
            <>
              <CheckIcon className="h-3 w-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <CopyIcon className="h-3 w-3 mr-1" />
              {showSQL ? 'Copy SQL' : 'Copy CSV'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
