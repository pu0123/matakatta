import { formatAmountInput, parseAmountInput } from '../format'

interface AmountInputProps {
  value: number
  onChange: (value: number) => void
  label: string
  max?: number
}

export function AmountInput({ value, onChange, label, max }: AmountInputProps) {
  const displayed = formatAmountInput(value)

  return (
    <label className="amount-input">
      <span aria-hidden="true">¥</span>
      <input
        aria-label={label}
        inputMode="numeric"
        pattern="[0-9,]*"
        value={displayed}
        style={{ width: `${Math.max(1, displayed.length)}ch` }}
        onChange={(event) => onChange(parseAmountInput(event.target.value, max))}
      />
    </label>
  )
}
