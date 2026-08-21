import Form from "react-bootstrap/Form";

interface RadioOption<T extends string> {
  value: T;
  label: string;
}

interface RadioGroupProps<T extends string> {
  /** Used as the shared radio `name` and as the prefix for each input id. */
  id: string;
  label: string;
  value: T;
  options: RadioOption<T>[];
  onChange: (value: T) => void;
}

/**
 * A set of mutually exclusive radio buttons, laid out on one line.
 *
 * GENERIC over the option values. TypeScript infers T from the options
 * array, so passing "employee" | "boss" makes onChange accept exactly
 * that union - which is why `onChange={setTitle}` type-checks directly
 * against OrderTitle with no cast.
 *
 * Every input shares the same `name`. That attribute is what makes the
 * browser treat them as one group, so selecting one clears the others.
 *
 * Form.Check renders the input and its label together, and `inline`
 * places the options side by side instead of stacked.
 */
function RadioGroup<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: RadioGroupProps<T>) {
  return (
    <Form.Group className="mb-3">
      <Form.Label as="div">{label}</Form.Label>

      {options.map((option) => (
        <Form.Check
          key={option.value}
          inline
          type="radio"
          id={`${id}-${option.value}`}
          name={id}
          label={option.label}
          value={option.value}
          checked={value === option.value}
          onChange={() => {
            onChange(option.value);
          }}
        />
      ))}
    </Form.Group>
  );
}

export default RadioGroup;
