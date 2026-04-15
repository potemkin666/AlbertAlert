import SwiftUI

struct BulldogBadgeView: View {
    @State private var showEasterEgg = false

    var body: some View {
        HStack(spacing: 14) {
            Image("bulldog")
                .resizable()
                .scaledToFill()
                .frame(width: 72, height: 72)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.white.opacity(0.25), lineWidth: 1)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text("Albert watches")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)

                if showEasterEgg {
                    Text("I love you.")
                        .font(.caption)
                        .foregroundStyle(Color.white.opacity(0.72))
                }
            }
            
            Spacer(minLength: 0)
        }
        .padding(14)
        .background(Color.white.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .onTapGesture(count: 2) {
            withAnimation(.easeInOut(duration: 0.2)) {
                showEasterEgg.toggle()
            }
        }
    }
}
