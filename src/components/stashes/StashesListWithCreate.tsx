import { useStashes } from "@/components/hooks/useStashes";
import { CreateStashDialog } from "./CreateStashDialog";
import { StashListItem } from "./StashListItem";
import { EmptyState } from "./EmptyState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMemo } from "react";
import type { StashListItemDTO } from "@/types";

interface StashListItemViewModel {
  id: string;
  name: string;
  balance: string;
  url: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function transformToViewModel(stash: StashListItemDTO): StashListItemViewModel {
  return {
    id: stash.id,
    name: stash.name,
    balance: formatCurrency(stash.current_balance),
    url: `/app/stashes/${stash.id}`,
  };
}

export default function StashesListWithCreate() {
  const { stashes, isLoading, error, refresh } = useStashes();

  const viewModels = useMemo(() => {
    return stashes.map(transformToViewModel);
  }, [stashes]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Your Stashes</h1>
          <CreateStashDialog onSuccess={refresh} />
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
              role="status"
              aria-label="Loading stashes"
            ></div>
            <p className="text-sm text-muted-foreground">Loading your stashes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Your Stashes</h1>
          <CreateStashDialog onSuccess={refresh} />
        </div>
        <Alert variant="destructive">
          <AlertDescription>Could not load stashes. Please try again later.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (viewModels.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Your Stashes</h1>
          <CreateStashDialog onSuccess={refresh} />
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Your Stashes</h1>
        <CreateStashDialog onSuccess={refresh} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {viewModels.map((stash) => (
          <StashListItem key={stash.id} stash={stash} onMutate={refresh} />
        ))}
      </div>
    </div>
  );
}
