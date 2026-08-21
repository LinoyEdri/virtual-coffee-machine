interface FieldProps {
  /** Also used to link the label to the input, so it must be unique. */
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** "text", "password", "number" - defaults to "text". */
  type?: string;
  /** Shown under the input when present. */
  error?: string;
  /** Forwarded to the input, e.g. min={1} for the minutes field. */
  min?: number;
}

/**
 * A label, an input and an optional error message - the shape repeated
 * for every text input on the order form.
 *
 * `htmlFor` and `id` must match: that pairing is what makes clicking the
 * label focus the input, and it is how assistive technology knows what
 * the input is called.
 *
 * aria-invalid and aria-describedby connect the error text to the input
 * it belongs to, so a screen reader announces the reason rather than
 * just "invalid".
 *
 * onChange hands back the string value rather than the event, so pages
 * never write event.target.value.
 */
function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  error,
  min,
}: FieldProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <br />
      <input
        id={id}
        type={type}
        value={value}
        min={min}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <div id={errorId} role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}

export default Field;
