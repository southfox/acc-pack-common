//
//  OTSDKWrapper.h
//
//  Copyright © 2016 Tokbox, Inc. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <OTAcceleratorPackUtil/OTAcceleratorSession.h>
#import <OTAcceleratorPackUtil/OTStreamStatus.h>

typedef enum: NSUInteger {
    OTWrapperDidConnect = 0,
    OTWrapperDidDisconnect,
    OTWrapperDidFail,
    OTWrapperDidStartPublishing,
    OTWrapperDidStopPublishing,
    OTWrapperDidStartCaptureMedia,
    OTWrapperDidStopCaptureMedia,
    OTWrapperDidJoinRemote,
    OTWrapperDidLeaveRemote,
    OTReceivedVideoDisabledByLocal,
    OTReceivedVideoEnabledByLocal,
    OTRemoteVideoDisabledByRemote,
    OTRemoteVideoEnabledByRemote,
    OTRemoteVideoDisabledByBadQuality,
    OTRemoteVideoEnabledByGoodQuality,
    OTRemoteVideoDisableWarning,
    OTRemoteVideoDisableWarningLifted,
    OTCameraChanged,
    OTWrapperDidBeginReconnecting,
    OTWrapperDidReconnect,
} OTWrapperSignal;

typedef enum : NSUInteger {
    OTSDKWrapperMediaTypeAudio,
    OTSDKWrapperMediaTypeVideo
} OTSDKWrapperMediaType;

typedef void (^OTWrapperBlock)(OTWrapperSignal signal, NSString *streamId, NSError *error);

@class OTSDKWrapper;
@protocol OTSDKWrapperDataSource <NSObject>

- (OTSession *)sessionOfSDKWrapper:(OTSDKWrapper *)wrapper;

@end

@interface OTSDKWrapper : NSObject

#pragma mark - session
/**
 *  The object that acts as the data source of the SDK wrapper.
 *
 *  The delegate must adopt the OTSDKWrapperDataSource protocol. The delegate is not retained.
 */
@property (readonly, weak, nonatomic) id<OTSDKWrapperDataSource> dataSource;

@property (readonly, nonatomic) NSString *name;

- (instancetype)initWithDataSource:(id<OTSDKWrapperDataSource>)dataSource;

- (instancetype)initWithName:(NSString *)name
                  dataSource:(id<OTSDKWrapperDataSource>)dataSource;

- (NSError *)broadcastSignalWithType:(NSString *)type;

- (NSError *)broadcastSignalWithType:(NSString *)type
                                data:(id)string;

- (void)connectWithHandler:(OTWrapperBlock)handler;

/**
 *  Force un-publish/un-subscribe, disconnect from session and clean everything
 */
- (void)disconnect;

#pragma mark - connection
@property (readonly, nonatomic) NSString *selfConnectionId;

@property (readonly, nonatomic) NSUInteger connectionCount;

@property (readonly, nonatomic) BOOL isFirstConnection;

- (NSTimeInterval)intervalWithConnectionId:(NSString *)connectionId;

#pragma mark - publisher

- (UIView *)captureLocalMedia;

- (UIView *)startPublishingLocalMedia;

// if we merge screen sharing accelerator pack, this can be the API.
//- (NSError *)publishWithView:(UIView *)view;

- (NSError *)stopPublishingLocalMedia;

- (void)enableLocalMedia:(OTSDKWrapperMediaType)mediaType
                 enabled:(BOOL)enabled;

- (BOOL)isLocalMediaEnabled:(OTSDKWrapperMediaType)mediaType;

- (void)switchCamera;

- (void)switchVideoViewScaleBehavior;

- (OTStreamStatus *) getLocalStreamStatus;

#pragma mark - subscirbers

- (UIView *)addRemoteWithStreamId:(NSString *)streamId
                            error:(NSError **)error;

- (NSError *)removeRemoteWithStreamId:(NSString *)streamId;

- (void)enableReceivedMediaWithStreamId:(NSString *)streamId
                           media:(OTSDKWrapperMediaType)mediaType
                         enabled:(BOOL)enabled;

- (BOOL)isReceivedMediaEnabledWithStreamId:(NSString *)streamId
                              media:(OTSDKWrapperMediaType)mediaType;

- (void)switchRemoteVideoViewScaleBehaviorWithStreamId:(NSString *)streamId;

- (OTStreamStatus *) getRemoteStreamStatusWithStreamId:(NSString *) streamId;

@end
