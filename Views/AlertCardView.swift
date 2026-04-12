import SwiftUI

struct AlertCardView: View {
    let alert: TerrorAlert
    let isWatched: Bool
    let onToggleWatchlist: () -> Void
    let onOpenDetail: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Button(action: onOpenDetail) {
                        Text(alert.title)
                            .font(.system(size: 20, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.leading)
                    }
                    .buttonStyle(.plain)

                    Text(alert.location)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Color.white.opacity(0.72))
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 10) {
                    Button(action: onToggleWatchlist) {
                        Image(systemName: isWatched ? "star.fill" : "star")
                            .font(.headline)
                            .foregroundStyle(isWatched ? Color.yellow : Color.white.opacity(0.78))
                            .padding(10)
                            .background(Color.white.opacity(0.08))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)

                    Text(alert.severity.displayName)
                        .font(.caption.weight(.bold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(alert.severity.color.opacity(0.24))
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
            }

            Text(alert.summary)
                .font(.callout)
                .foregroundStyle(Color.white.opacity(0.88))
                .lineSpacing(3)

            HStack {
                Label(alert.verificationState.rawValue, systemImage: "checkmark.shield")
                Spacer()
                Label(alert.sourceLabel, systemImage: "dot.radiowaves.left.and.right")
            }
            .font(.caption.weight(.medium))
            .foregroundStyle(Color.white.opacity(0.68))

            HStack {
                Text(alert.region.rawValue)
                Spacer()
                Text(alert.reportedAt.formatted(date: .omitted, time: .shortened))
            }
            .font(.caption2.weight(.bold))
            .foregroundStyle(Color.white.opacity(0.56))
            .textCase(.uppercase)
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color(red: 0.08, green: 0.11, blue: 0.15))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(alert.severity.color.opacity(0.35), lineWidth: 1)
        )
    }
}
