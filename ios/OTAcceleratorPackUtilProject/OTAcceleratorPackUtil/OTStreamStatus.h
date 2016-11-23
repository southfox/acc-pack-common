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

- (instancetype)initWithStreamView: (UIView *)view
                     containerAudo: (BOOL) containerAudio
                    containerVideo: (BOOL) containerVideo
                          hasAudio: (BOOL) hasAudio
                          hasVideo: (BOOL) hasVideo
                              type: (OTStreamVideoType) type
                              size: (Size) dimensions;
@end
