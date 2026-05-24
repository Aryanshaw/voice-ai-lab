import { Skeleton } from "@/components/ui/skeleton";

export function SessionTurnsSkeleton() {
  return (
    <div className="space-y-3 max-w-2xl mx-auto w-full pt-2">
      {/* Simulated User Message */}
      <div className="flex justify-end">
        <Skeleton className="h-[44px] w-64 rounded-2xl opacity-60" />
      </div>
      
      {/* Simulated Assistant Message */}
      <div className="flex justify-start">
        <div className="space-y-1">
          <Skeleton className="h-[64px] w-80 rounded-2xl opacity-40" />
          <Skeleton className="h-[14px] w-10 opacity-30 ml-2" />
        </div>
      </div>

      {/* Simulated User Message */}
      <div className="flex justify-end pt-4">
        <Skeleton className="h-[44px] w-48 rounded-2xl opacity-60" />
      </div>
      
      {/* Simulated Assistant Message */}
      <div className="flex justify-start">
        <div className="space-y-1">
          <Skeleton className="h-[104px] w-72 rounded-2xl opacity-40" />
          <Skeleton className="h-[14px] w-12 opacity-30 ml-2" />
        </div>
      </div>
    </div>
  );
}
