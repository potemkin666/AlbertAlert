import Foundation

enum NetworkClientError: Error, LocalizedError {
    case invalidResponse
    case httpStatus(Int)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid network response."
        case .httpStatus(let status):
            return "HTTP \(status)"
        }
    }
}

struct NetworkClient {
    static let shared = NetworkClient()

    func request(
        _ request: URLRequest,
        retryCount: Int = 2,
        baseDelay: TimeInterval = 0.6
    ) async throws -> (Data, HTTPURLResponse) {
        var attempt = 0

        while true {
            do {
                let (data, response) = try await URLSession.shared.data(for: request)
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw NetworkClientError.invalidResponse
                }

                if (200...299).contains(httpResponse.statusCode) {
                    return (data, httpResponse)
                }

                if shouldRetry(statusCode: httpResponse.statusCode), attempt < retryCount {
                    attempt += 1
                    try await backoff(after: baseDelay, attempt: attempt)
                    continue
                }

                throw NetworkClientError.httpStatus(httpResponse.statusCode)
            } catch {
                if shouldRetry(error: error), attempt < retryCount {
                    attempt += 1
                    try await backoff(after: baseDelay, attempt: attempt)
                    continue
                }
                throw error
            }
        }
    }

    private func backoff(after baseDelay: TimeInterval, attempt: Int) async throws {
        let jitter = Double.random(in: 0...0.2)
        let delay = baseDelay * pow(2.0, Double(attempt - 1)) + jitter
        let nanos = UInt64(delay * 1_000_000_000)
        try await Task.sleep(nanoseconds: nanos)
    }

    private func shouldRetry(statusCode: Int) -> Bool {
        statusCode == 408 || statusCode == 429 || (500...599).contains(statusCode)
    }

    private func shouldRetry(error: Error) -> Bool {
        if let clientError = error as? NetworkClientError {
            switch clientError {
            case .httpStatus(let status):
                return shouldRetry(statusCode: status)
            case .invalidResponse:
                return true
            }
        }

        if let urlError = error as? URLError {
            switch urlError.code {
            case .timedOut, .cannotFindHost, .cannotConnectToHost, .networkConnectionLost, .notConnectedToInternet, .dnsLookupFailed:
                return true
            default:
                return false
            }
        }

        return false
    }
}
