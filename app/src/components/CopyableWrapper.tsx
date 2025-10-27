import React, {useState} from 'react';
import {CopyIcon, CheckIcon} from '@radix-ui/react-icons';
import Papa from 'papaparse';
import Button from './ui/Button';

interface CopyableWrapperProps {
  children: React.ReactNode;
  data: unknown[];
  filename?: string;
  className?: string;
}

export default function CopyableWrapper({
  children,
  data,
  filename = 'data',
  className = '',
}: CopyableWrapperProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const csv = Papa.unparse(data);
      await navigator.clipboard.writeText(csv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy data:', err);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      {children}
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="bg-white/90 backdrop-blur-sm shadow-sm"
          title={`Copy ${filename} as CSV`}
        >
          {copied ? (
            <>
              <CheckIcon className="h-3 w-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <CopyIcon className="h-3 w-3 mr-1" />
              Copy CSV
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
