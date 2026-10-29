// Reframe AI original 02 without smoothing. Run from repository root:
// clang output/coordination/2026-10-29-art-asia-atk/normalize.c -framework CoreGraphics -framework ImageIO -framework CoreFoundation -o /private/tmp/art-atk2-normalize
// /private/tmp/art-atk2-normalize
#include <CoreGraphics/CoreGraphics.h>
#include <ImageIO/ImageIO.h>
#include <CoreFoundation/CoreFoundation.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
int main(void) {
 const char *input="output/coordination/2026-10-29-art-asia-atk/ai-original-02.png";
 CFURLRef url=CFURLCreateFromFileSystemRepresentation(NULL,(const UInt8*)input,strlen(input),false);
 CGImageSourceRef source=CGImageSourceCreateWithURL(url,NULL);
 CGImageRef image=CGImageSourceCreateImageAtIndex(source,0,NULL);
 int w=(int)CGImageGetWidth(image),h=(int)CGImageGetHeight(image);
 CGColorSpaceRef space=CGColorSpaceCreateDeviceRGB();
 unsigned char *pixels=calloc(w*h,4),*dst=calloc(512*512,4);
 CGContextRef ctx=CGBitmapContextCreate(pixels,w,h,8,w*4,space,kCGImageAlphaPremultipliedLast|kCGBitmapByteOrder32Big);
 CGContextDrawImage(ctx,CGRectMake(0,0,w,h),image);
 int l=w,t=h,r=0,b=0;
 for(int y=0;y<h;y++) for(int x=0;x<w;x++) {
  unsigned char *p=pixels+(y*w+x)*4;
  if(p[3]<128) memset(p,0,4);
  else {if(x<l)l=x;if(y<t)t=y;if(x+1>r)r=x+1;if(y+1>b)b=y+1;}
 }
 // The original character begins at y=60 (the fire reached y=0), feet at y=511.
 int height=452,width=(int)((double)(r-l)*height/(b-t)+0.5);
 for(int y=0;y<height;y++) for(int x=0;x<width;x++) {
  int sx=l+(int)((x+0.5)*(r-l)/width),sy=t+(int)((y+0.5)*(b-t)/height);
  memcpy(dst+((y+60)*512+x+48)*4,pixels+(sy*w+sx)*4,4);
 }
 CGContextRef out=CGBitmapContextCreate(dst,512,512,8,512*4,space,kCGImageAlphaPremultipliedLast|kCGBitmapByteOrder32Big);
 CGImageRef result=CGBitmapContextCreateImage(out);
 const char *path="img/Asia/hero-yama-asia-atk-v2.png";
 CFURLRef target=CFURLCreateFromFileSystemRepresentation(NULL,(const UInt8*)path,strlen(path),false);
 CGImageDestinationRef dest=CGImageDestinationCreateWithURL(target,CFSTR("public.png"),1,NULL);
 CGImageDestinationAddImage(dest,result,NULL);
 if(!CGImageDestinationFinalize(dest)) return 1;
 printf("Source: (%d,%d,%d,%d); destination: (48,60,%d,512)\n",l,t,r,b,48+width);
 return 0;
}
