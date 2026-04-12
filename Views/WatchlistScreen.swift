import SwiftUI

struct WatchlistScreen: View {
    @EnvironmentObject private var viewModel: AlertFeedViewModel

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.08, green: 0.06, blue: 0.09),
                        Color(red: 0.16, green: 0.13, blue: 0.09)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        Text("Watchlists")
                            .font(.system(size: 32, weight: .heavy, design: .rounded))
                            .foregroundStyle(.white)

                        ForEach(viewModel.watchlists) { watchlist in
                            VStack(alignment: .leading, spacing: 10) {
                                HStack {
                                    Text(watchlist.title)
                                        .font(.headline)
                                        .foregroundStyle(.white)

                                    Spacer()

                                    Text(watchlist.region.rawValue)
                                        .font(.caption.weight(.bold))
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(Color.white.opacity(0.10))
                                        .clipShape(Capsule())
                                        .foregroundStyle(.white)
                                }

                                Text(watchlist.focusArea)
                                    .foregroundStyle(Color.white.opacity(0.78))

                                Text(watchlist.keywords.joined(separator: " | "))
                                    .font(.caption)
                                    .foregroundStyle(Color.white.opacity(0.58))
                            }
                            .padding(18)
                            .background(Color.white.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                        }

                        Text("Tracked Incidents")
                            .font(.title3.weight(.bold))
                            .foregroundStyle(.white)

                        if viewModel.watchedAlerts.isEmpty {
                            Text("Track incidents from F.O.C to keep them pinned here.")
                                .foregroundStyle(Color.white.opacity(0.64))
                        } else {
                            ForEach(viewModel.watchedAlerts) { alert in
                                AlertCardView(
                                    alert: alert,
                                    isWatched: true,
                                    onToggleWatchlist: {
                                        viewModel.toggleWatchlist(for: alert)
                                    },
                                    onOpenDetail: {
                                        Task {
                                            await viewModel.openDetail(for: alert)
                                        }
                                    }
                                )
                            }
                        }
                    }
                    .padding(18)
                }
            }
        }
    }
}

