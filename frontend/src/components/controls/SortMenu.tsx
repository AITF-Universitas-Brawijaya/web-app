export function SortMenu({
  sortCol,
  sortOrder,
  onApply,
}: {
  sortCol: "tanggal" | "kepercayaan"
  sortOrder: "asc" | "desc"
  onApply: (col: "tanggal" | "kepercayaan", order: "asc" | "desc") => void
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        className="h-8 rounded-md border border-border bg-background px-2 text-sm"
        value={sortCol}
        onChange={(e) => onApply(e.target.value as any, sortOrder)}
      >
        <option value="tanggal">Tanggal</option>
        <option value="kepercayaan">Kepercayaan</option>
      </select>
      <select
        className="h-8 rounded-md border border-border bg-background px-2 text-sm"
        value={sortOrder}
        onChange={(e) => onApply(sortCol, e.target.value as any)}
      >
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>
    </div>
  )
}
