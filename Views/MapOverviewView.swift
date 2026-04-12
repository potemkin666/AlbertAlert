import MapKit
import SwiftUI

struct MapOverviewView: View {
    @EnvironmentObject private var viewModel: AlertFeedViewModel

    private let europeRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 52.0, longitude: 5.0),
        span: MKCoordinateSpan(latitudeDelta: 18, longitudeDelta: 24)
    )

    var body: some View {
        NavigationStack {
            ZStack {
                Color(red: 0.05, green: 0.06, blue: 0.09)
                    .ignoresSafeArea()

                VStack(spacing: 14) {
                    Map(initialPosition: .region(europeRegion)) {
                        ForEach(viewModel.filteredAlerts) { alert in
                            if let coordinate = alert.coordinate {
                                Annotation(alert.title, coordinate: CLLocationCoordinate2D(latitude: coordinate.latitude, longitude: coordinate.longitude)) {
                                    VStack(spacing: 6) {
                                        Circle()
                                            .fill(alert.severity.color)
                                            .frame(width: 18, height: 18)
                                            .overlay(Circle().stroke(.white, lineWidth: 2))

                                        Text(alert.location)
                                            .font(.caption2.weight(.bold))
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(Color.black.opacity(0.72))
                                            .foregroundStyle(.white)
                                            .clipShape(Capsule())
                                    }
                                }
                            }
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                    .frame(height: 390)

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Map Posture")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(.white)

                        Text("Alerts are pinned to their current known or fallback operational region, making the UK-Europe picture easier to scan at a glance.")
                            .font(.callout)
                            .foregroundStyle(Color.white.opacity(0.75))
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(18)
                    .background(Color.white.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                }
                .padding(18)
            }
            .navigationTitle("Map")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
