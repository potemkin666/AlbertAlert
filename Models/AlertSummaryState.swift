import Foundation

enum AlertSummaryState: Equatable {
    case idle
    case loading
    case loaded(String)
    case failed(String)
}
