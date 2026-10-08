// MIT, DAM AVFoundation decoder. Fixed local file and optional PNG destination.
import Foundation
import AVFoundation
import AppKit
struct Metadata: Encodable {
    let `protocol` = 1
    let durationTicks: Int64
    let width: Int
    let height: Int
    let fpsNumerator: Int
    let fpsDenominator: Int
    let actualTicks: Int64
}
func decode() throws {
    let args = CommandLine.arguments
    guard args.count == 2 || args.count == 4 else { throw NSError(domain: "input", code: 1) }
    let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
    guard let track = asset.tracks(withMediaType: .video).first else { throw NSError(domain: "video", code: 1) }
    let duration = CMTimeConvertScale(asset.duration, timescale: 10000000, method: .roundAwayFromZero).value
    let size = track.naturalSize, transform = track.preferredTransform
    guard let rawFormat = track.formatDescriptions.first else { throw NSError(domain: "format", code: 1) }
    let format = rawFormat as! CMFormatDescription
    guard duration > 0, duration <= 3600 * 10000000, size.width >= 1, size.height >= 1,
          size.width <= 3840, size.height <= 2160, transform.a == 1, transform.b == 0,
          transform.c == 0, transform.d == 1, track.nominalFrameRate > 0,
          CMFormatDescriptionGetMediaSubType(format) == kCMVideoCodecType_H264 else { throw NSError(domain: "unsupported", code: 1) }
    let requested = args.count == 4 ? Int64(args[3]) : 0
    guard let requested, requested >= 0, requested < duration else { throw NSError(domain: "time", code: 1) }
    var actual = requested
    if args.count == 4 {
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = false
        generator.requestedTimeToleranceBefore = .zero
        generator.requestedTimeToleranceAfter = CMTime(value: 1, timescale: 1)
        var actualTime = CMTime.zero
        let cg = try generator.copyCGImage(at: CMTime(value: requested, timescale: 10000000), actualTime: &actualTime)
        actual = CMTimeConvertScale(actualTime, timescale: 10000000, method: .roundAwayFromZero).value
        guard let png = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:]) else { throw NSError(domain: "png", code: 1) }
        try png.write(to: URL(fileURLWithPath: args[2]), options: .withoutOverwriting)
    }
    let data = try JSONEncoder().encode(Metadata(durationTicks: duration, width: Int(size.width), height: Int(size.height),
        fpsNumerator: Int((Double(track.nominalFrameRate) * 1000).rounded()), fpsDenominator: 1000, actualTicks: actual))
    FileHandle.standardOutput.write(data); FileHandle.standardOutput.write(Data([10]))
}
do { try decode() } catch { exit(1) }
