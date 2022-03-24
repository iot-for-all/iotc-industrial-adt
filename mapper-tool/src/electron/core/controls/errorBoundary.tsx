import * as React from "react";

interface ErrorBoundaryProperties {
  children?: React.ReactNode;

  /**
   * A custom render function to display the service error.
   * If not specified, defaults to `ErrorView`.
   */
  render?: (err: Error) => React.ReactNode;

  /**
   * Callback to do something when the error is caught.
   */
  onDidCatch?: (err: Error) => void;
}

interface State {
  error?: Error;
  location?: string; // location href where the error occurs
}

/**
 * Used to catch errors in a child component tree, log them, and display a fallback UI.
 * https://reactjs.org/docs/error-boundaries.html
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProperties,
  State
> {
  constructor(props) {
    super(props);
    this.state = { error: undefined };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.log(error, errorInfo);
  }

  render() {
    if (this.state.error) {
      // You can render any custom fallback UI
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}
