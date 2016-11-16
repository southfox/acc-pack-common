//
//  OTSDKWrapper.h
//
//  Copyright © 2016 Tokbox, Inc. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <OTAcceleratorPackUtil/OTAcceleratorSession.h>

typedef enum : NSUInteger {
    OTSDKWrapperMediaTypeAudio,
    OTSDKWrapperMediaTypeVideo
} OTSDKWrapperMediaType;

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
- (UIView *)captureAudioVideo;

- (NSError *)publishAudioVideo:(BOOL)published;

- (void)enablePublishingMedia:(OTSDKWrapperMediaType)mediaType
                      enabled:(BOOL)enabled;

- (void)switchCamera;

- (void)switchVideoViewScaleBehavior;

#pragma mark - subscirbers
- (void)newParticipantObserver:(void (^)(NSString *streamId))completion;

- (UIView *)addParticipantWithStreamId:(NSString *)streamId
                                 error:(NSError **)error;

- (NSError *)removeParticipantWithStreamId:(NSString *)streamId;

- (void)participantsLeaveObserver:(void (^)(NSString *streamId))completion;

- (void)enableParticipantWithStreamId:(NSString *)streamId
                                media:(OTSDKWrapperMediaType)mediaType
                              enabled:(BOOL)enabled;

- (void)switchParticipantVideoViewScaleBehaviorWithStreamId:(NSString *)streamId;

@end
