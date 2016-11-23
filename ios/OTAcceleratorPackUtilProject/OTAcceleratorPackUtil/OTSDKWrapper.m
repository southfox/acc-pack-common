//
//  OTSDKWrapper.m
//  OTAcceleratorPackUtilProject
//
//  Created by Xi Huang on 11/14/16.
//  Copyright © 2016 Tokbox, Inc. All rights reserved.
//

#import "OTSDKWrapper.h"
#import "OTAcceleratorSession.h"


@interface OTSDKWrapper() <OTSessionDelegate, OTPublisherKitDelegate, OTPublisherDelegate, OTSubscriberKitDelegate, OTSubscriberKitDelegate>

@property (nonatomic) NSString *name;
@property (weak, nonatomic) OTSession *session;
@property (nonatomic) OTPublisher *publisher; //for this first version, we will only have 1 pub.
@property (nonatomic) NSMutableDictionary *subscribers;
@property (nonatomic) NSMutableDictionary *streams;
@property (nonatomic) NSMutableDictionary *connections;

@property (nonatomic) NSUInteger internalConnectionCount;
@property (nonatomic) OTConnection * selfConnection;
@property (readonly, nonatomic) NSUInteger connectionsOlderThanMe;

@property (nonatomic) OTStreamStatus* internalLocalStreamStatus;

@property (strong, nonatomic) OTWrapperBlock handler;

@end

@implementation OTSDKWrapper

#pragma mark - session
- (instancetype)initWithDataSource:(id<OTSDKWrapperDataSource>)dataSource {
    
    return [self initWithName:[NSString stringWithFormat:@"%@-%@", [UIDevice currentDevice].systemName, [UIDevice currentDevice].name]
                   dataSource:dataSource];
}

- (instancetype)initWithName:(NSString *)name
                  dataSource:(id<OTSDKWrapperDataSource>)dataSource {
    if (!dataSource) {
        return nil;
    }
    
    if (self = [super init]) {
        _name = name;
        _dataSource = dataSource;
        _session = [_dataSource sessionOfSDKWrapper:self];
        _internalConnectionCount = 0;
        _connectionsOlderThanMe = 0;
        _subscribers = [[NSMutableDictionary alloc] init];
        _streams = [[NSMutableDictionary alloc] init];
        _connections = [[NSMutableDictionary alloc] init];
    }
    return self;
}

- (NSError *)broadcastSignalWithType:(NSString *)type {
    
}

- (NSError *)broadcastSignalWithType:(NSString *)type
                                data:(id)string {
    
}

- (void)connectWithHandler:(OTWrapperBlock)handler {
    if (!handler) return;
    
    self.handler = handler;
    NSError *error = [self connect];
    if (error) {
        self.handler(OTWrapperDidFail, nil, error);
    }
}

- (OTError*) connect {
    
    OTError *error = nil;
   // [_session connectWithToken:token error:&error]; //TODO get token ?
    
    return error;
}

- (void)disconnect {
    OTError *error = nil;
    
    //force unpublish
    if (_publisher) {
        [_publisher.view removeFromSuperview];
        [_session unpublish:_publisher error:&error];
        
        if (error) {
            self.handler(OTWrapperDidFail, _publisher.stream.streamId, error);
        }
        else {
            self.handler(OTWrapperDidStopPublishing, _publisher.stream.streamId, error);
        }
        _publisher = nil;
    }
    
    //force unsubscriber
    if ([_subscribers count] != 0) {
        for(OTSubscriber* sub in _subscribers) {
            [sub.view removeFromSuperview];
            [_session unsubscribe:sub error:&error];
            
            if (error) {
                self.handler(OTWrapperDidFail, sub.stream.streamId, error);
            }
            else {
                self.handler(OTWrapperDidLeaveRemote, sub.stream.streamId, error);
            }
        }
        [_subscribers removeAllObjects];
    }
    
    //disconnect
    [_session disconnect:&error];
    
    if (error) {
        self.handler(OTWrapperDidFail, nil, error);
    }
    else {
        self.handler(OTWrapperDidDisconnect, nil, error);
    }
    
    _internalConnectionCount = 0;
    _selfConnection = nil;
    [_connections removeAllObjects];
}

#pragma mark - connection
- (NSString *)selfConnectionId {
    return _selfConnection.connectionId;
}

- (NSUInteger)connectionCount {
    return _internalConnectionCount;
}

- (BOOL)isFirstConnection {
    if ( _connectionsOlderThanMe > 0 ) return false;
    else {
        return true;
    }
}

- (NSTimeInterval)intervalWithConnectionId:(NSString *)connectionId {
    //TODO
    OTConnection * connection = [_connections valueForKey:connectionId];
    
}

- (UIView *)captureLocalMedia {
    
}

- (NSError *)startPublishingLocalMedia {
    OTError *error = nil;
    if (_publisher){
        //create a new publisher
        _publisher = [[OTPublisher alloc] initWithDelegate:self name:self.name];
        
        //start publishing
        [self.session publish:_publisher error:&error];
        
        if (error) {
            self.handler(OTWrapperDidFail, nil, error);
        }
    }
    return error;
}

- (NSError *)stopPublishingMedia {
    OTError *error = nil;
    if ( _publisher ) {
        //we suppose we have only a publisher, what happens when we have the screensharing pub too? boolean to indicate it?
        [_publisher.view removeFromSuperview];
        [_session unpublish:_publisher error:&error];
        
        if (error) {
            self.handler(OTWrapperDidFail, nil, error);
        }
        _publisher = nil;
    }
    return error;
}

- (void)enableLocalMedia:(OTSDKWrapperMediaType)mediaType
                 enabled:(BOOL)enabled {
    if ( _publisher ){
        if ( mediaType == OTSDKWrapperMediaTypeAudio ){
            _publisher.publishAudio = enabled;
        }
        else {
            if ( mediaType == OTSDKWrapperMediaTypeVideo ){
                _publisher.publishVideo = enabled;
            }
        }
    }
}

- (BOOL)isLocalMediaEnabled:(OTSDKWrapperMediaType)mediaType {
    if ( _publisher ) {
        if ( mediaType == OTSDKWrapperMediaTypeAudio ){
            return _publisher.publishAudio;
        }
        else {
            if ( mediaType == OTSDKWrapperMediaTypeVideo ){
                return _publisher.publishVideo;
            }
        }
    }
    return false;
}

- (void)switchCamera {
    //TODO
}

- (void)switchVideoViewScaleBehavior {
    //TODO
}

- (UIView *)addRemoteWithStreamId:(NSString *)streamId
                            error:(NSError **)error {
    UIView *view = nil;
    
    //check if the remote exists
    if ( !_subscribers[streamId] ){
        NSError *subscriberError = nil;
        
        OTStream * stream = [_streams valueForKey:streamId];
        
        OTSubscriber *subscriber = [[OTSubscriber alloc] initWithStream:stream delegate:self];
        [_session subscribe:subscriber error:&subscriberError];
        
        if (subscriberError){
            self.handler(OTWrapperDidFail, nil, subscriberError);
        }
        
        [_subscribers setObject:subscriber forKey:streamId];
        
        view = subscriber.view; //to-review
    }
    
    return view;
}

- (NSError *)removeRemoteWithStreamId:(NSString *)streamId {
    NSError *unsubscribeError = nil;
    
    if ( _subscribers[streamId] ){
        
        OTSubscriber *subscriber = [_subscribers valueForKey:streamId];
        
        [subscriber.view removeFromSuperview];
        
        [self.session unsubscribe:subscriber error:&unsubscribeError];
        if (unsubscribeError) {
            NSLog(@"%@", unsubscribeError);
            self.handler(OTWrapperDidFail, nil, unsubscribeError);
        }
        
        [_subscribers removeObjectForKey:streamId];
    }
    
    return unsubscribeError;
}

- (void)enableReceivedMediaWithStreamId:(NSString *)streamId
                                  media:(OTSDKWrapperMediaType)mediaType
                                enabled:(BOOL)enabled {
    OTSubscriber *subscriber = [_subscribers valueForKey:streamId];
    if ( subscriber ){
        if ( mediaType == OTSDKWrapperMediaTypeAudio ){
            subscriber.subscribeToAudio = enabled;
        }
        else {
            if ( mediaType == OTSDKWrapperMediaTypeVideo ){
                subscriber.subscribeToVideo = enabled;
            }
        }
    }
}

- (BOOL)isReceivedMediaEnabledWithStreamId:(NSString *)streamId
                                     media:(OTSDKWrapperMediaType)mediaType {
     OTSubscriber *subscriber = [_subscribers valueForKey:streamId];
    
    if ( mediaType == OTSDKWrapperMediaTypeAudio ){
        return subscriber.subscribeToAudio;
    }
    else {
        if ( mediaType == OTSDKWrapperMediaTypeVideo ){
            return subscriber.subscribeToVideo;
        }
    }
}

- (void)switchRemoteVideoViewScaleBehaviorWithStreamId:(NSString *)streamId {
        //TODO
}

#pragma mark - Private Methods
-(void) compareConnectionTimeWithConnection: (OTConnection *)connection {
    NSComparisonResult result = [connection.creationTime compare:_selfConnection.creationTime];
    
    if(result==NSOrderedAscending){
        _connectionsOlderThanMe --;
    }
    else {
        if(result==NSOrderedDescending){
            _connectionsOlderThanMe ++;
        }
        else
            NSLog(@"Both dates are same");
    }
}


#pragma mark - OTSessionDelegate
-(void)sessionDidConnect:(OTSession*)session {
    if ( self.handler ){
        self.handler(OTWrapperDidConnect, nil, nil);
    }
    _selfConnection = session.connection;
}

- (void)sessionDidDisconnect:(OTSession *)session {
    if ( self.handler ){
        self.handler(OTWrapperDidDisconnect, nil, nil);
    }
}

- (void)  session:(OTSession*) session
connectionCreated:(OTConnection*) connection {
    _internalConnectionCount++;
    
    [_connections setObject:connection forKey:connection.connectionId];
    
    //check creationtime of the connections
    [self compareConnectionTimeWithConnection: connection];
   
}

- (void)session:(OTSession*) session
connectionDestroyed:(OTConnection*) connection {
    _internalConnectionCount--;
    
    [_connections removeObjectForKey:connection.connectionId];
    
    //check creationtime of the connections
    [self compareConnectionTimeWithConnection: connection];
}

- (void)session:(OTSession *)session streamCreated:(OTStream *)stream {
    if( !_streams[stream.streamId]){
        [_streams setObject:stream forKey:stream.streamId];
    }
    
    //TODO CALLBACK TO INDICATE the new streamID --> observer?
    
    //TODO SUBSCRIBE AUTOMATICALLY
}

- (void)session:(OTSession *)session streamDestroyed:(OTStream *)stream {
    if( _streams[stream.streamId]){
        [_streams removeObjectForKey:stream.streamId];
    }
    
    if (_subscribers[stream.streamId]){
        [_subscribers removeObjectForKey:stream.streamId];
        //remote left the session
        if (self.handler){
            self.handler(OTWrapperDidLeaveRemote, stream.streamId, nil);
        }
    }
}

- (void)session:(OTSession *)session didFailWithError:(OTError *)error {
    if ( self.handler ){
        self.handler(OTWrapperDidFail, nil, nil);
    }
}

- (void)sessionDidBeginReconnecting:(OTSession *)session {
    if ( self.handler ){
        self.handler(OTWrapperDidBeginReconnecting, nil,  nil);
    }
}

- (void)sessionDidReconnect:(OTSession *)session {
    if ( self.handler ){
        self.handler(OTWrapperDidReconnect, nil, nil);
    }
}

#pragma mark - OTPublisherDelegate
- (void)publisher:(OTPublisherKit *)publisher didFailWithError:(OTError *)error {
    if ( self.handler ){
        self.handler(OTWrapperDidFail, publisher.stream.streamId, nil);
    }
}

- (void)publisher:(OTPublisherKit*)publisher streamCreated:(OTStream*)stream {
    if ( self.handler ){
        self.handler(OTWrapperDidStartPublishing, publisher.stream.streamId, nil);
    }
}

- (void)publisher:(OTPublisherKit*)publisher streamDestroyed:(OTStream*)stream {
    if ( self.handler ){
        self.handler(OTWrapperDidStopPublishing, publisher.stream.streamId, nil);
    }
}

#pragma mark - OTSubscriberKitDelegate
-(void) subscriberDidConnectToStream:(OTSubscriberKit*)subscriber {
    if (self.handler){
        self.handler(OTWrapperDidJoinRemote, subscriber.stream.streamId, nil);
    }
}

-(void)subscriberVideoDisabled:(OTSubscriber *)subscriber reason:(OTSubscriberVideoEventReason)reason {
    
    
}

- (void)subscriberVideoEnabled:(OTSubscriberKit *)subscriber reason:(OTSubscriberVideoEventReason)reason {
    
    
}

-(void)subscriberVideoDisableWarning:(OTSubscriber *)subscriber reason:(OTSubscriberVideoEventReason)reason {
    
}

-(void)subscriberVideoDisableWarningLifted:(OTSubscriberKit *)subscriber reason:(OTSubscriberVideoEventReason)reason {
    
}

- (void)subscriber:(OTSubscriberKit *)subscriber didFailWithError:(OTError *)error {
    if ( self.handler ){
        self.handler(OTWrapperDidFail, subscriber.stream.streamId, nil);
    }
}

@end
