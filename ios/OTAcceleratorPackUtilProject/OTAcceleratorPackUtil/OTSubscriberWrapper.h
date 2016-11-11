//
//  OTSubscriberWrapper.h
//  OTAcceleratorPackUtilProject
//
//  Created by Xi Huang on 11/11/16.
//  Copyright © 2016 Tokbox, Inc. All rights reserved.
//

#import <OpenTok/OpenTok.h>

@interface OTSubscriberWrapper : OTSubscriber

/**
 *  Switch between OTVideoViewScaleBehaviorFit and OTVideoViewScaleBehaviorFill
 */
- (void)switchVideoViewScaleBehavior;

/**
 *  Size of the stream
 */
- (CGSize)actualVideoSize;

/**
 *  Audio availability of the subscribing stream.
 */
@property (readonly, nonatomic) BOOL hasRemoteAudio;

/**
 *  Video availability of the subscribing stream.
 */
@property (readonly, nonatomic) BOOL hasRemoteVideo;

@end
