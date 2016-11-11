//
//  OTPublisherWrapper.h
//
//  Copyright © 2016 Tokbox, Inc. All rights reserved.
//

#import <OpenTok/OpenTok.h>

@interface OTPublisherWrapper : OTPublisher

/**
 *  Switch between AVCaptureDevicePositionBack and AVCaptureDevicePositionFront
 */
- (void)switchCamera;

/**
 *  Switch between OTVideoViewScaleBehaviorFit and OTVideoViewScaleBehaviorFill
 */
- (void)switchVideoViewScaleBehavior;

/**
 *  Size of the stream
 */
- (CGSize)actualVideoSize;

@end
