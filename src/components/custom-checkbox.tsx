'use client';

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

export function CustomCheckbox({ checked, onChange, id }: CustomCheckboxProps) {
  return (
    <label className="custom-checkbox-container cursor-pointer select-none inline-flex items-center gap-2">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span className="custom-checkmark" />
    </label>
  );
}
