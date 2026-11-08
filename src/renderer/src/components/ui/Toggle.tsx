import './ui.css';

interface ToggleProps {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, hint, checked, disabled, onChange }: ToggleProps) {
  return (
    <label className="toggle">
      <input
        className="toggle__input"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="toggle__label">{label}</span>
        {hint && <span className="toggle__hint"> — {hint}</span>}
      </span>
    </label>
  );
}
