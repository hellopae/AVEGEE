import AppKit
import CoreText

let width = 1600
let height = 165
let canvas = CGContext(
    data: nil, width: width, height: height, bitsPerComponent: 8,
    bytesPerRow: width * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
)!
canvas.setShouldAntialias(true)
let ink = NSColor(srgbRed: 244.0 / 255.0, green: 233.0 / 255.0, blue: 219.0 / 255.0, alpha: 1)
func draw(_ text: String, x: CGFloat, baseline: CGFloat, size: CGFloat) {
    let font = NSFont(name: "Thonburi", size: size) ?? NSFont.systemFont(ofSize: size)
    let phrase = NSAttributedString(string: text, attributes: [.font: font, .foregroundColor: ink])
    let line = CTLineCreateWithAttributedString(phrase)
    canvas.textPosition = CGPoint(x: x, y: CGFloat(height) - baseline)
    CTLineDraw(line, canvas)
}
draw("ลูซิเฟอร์", x: 44, baseline: 76, size: 46)
draw("แบบเดิม", x: 44, baseline: 150, size: 27)
draw("แบบเสนอ", x: 524, baseline: 150, size: 27)
draw("ภาพอ้างอิง", x: 1177, baseline: 150, size: 27)
let png = NSBitmapImageRep(cgImage: canvas.makeImage()!).representation(using: .png, properties: [:])!
FileHandle.standardOutput.write(png)
