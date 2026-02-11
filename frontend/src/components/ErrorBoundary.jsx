import React from "react";

/**
 * ErrorBoundary — catches unhandled JS errors in any descendant component
 * tree and shows a friendly fallback UI instead of a white screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // You could send this to a logging service in production
        console.error("[ErrorBoundary] Caught:", error, info);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-10 max-w-lg w-full shadow-sm">
                        <div className="text-5xl mb-4">⚠️</div>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-gray-600 mb-6">
                            An unexpected error occurred. Please try again or refresh the
                            page.
                        </p>
                        {this.state.error && (
                            <details className="text-left text-sm text-gray-500 mb-6 bg-gray-50 rounded-lg p-4">
                                <summary className="cursor-pointer font-medium text-gray-700">
                                    Error details
                                </summary>
                                <pre className="mt-2 whitespace-pre-wrap break-words">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                        <button
                            onClick={this.handleReset}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
