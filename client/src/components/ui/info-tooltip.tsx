import type { ReactNode } from 'react';
import { InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function InfoTooltip({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
        >
          <InfoIcon className="size-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-72 p-3 leading-relaxed space-y-2">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
