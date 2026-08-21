import type { ReactNode } from "react";
import Alert from "react-bootstrap/Alert";

interface MessageProps {
  type: "success" | "error";
  children: ReactNode;
}

/**
 * The success / error banner required by 4.2.2.
 *
 * Returns null when there is nothing to say, so a page can render it
 * unconditionally instead of wrapping it in its own condition.
 *
 * Bootstrap names its red variant "danger" rather than "error", so the
 * two vocabularies are mapped here - callers keep saying "error".
 *
 * role="alert" makes assistive technology announce the message when it
 * appears, which matters because it shows up away from wherever the user
 * was typing.
 */
function Message({ type, children }: MessageProps) {
  if (!children) {
    return null;
  }

  return (
    <Alert variant={type === "success" ? "success" : "danger"} role="alert" className="mt-3 mb-0">
      {children}
    </Alert>
  );
}

export default Message;
