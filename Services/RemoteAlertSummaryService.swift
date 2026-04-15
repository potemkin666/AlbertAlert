import Foundation

struct RemoteAlertSummaryService: AlertSummaryService {
    let endpoint: URL

    func generateSummary(for alert: TerrorAlert) async throws -> String {
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(
            SummaryRequest(
                title: alert.title,
                location: alert.location,
                region: alert.region.rawValue,
                severity: alert.severity.displayName,
                verificationState: alert.verificationState.rawValue,
                sourceLabel: alert.sourceLabel,
                summary: alert.summary
            )
        )

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(SummaryResponse.self, from: data)
        return response.summary
    }
}

private struct SummaryRequest: Codable {
    let title: String
    let location: String
    let region: String
    let severity: String
    let verificationState: String
    let sourceLabel: String
    let summary: String
}

private struct SummaryResponse: Codable {
    let summary: String
}
