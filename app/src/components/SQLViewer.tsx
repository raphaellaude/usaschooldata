import {useState} from 'react';
import {CopyIcon, CheckIcon} from '@radix-ui/react-icons';
import Button from './ui/Button';

interface SQLViewerProps {
  sql: string;
  className?: string;
}

// SQL keywords for syntax highlighting
const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'ORDER BY',
  'GROUP BY',
  'HAVING',
  'JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'OUTER JOIN',
  'ON',
  'AS',
  'DISTINCT',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'IN',
  'NOT',
  'NULL',
  'IS',
  'LIKE',
  'BETWEEN',
  'EXISTS',
  'UNION',
  'ALL',
  'LIMIT',
  'OFFSET',
  'ASC',
  'DESC',
  'WITH',
  'CREATE',
  'TABLE',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'DROP',
  'ALTER',
  'INDEX',
  'VIEW',
  'TRIGGER',
  'FUNCTION',
  'PROCEDURE',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'TRANSACTION',
  'TRUE',
  'FALSE',
];

// SQL functions for highlighting
const SQL_FUNCTIONS = ['read_parquet', 'COALESCE', 'CAST', 'NULLIF', 'CONCAT', 'SUBSTRING', 'TRIM'];

/**
 * Formats SQL with basic indentation and line breaks
 */
function formatSQL(sql: string): string {
  // Normalize whitespace
  let formatted = sql.replace(/\s+/g, ' ').trim();

  // Add newlines before major clauses
  const majorClauses = [
    'SELECT',
    'FROM',
    'WHERE',
    'AND',
    'OR',
    'ORDER BY',
    'GROUP BY',
    'HAVING',
    'JOIN',
    'LEFT JOIN',
    'RIGHT JOIN',
    'INNER JOIN',
    'LIMIT',
  ];

  for (const clause of majorClauses) {
    // Use word boundaries to avoid matching partial words
    const regex = new RegExp(`\\s+${clause}\\b`, 'gi');
    formatted = formatted.replace(regex, `\n${clause}`);
  }

  // Indent lines after SELECT (columns)
  const lines = formatted.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Add proper indentation
    if (line.match(/^(AND|OR)\b/i)) {
      result.push('  ' + line);
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

/**
 * Applies syntax highlighting to SQL by wrapping tokens in spans
 */
function highlightSQL(sql: string): JSX.Element[] {
  const elements: JSX.Element[] = [];
  let key = 0;

  // Split into lines first
  const lines = sql.split('\n');

  lines.forEach((line, lineIndex) => {
    // Tokenize the line
    let remaining = line;
    let position = 0;

    while (remaining.length > 0) {
      let matched = false;

      // Check for string literals (single quotes)
      if (remaining.startsWith("'")) {
        const endQuote = remaining.indexOf("'", 1);
        if (endQuote !== -1) {
          const stringLiteral = remaining.substring(0, endQuote + 1);
          elements.push(
            <span key={key++} className="text-green-600">
              {stringLiteral}
            </span>
          );
          remaining = remaining.substring(endQuote + 1);
          matched = true;
        }
      }

      // Check for SQL keywords (case-insensitive)
      if (!matched) {
        for (const keyword of SQL_KEYWORDS) {
          const regex = new RegExp(`^(${keyword})\\b`, 'i');
          const match = remaining.match(regex);
          if (match) {
            elements.push(
              <span key={key++} className="text-blue-600 font-semibold">
                {match[1].toUpperCase()}
              </span>
            );
            remaining = remaining.substring(match[1].length);
            matched = true;
            break;
          }
        }
      }

      // Check for SQL functions
      if (!matched) {
        for (const func of SQL_FUNCTIONS) {
          const regex = new RegExp(`^(${func})\\s*\\(`, 'i');
          const match = remaining.match(regex);
          if (match) {
            elements.push(
              <span key={key++} className="text-purple-600">
                {match[1]}
              </span>
            );
            remaining = remaining.substring(match[1].length);
            matched = true;
            break;
          }
        }
      }

      // Check for numbers
      if (!matched) {
        const numberMatch = remaining.match(/^(\d+(\.\d+)?)/);
        if (numberMatch) {
          elements.push(
            <span key={key++} className="text-orange-600">
              {numberMatch[1]}
            </span>
          );
          remaining = remaining.substring(numberMatch[1].length);
          matched = true;
        }
      }

      // Check for comments (-- style)
      if (!matched && remaining.startsWith('--')) {
        elements.push(
          <span key={key++} className="text-gray-500 italic">
            {remaining}
          </span>
        );
        remaining = '';
        matched = true;
      }

      // Check for operators and punctuation
      if (!matched) {
        const opMatch = remaining.match(/^([=<>!]+|[(),.*])/);
        if (opMatch) {
          elements.push(
            <span key={key++} className="text-gray-600">
              {opMatch[1]}
            </span>
          );
          remaining = remaining.substring(opMatch[1].length);
          matched = true;
        }
      }

      // Handle whitespace
      if (!matched) {
        const wsMatch = remaining.match(/^(\s+)/);
        if (wsMatch) {
          elements.push(<span key={key++}>{wsMatch[1]}</span>);
          remaining = remaining.substring(wsMatch[1].length);
          matched = true;
        }
      }

      // Handle identifiers and other text
      if (!matched) {
        const identMatch = remaining.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (identMatch) {
          elements.push(
            <span key={key++} className="text-gray-800">
              {identMatch[1]}
            </span>
          );
          remaining = remaining.substring(identMatch[1].length);
          matched = true;
        }
      }

      // Fallback: consume one character
      if (!matched && remaining.length > 0) {
        elements.push(<span key={key++}>{remaining[0]}</span>);
        remaining = remaining.substring(1);
      }

      position++;
      // Safety check to prevent infinite loops
      if (position > 10000) {
        console.warn('SQL highlighting exceeded max iterations');
        break;
      }
    }

    // Add newline between lines (except the last one)
    if (lineIndex < lines.length - 1) {
      elements.push(<br key={key++} />);
    }
  });

  return elements;
}

export default function SQLViewer({sql, className = ''}: SQLViewerProps) {
  const [copied, setCopied] = useState(false);

  const formattedSQL = formatSQL(sql);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedSQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy SQL:', err);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="bg-white/90 backdrop-blur-sm shadow-sm"
          title="Copy SQL"
        >
          {copied ? (
            <>
              <CheckIcon className="h-3 w-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <CopyIcon className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-sm font-mono leading-relaxed">
        <code>{highlightSQL(formattedSQL)}</code>
      </pre>
    </div>
  );
}
