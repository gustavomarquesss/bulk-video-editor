import { useId } from 'react';
import './ui.css';

interface SliderProps {
  label: string;
  /** Valor já formatado para exibição (ex.: "55%"). */
  valueLabel: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  hint?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  valueLabel,
  value,
  min,
  max,
  step = 1,
  hint,
  disabled,
  onChange,
}: SliderProps) {
  const id = useId();
  return (
    <div className="slider">
      <div className="slider__row">
        <label className="slider__label" htmlFor={id}>
          {label}
        </label>
        <output className="slider__value" htmlFor={id}>
          {valueLabel}
        </output>
      </div>
      <input
        id={id}
        className="slider__input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <p className="slider__hint">{hint}</p>
    </div>
  );
}
