import React, { useRef, useState } from "react";
import { GripVertical } from "lucide-react";

type Props<T extends { id: string }> = {
  items: T[];
  disabled?: boolean;
  onReorder: (next: T[]) => void | Promise<void>;
  renderRow: (item: T, index: number) => React.ReactNode;
};

/**
 * HTML5 drag-and-drop table body. Drag handle in first cell of each row via renderRow —
 * or wrap your <tr> and put GripVertical yourself. This component expects renderRow to return <tr>.
 */
export function SortableTableBody<T extends { id: string }>({
  items,
  disabled,
  onReorder,
  renderRow,
}: Props<T>) {
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const canDrag = !disabled && !saving && items.length > 1;

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    if (!canDrag) {
      e.preventDefault();
      return;
    }
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    if (!canDrag || dragIndex.current === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overIndex !== index) setOverIndex(index);
  };

  const handleDrop = (index: number) => async (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndex.current;
    dragIndex.current = null;
    setOverIndex(null);
    if (from === null || from === index || !canDrag) return;

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);

    setSaving(true);
    try {
      await onReorder(next);
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    setOverIndex(null);
  };

  return (
    <tbody className="divide-y divide-gray-200 bg-white">
      {items.map((item, index) => (
        <tr
          key={item.id}
          draggable={canDrag}
          onDragStart={handleDragStart(index)}
          onDragOver={handleDragOver(index)}
          onDrop={handleDrop(index)}
          onDragEnd={handleDragEnd}
          className={`hover:bg-gray-50/80 transition-colors ${
            overIndex === index ? "bg-primary-50 ring-1 ring-inset ring-primary-200" : ""
          } ${canDrag ? "cursor-grab active:cursor-grabbing" : ""} ${saving ? "opacity-60" : ""}`}
        >
          {renderRow(item, index)}
        </tr>
      ))}
    </tbody>
  );
}

export const DragHandle: React.FC<{ disabled?: boolean }> = ({ disabled }) => (
  <span
    className={`inline-flex items-center justify-center text-neutral-400 ${
      disabled ? "opacity-40" : "hover:text-neutral-600"
    }`}
    title={disabled ? "Clear search/filters to reorder" : "Drag to reorder"}
    aria-hidden
  >
    <GripVertical className="h-4 w-4" />
  </span>
);
