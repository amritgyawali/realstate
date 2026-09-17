/** Server-rendered placeholder shown while the client-side browser hydrates. */
export function ListingSkeleton({ title }: { title: string }) {
  return (
    <div className="mx-auto flex max-w-wide flex-col gap-7 px-4 py-6 md:px-6 lg:flex-row">
      <div className="w-full shrink-0 space-y-3 lg:w-[265px]">
        <div className="skeleton h-8 w-full rounded" />
        <div className="skeleton h-6 w-full rounded" />
        {[...Array(4)].map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-14 w-full rounded" />
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-5 flex items-center justify-between border-b border-gray-200 pb-4">
          <h1 className="font-serif-title text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            {title}
          </h1>
          <div className="skeleton h-7 w-40 rounded" />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(9)].map((_, index) => (
            <div key={index} className="overflow-hidden rounded border border-gray-200">
              <div className="skeleton aspect-[4/3] w-full" />
              <div className="space-y-2 p-3">
                <div className="skeleton h-3.5 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="skeleton h-3.5 w-2/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
