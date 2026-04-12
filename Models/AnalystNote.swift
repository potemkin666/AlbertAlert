import Foundation

struct AnalystNote: Identifiable, Codable, Hashable {
    let id: UUID
    let title: String
    let body: String
    let relatedAlertID: String?
    let createdAt: Date
    let author: String
}
