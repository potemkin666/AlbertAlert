import SwiftUI

struct RootTabView: View {
    @EnvironmentObject private var viewModel: AlertFeedViewModel

    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Live", systemImage: "bolt.badge.clock")
                }

            MapOverviewView()
                .tabItem {
                    Label("Map", systemImage: "map")
                }

            WatchlistScreen()
                .tabItem {
                    Label("Watchlists", systemImage: "star")
                }

            AnalystNotesView()
                .tabItem {
                    Label("Notes", systemImage: "note.text")
                }
        }
        .tint(Color(red: 0.88, green: 0.62, blue: 0.20))
        .sheet(item: $viewModel.selectedAlert) { alert in
            AlertDetailView(alert: alert)
                .environmentObject(viewModel)
        }
    }
}
