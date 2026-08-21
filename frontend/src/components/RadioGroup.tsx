interface RadioOption<T extends string> {
  value: T;
  label: string;
}

interface RadioGroupProps<T extends string> {
  /** Used as the shared radio `name` and as the prefix for each input id. */
  id: string;
  /** Visible description of what is being chosen. */
  label: string;
  value: T;
  options: RadioOption<T>[];
  onChange: (value: T) => void;
}

/**
 * A set of mutually exclusive radio buttons.
 *
 * Used twice on the order page - Employee/Boss and Now/Later - which is
 * what earns it a component rather than repeated JSX.
 *
 * GENERIC over the option values. TypeScript infers T from the options
 * array, so passing values "employee" | "boss" makes onChange accept
 * exactly that union - which means `onChange={setTitle}` type-checks
 * directly, with no cast, even though setTitle demands an OrderTitle.
 *
 * Two details that are easy to get wrong:
 *
 *   - every input shares the same `name`. That attribute is what makes
 *     the browser treat them as one group, so selecting one clears the
 *     others. Give them different names and all of them can be checked
 *     at once.
 *
 *   - each input is paired with its <label>, so clicking the text
 *     selects the button. <fieldset> and <legend> group and describe the
 *     whole set, which is the standard markup for a choice like this.
 *
 * onChange hands back the chosen VALUE rather than the event, so callers
 * never touch event.target.
 */
function RadioGroup<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: RadioGroupProps<T>) {
  return (
    <fieldset>
      <legend>{label}</legend>

      {options.map((option) => {
        const optionId = `${id}-${option.value}`;

        return (
          <label key={option.value} htmlFor={optionId}>
            <input
              id={optionId}
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={() => {
                onChange(option.value);
              }}
            />
            {option.label}
          </label>
        );
      })}
    </fieldset>
  );
}

export default RadioGroup;
