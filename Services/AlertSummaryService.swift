import Foundation

protocol AlertSummaryService {
    func generateSummary(for alert: TerrorAlert) async throws -> String
}
