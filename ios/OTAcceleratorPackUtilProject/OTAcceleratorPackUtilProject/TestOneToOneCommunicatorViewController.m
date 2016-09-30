//
//  TestOneToOneCommunicatorViewController.m
//  OTAcceleratorPackUtilProject
//
//  Created by Xi Huang on 7/11/16.
//  Copyright © 2016 Tokbox, Inc. All rights reserved.
//

#import "TestOneToOneCommunicatorViewController.h"
#import <OTAcceleratorPackUtil/OTAcceleratorPackUtil.h>

@interface TestOneToOneCommunicatorViewController () <OTOneToOneCommunicatorDelegate>
@property (weak, nonatomic) IBOutlet UIView *subscriberView;
@property (weak, nonatomic) IBOutlet UIView *publisherView;
@property (nonatomic) OTOneToOneCommunicator *communicator;
@end

@implementation TestOneToOneCommunicatorViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    
    self.communicator = [OTOneToOneCommunicator sharedInstance];
    self.communicator.delegate = self;
    [self.communicator connect];
    
    UIBarButtonItem *rightBarButtonItem = [[UIBarButtonItem alloc] initWithTitle:@"EndCall" style:UIBarButtonItemStylePlain target:self action:@selector(endCallButtonPressed)];
    self.navigationItem.rightBarButtonItem = rightBarButtonItem;
}

- (void)oneToOneCommunicationWithSignal:(OTOneToOneCommunicationSignal)signal
                                  error:(NSError *)error {
    
    if (signal == OTSessionDidConnect) {
        self.communicator.publisherView.frame = self.publisherView.bounds;
        [self.publisherView addSubview:self.communicator.publisherView];
    }
    else if (signal == OTSubscriberDidConnect) {
        self.communicator.subscriberView.frame = self.subscriberView.bounds;
        [self.subscriberView addSubview:self.communicator.subscriberView];
    }
}

- (void)endCallButtonPressed {
    [self.communicator disconnect];
}

@end
