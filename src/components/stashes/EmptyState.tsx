import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateStashDialog } from "./CreateStashDialog";

export function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
            aria-hidden="true"
          >
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No stashes yet</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          You haven't created any stashes yet. Start saving by creating your first stash.
        </p>
        <CreateStashDialog
          trigger={
            <Button size="lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Create Your First Stash
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
