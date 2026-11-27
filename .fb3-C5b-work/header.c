#include <CoreText/CoreText.h>
#include <ImageIO/ImageIO.h>
#include <stdio.h>

int main(void) {
    CGColorSpaceRef rgb = CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
    CGContextRef ctx = CGBitmapContextCreate(NULL, 1080, 68, 8, 1080 * 4, rgb, kCGImageAlphaPremultipliedLast);
    CGContextSetRGBFillColor(ctx, 37./255, 35./255, 42./255, 1);
    CGContextFillRect(ctx, CGRectMake(0, 0, 1080, 68));
    CGFloat ivory[] = {1, 242./255, 220./255, 1};
    CGColorRef ink = CGColorCreate(rgb, ivory);
    CTFontRef font = CTFontCreateWithName(CFSTR("Thonburi"), 30, NULL);
    const void *keys[] = {kCTFontAttributeName, kCTForegroundColorAttributeName};
    const void *values[] = {font, ink};
    CFDictionaryRef attrs = CFDictionaryCreate(NULL, keys, values, 2, &kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);
    CFStringRef headings[] = {CFSTR("ภาพเดิม"), CFSTR("ภาพใหม่")};
    for (int i = 0; i < 2; i++) {
        CFAttributedStringRef s = CFAttributedStringCreate(NULL, headings[i], attrs);
        CTLineRef text = CTLineCreateWithAttributedString(s);
        CGContextSetTextPosition(ctx, 18 + 528*i, 22);
        CTLineDraw(text, ctx);
        CFRelease(text);
        CFRelease(s);
    }
    CGImageRef image = CGBitmapContextCreateImage(ctx);
    CFURLRef path = CFURLCreateWithFileSystemPath(NULL, CFSTR(".fb3-C5b-work/header.png"), kCFURLPOSIXPathStyle, false);
    CGImageDestinationRef dest = CGImageDestinationCreateWithURL(path, CFSTR("public.png"), 1, NULL);
    CGImageDestinationAddImage(dest, image, NULL);
    return CGImageDestinationFinalize(dest) ? 0 : 1;
}
