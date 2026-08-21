import Form from "react-bootstrap/Form";

interface FieldProps {
  /** Bootstrap wires the label and input together from this. */
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** "text", "password", "number" - defaults to "text". */
  type?: string;
  /** Shown under the input when present, and marks it invalid. */
  error?: string;
  /** Forwarded to the input, e.g. min={1} for the minutes field. */
  min?: number;
}

/**
 * A labelled input with its validation message.
 *
 * `controlId` on the Form.Group generates the id and the label's htmlFor
 * together, so they cannot drift apart - that pairing is what makes
 * clicking the label focus the input.
 *
 * `isInvalid` turns the border red and is what reveals the matching
 * Form.Control.Feedback. Bootstrap hides the feedback element until the
 * control is marked invalid, so it can be rendered unconditionally.
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
  return (
    <Form.Group className="mb-3" controlId={id}>
      <Form.Label>{label}</Form.Label>

      <Form.Control
        type={type}
        value={value}
        min={min}
        isInvalid={Boolean(error)}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />

      <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
    </Form.Group>
  );
}

export default Field;
