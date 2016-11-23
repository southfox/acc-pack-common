//
//  OTStreamStatus.h
//  OTAcceleratorPackUtilProject
//
//  Created by mserrano on 23/11/2016.
//  Copyright © 2016 Tokbox, Inc. All rights reserved.
//

#import <OpenTok/OpenTok.h>

@interface OTStreamStatus : NSObject

@property(readonly) BOOL hasAudio;

@property(readonly) BOOL hasVideo;

@property (readonly) Size videoDimensions;

@property (readonly) OTStreamVideoType videoType;

@property (readonly) UIView* view;

@property (readonly) BOOL hasAudioContainerStatus; //Status of the container of the stream (publisher/subscriber).

@property (readonly) BOOL hasVideoContainerStatus; //Status of the container of the stream (publisher/subscriber).

@end
