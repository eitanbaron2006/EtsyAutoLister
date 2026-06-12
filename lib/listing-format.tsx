// Etsy listing copy formatting helpers (preview JSX + plain-text export).
import React from 'react';

const parseBoldText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-[#15140f] dark:text-[#f7f1de]">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

export const renderFormattedDescription = (text: string) => {
  if (!text) return <p className="text-xs text-[#8b8676] italic">No description provided.</p>;

  let normalized = text;

  // Normalize by finding any uppercase header (3-40 chars of letters/spaces/dashes) followed by a colon
  // and putting double newlines around it. Safe lookbehind-free regular expression without /s flag.
  normalized = normalized.replace(/\s*(?:\n)*\s*([A-Z][A-Z\s\-]{2,40}:)\s*/g, "\n\n$1\n\n");

  const lines = normalized.split(/\n\n+/);
  const elements: React.ReactNode[] = [];
  let currentHeader: string | null = null;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Check if the line itself is a standardized header (e.g. "WHY YOU WILL LOVE IT:")
    const isHeader = /^[A-Z][A-Z\s\-]{2,40}:$/i.test(trimmed);
    if (isHeader) {
      currentHeader = trimmed;
      const headingText = trimmed.replace(/:$/, '');
      const isNotice = headingText.toUpperCase().includes("PLEASE NOTE") || headingText.toUpperCase().includes("TERMS");

      elements.push(
        <h4
          key={`h-${idx}`}
          className={`text-[10px] font-mono font-bold tracking-widest uppercase border-b pb-1.5 mt-6 mb-3 first:mt-0 ${isNotice
            ? 'text-[#ed6f5c] border-[#ed6f5c]/25'
            : 'text-[#ed6f5c] border-[rgba(21,20,15,0.08)] dark:border-[rgba(247,241,222,0.08)]'
            }`}
        >
          {headingText}
        </h4>
      );
      return;
    }

    // Determine context style based on active header
    const isNoticeSection = currentHeader?.toUpperCase().includes("PLEASE NOTE") || currentHeader?.toUpperCase().includes("TERMS");

    // Parse list items or standard paragraphs
    const hasDashes = trimmed.includes(" - ") || trimmed.includes(" – ") || trimmed.includes(" — ");
    const hasBullets = trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("•");

    if (hasBullets) {
      const items = trimmed.split(/\n|[-*•]\s+/).map(item => item.trim()).filter(Boolean);
      elements.push(
        <ul key={`ul-${idx}`} className="space-y-2 list-none mb-4 pl-1">
          {items.map((item, itemIdx) => (
            <li key={itemIdx} className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed pl-3.5 relative">
              <span className="absolute left-0 top-1.5 text-[#ed6f5c] text-[10px] font-bold select-none leading-none">•</span>
              {parseBoldText(item)}
            </li>
          ))}
        </ul>
      );
    } else if (hasDashes) {
      // Split into items based on periods followed by spaces (safe, lookbehind-free sentence split)
      const rawItems = trimmed.split(/\.\s+/);
      const itemsFiltered = rawItems.map(item => item.trim()).filter(Boolean);

      const listItems: React.ReactNode[] = [];
      itemsFiltered.forEach((item, itemIdx) => {
        let fullItem = item;
        // Restore trailing period if lost in split and it's not the last item
        if (!fullItem.endsWith('.') && itemIdx < itemsFiltered.length - 1) {
          fullItem += '.';
        }

        // enforce spaces around dashes to avoid breaking words like "High-Quality"
        const dashMatch = fullItem.match(/^([\s\S]*?)\s+([-–—])\s+([\s\S]*)/);
        if (dashMatch) {
          const title = dashMatch[1].trim();
          const desc = dashMatch[3].trim();
          listItems.push(
            <li key={itemIdx} className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed pl-3.5 relative">
              <span className="absolute left-0 top-1.5 text-[#ed6f5c] text-[10px] font-bold select-none leading-none">•</span>
              <strong className="font-bold text-[#15140f] dark:text-[#f7f1de]">{title}</strong> — {parseBoldText(desc)}
            </li>
          );
        } else {
          listItems.push(
            <li key={itemIdx} className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed pl-3.5 relative">
              <span className="absolute left-0 top-1.5 text-[#ed6f5c] text-[10px] font-bold select-none leading-none">•</span>
              {parseBoldText(fullItem)}
            </li>
          );
        }
      });

      elements.push(
        <ul key={`ul-${idx}`} className="space-y-2 list-none mb-4 pl-1">
          {listItems}
        </ul>
      );
    } else {
      // Render standard paragraph text
      if (isNoticeSection) {
        // Special premium warning callout box design
        elements.push(
          <div key={`p-${idx}`} className="p-4 rounded-xl border border-[#ed6f5c]/25 bg-[#ed6f5c]/5 dark:bg-[#ed6f5c]/10 text-[#5a5448] dark:text-[#ece4cf] mb-4 text-xs leading-relaxed text-left relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ed6f5c]" />
            <span className="font-mono font-bold text-[9px] uppercase tracking-wider text-[#ed6f5c] block mb-1 select-none">Attention Required</span>
            {parseBoldText(trimmed)}
          </div>
        );
      } else {
        elements.push(
          <p key={`p-${idx}`} className="text-xs text-[#5a5448] dark:text-[#ece4cf] leading-relaxed mb-4 last:mb-0">
            {parseBoldText(trimmed)}
          </p>
        );
      }
    }
  });

  return <div className="space-y-1">{elements}</div>;
};

export const getFormattedPlainTextDescription = (text: string): string => {
  if (!text) return "";

  let normalized = text.trim();

  // Normalize by finding any uppercase header (3-40 chars of letters/spaces/dashes) followed by a colon
  // and putting double newlines around it. Safe lookbehind-free regular expression without /s flag.
  normalized = normalized.replace(/\s*(?:\n)*\s*([A-Z][A-Z\s\-]{2,40}:)\s*/g, "\n\n$1\n\n");

  const lines = normalized.split(/\n\n+/);
  const formattedLines: string[] = [];
  let currentHeader: string | null = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Check if the line itself is a standardized header (e.g. "WHY YOU WILL LOVE IT:")
    const isHeader = /^[A-Z][A-Z\s\-]{2,40}:$/i.test(trimmed);
    if (isHeader) {
      currentHeader = trimmed;
      formattedLines.push(trimmed);
      return;
    }

    // Parse list items or standard paragraphs
    const hasDashes = trimmed.includes(" - ") || trimmed.includes(" – ") || trimmed.includes(" — ");
    const hasBullets = trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("•");

    if (hasBullets) {
      const items = trimmed.split(/\n|[-*•]\s+/).map(item => item.trim()).filter(Boolean);
      items.forEach(item => {
        formattedLines.push(`• ${item}`);
      });
    } else if (hasDashes) {
      // Split into items based on periods followed by spaces (safe, lookbehind-free sentence split)
      const rawItems = trimmed.split(/\.\s+/);
      const itemsFiltered = rawItems.map(item => item.trim()).filter(Boolean);

      itemsFiltered.forEach((item, itemIdx) => {
        let fullItem = item;
        // Restore trailing period if lost in split and it's not the last item
        if (!fullItem.endsWith('.') && itemIdx < itemsFiltered.length - 1) {
          fullItem += '.';
        }

        // enforce spaces around dashes to avoid breaking words like "High-Quality"
        const dashMatch = fullItem.match(/^([\s\S]*?)\s+([-–—])\s+([\s\S]*)/);
        if (dashMatch) {
          const title = dashMatch[1].trim();
          const desc = dashMatch[3].trim();
          formattedLines.push(`• ${title} — ${desc}`);
        } else {
          formattedLines.push(`• ${fullItem}`);
        }
      });
    } else {
      formattedLines.push(trimmed);
    }
  });

  return formattedLines.join("\n\n");
};
