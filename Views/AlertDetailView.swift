import SwiftUI

struct AlertDetailView: View {
    @EnvironmentObject private var viewModel: AlertFeedViewModel
    let alert: TerrorAlert

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.05, green: 0.06, blue: 0.10),
                        Color(red: 0.12, green: 0.14, blue: 0.17),
                        Color(red: 0.23, green: 0.12, blue: 0.10)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        VStack(alignment: .leading, spacing: 10) {
                            Text(alert.title)
                                .font(.system(size: 30, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)

                            Text("\(alert.location) | \(alert.verificationState.rawValue)")
                                .foregroundStyle(Color.white.opacity(0.72))
                        }

                        summaryPanel

                        detailPanel

                        if let urlString = alert.sourceURL ?? sourceURLString(for: alert), let sourceURL = URL(string: urlString) {
                            Link("Open source site", destination: sourceURL)
                                .font(.headline)
                                .padding(.horizontal, 18)
                                .padding(.vertical, 12)
                                .background(Color(red: 0.86, green: 0.63, blue: 0.22))
                                .foregroundStyle(.black)
                                .clipShape(Capsule())
                        }
                    }
                    .padding(18)
                }
            }
            .navigationTitle("Incident")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        viewModel.closeDetail()
                    }
                    .foregroundStyle(.white)
                }
            }
        }
    }

    private var summaryPanel: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("AI Summary")
                .font(.caption.weight(.bold))
                .foregroundStyle(Color.white.opacity(0.66))
                .textCase(.uppercase)

            switch viewModel.summaryState(for: alert) {
            case .idle, .loading:
                HStack(spacing: 12) {
                    ProgressView()
                        .tint(.white)
                    Text("Generating live summary...")
                        .foregroundStyle(Color.white.opacity(0.82))
                }
            case .loaded(let summary):
                Text(summary)
                    .foregroundStyle(Color.white.opacity(0.88))
                    .lineSpacing(4)
            case .failed(let message):
                Text(message)
                    .foregroundStyle(Color.white.opacity(0.82))
            }
        }
        .padding(18)
        .background(Color.white.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private var detailPanel: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Source Context")
                .font(.caption.weight(.bold))
                .foregroundStyle(Color.white.opacity(0.66))
                .textCase(.uppercase)

            Text(alert.summary)
                .foregroundStyle(Color.white.opacity(0.88))
                .lineSpacing(4)

            HStack {
                detailPill(title: alert.severity.displayName)
                detailPill(title: alert.region.rawValue)
                detailPill(title: alert.sourceLabel)
            }
        }
        .padding(18)
        .background(Color.white.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private func detailPill(title: String) -> some View {
        Text(title)
            .font(.caption.weight(.bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(Color.white.opacity(0.10))
            .clipShape(Capsule())
    }

    private func sourceURLString(for alert: TerrorAlert) -> String {
        if alert.region == .uk {
            return "https://www.gov.uk/search/news-and-communications?keywords=counter+terrorism"
        }

        return "https://www.europol.europa.eu/"
    }
}
