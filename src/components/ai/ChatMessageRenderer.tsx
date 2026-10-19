import React from 'react';
import { ExternalLink, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

export const ChatMessageRenderer: React.FC<{ content: string }> = ({ content }) => {
  // Parse lines into paragraphs, headers, bullet points, and alerts
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="my-2 space-y-1.5 list-disc pl-5 text-xs text-[#292524]">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const parseInline = (text: string): React.ReactNode => {
    // Regex for bold **text**, code `text`, and markdown links [text](url)
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.substring(lastIdx, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-semibold text-[#1C1917]">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded-md bg-[#FAF7F0] border border-[#EFE8DC] font-mono text-[11px] text-[#78350F]"
          >
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
        const linkText = token.substring(1, token.indexOf(']('));
        const linkUrl = token.substring(token.indexOf('](') + 2, token.length - 1);
        parts.push(
          <a
            key={match.index}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-[#1E3A8A] hover:underline"
          >
            <span>{linkText}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        );
      }
      lastIdx = regex.lastIndex;
    }

    if (lastIdx < text.length) {
      parts.push(text.substring(lastIdx));
    }

    return parts.length > 0 ? parts : text;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      flushList();
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm font-bold text-[#1C1917] mt-3 mb-1.5 flex items-center gap-1.5">
          {parseInline(line.replace('### ', ''))}
        </h3>
      );
    } else if (line.startsWith('#### ')) {
      flushList();
      elements.push(
        <h4 key={`h4-${i}`} className="text-xs font-bold text-[#44403C] uppercase tracking-wider mt-2.5 mb-1">
          {parseInline(line.replace('#### ', ''))}
        </h4>
      );
    } else if (line.startsWith('> [!IMPORTANT]') || line.startsWith('> [!NOTE]')) {
      flushList();
      // Collect blockquote lines
      const bqLines = [line.replace(/^> \[\!(IMPORTANT|NOTE)\]/, '').trim()];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
        i++;
        bqLines.push(lines[i].trim().replace(/^>\s*/, ''));
      }
      elements.push(
        <div
          key={`alert-${i}`}
          className="my-3 p-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs leading-relaxed"
        >
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-[#D97706]" />
            <span>Important Notice (Proposal Only)</span>
          </div>
          <div>{parseInline(bqLines.filter(Boolean).join(' '))}</div>
        </div>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
      inList = true;
      const cleanItem = line.replace(/^(-\s+|\*\s+|\d+\.\s+)/, '');
      listItems.push(
        <li key={`li-${i}`} className="leading-relaxed">
          {parseInline(cleanItem)}
        </li>
      );
    } else if (line === '---') {
      flushList();
      elements.push(<hr key={`hr-${i}`} className="my-2.5 border-[#EFE8DC]" />);
    } else {
      flushList();
      elements.push(
        <p key={`p-${i}`} className="text-xs leading-relaxed text-[#292524] my-1.5">
          {parseInline(line)}
        </p>
      );
    }
  }

  flushList();

  return <div className="space-y-1">{elements}</div>;
};
