//
//  OTStreamStatus.h
//  OTAcceleratorPackUtilProject
//
//  Created by mserrano on 23/11/2016.
//  Copyright © 2016 Tokbox, Inc. All rights reserved.
//

#import <UIKit/UIKit.h>
#import <OpenTok/OpenTok.h>

@interface OTStreamStatus : NSObject

@property(readonly, nonatomic) BOOL hasAudio;

@property(readonly, nonatomic) BOOL hasVideo;

@property(readonly, nonatomic) CGSize videoDimensions;

@property(readonly, nonatomic) OTStreamVideoType videoType;

@property(readonly, nonatomic) UIView* view;

@property(readonly, nonatomic) BOOL hasAudioContainerStatus; //Status of the container of the stream (publisher/subscriber).

@property(readonly, nonatomic) BOOL hasVideoContainerStatus; //Status of the container of the stream (publisher/subscriber).

- (instancetype)initWithStreamView: (UIView *)view
                     containerAudo: (BOOL) containerAudio
                    containerVideo: (BOOL) containerVideo
                          hasAudio: (BOOL) hasAudio
                          hasVideo: (BOOL) hasVideo
                              type: (OTStreamVideoType) type
                              size: (CGSize) dimensions;
@end
